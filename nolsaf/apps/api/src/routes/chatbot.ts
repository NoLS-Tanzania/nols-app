import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getAutomatedResponse, getTimeoutMessage } from "../lib/automatedResponses";
import { limitChatbotMessages, limitChatbotConversations, limitChatbotLanguageChange } from "../middleware/rateLimit";
import { z } from "zod";
import crypto from "crypto";

const router = Router();

// Supported languages
const SUPPORTED_LANGUAGES = ["en", "es", "fr", "pt", "ar", "zh"] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Validation schemas using Zod
const messageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message is too long (maximum 5000 characters)")
    .refine((msg) => msg.trim().length > 0, "Message cannot be only whitespace"),
  language: z.enum(["en", "es", "fr", "pt", "ar", "zh"]).optional().default("en"),
  sessionId: z.string().max(100).optional(),
});

const setLanguageSchema = z.object({
  language: z.enum(["en", "es", "fr", "pt", "ar", "zh"]),
  sessionId: z.string().max(100).optional(),
});

const sessionIdSchema = z.object({
  sessionId: z.string().min(1).max(100),
});

// Generate or get session ID
function getSessionId(req: Request): string {
  // Check if user is authenticated
  const authedReq = req as AuthedRequest;
  if (authedReq.user?.id) {
    return `user_${authedReq.user.id}`;
  }

  // For anonymous users, use or create session ID from cookie
  let sessionId = req.cookies?.chatbot_session_id;
  if (!sessionId) {
    sessionId = `anon_${crypto.randomUUID()}`;
  }
  return sessionId;
}

// Get or create conversation
async function getOrCreateConversation(
  sessionId: string,
  userId: number | null,
  language: SupportedLanguage
) {
  // @ts-ignore - Prisma Client needs regeneration after schema changes
  const conversation = await prisma.chatbotConversation.upsert({
    where: { sessionId },
    update: { language, updatedAt: new Date() },
    create: {
      sessionId,
      userId,
      language,
    },
  });
  return conversation;
}

// Helper function to notify admins via socket.io and create notification
async function notifyAdminsOfFollowUp(conversationId: number, req: Request) {
  try {
    // Get socket.io instance from app
    const io = (req as any).app?.get?.("io") || (global as any).io;
    
    // Emit socket event for real-time updates to admin room
    if (io && typeof io.to === "function") {
      io.to("admin").emit("chatbot:follow-up-needed", {
        conversationId,
        timestamp: new Date().toISOString(),
        type: "chatbot_followup",
      });
    }

    // Create notification in database for admin dashboard (no userId/ownerId = visible to all admins)
    try {
      await prisma.notification.create({
        data: {
          userId: null,
          ownerId: null,
          title: "New Chatbot Conversation Needs Follow-up",
          body: `A chatbot conversation requires human assistance. Conversation ID: ${conversationId}. Please review and follow up.`,
          unread: true,
          meta: {
            type: "chatbot_followup",
            conversationId,
            source: "chatbot",
          },
          type: "chatbot",
        },
      });
    } catch (notifError: any) {
      // Don't fail the request if notification creation fails
      console.warn("Failed to create follow-up notification:", notifError);
    }
  } catch (error: any) {
    // Don't fail the request if notification fails
    console.warn("Failed to notify admins of follow-up:", error);
  }
}

// POST /api/chatbot/message - Send a message to the chatbot
router.post("/message", limitChatbotMessages, async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const validationResult = messageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { message, language, sessionId: providedSessionId } = validationResult.data;

    // Validate language
    const lang = SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
      ? (language as SupportedLanguage)
      : "en";

    // Get user from auth if available
    const authedReq = req as AuthedRequest;
    const userId = authedReq.user?.id || null;

    // Get or generate session ID
    const sessionId = providedSessionId || getSessionId(req);

    // Get or create conversation
    const conversation = await getOrCreateConversation(sessionId, userId, lang);

    // Save user message to database
    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const userMessage = await prisma.chatbotMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message.trim(),
        language: lang,
      },
    });

    // Get automated response (supports language parameter)
    const response = getAutomatedResponse(message.trim(), lang);

    // Save assistant message to database
    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const assistantMessage = await prisma.chatbotMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: response,
        language: lang,
      },
    });

    // Check if user needs follow-up based on keywords that indicate they need human assistance
    // Enhanced keyword detection for better follow-up detection
    const needsHelpKeywords = /(help|support|contact|speak|talk|agent|human|person|assistant|problem|issue|error|can't|cannot|unable|stuck|confused|don't understand|don't know|not working|doesn't work|broken|faulty|urgent|emergency|need assistance|need help|escalate|supervisor|manager)/i;
    const userNeedsHelp = needsHelpKeywords.test(message.trim());
    
    // Mark conversation for follow-up if user seems to need help
    if (userNeedsHelp && !conversation.needsFollowUp) {
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      const updatedConversation = await prisma.chatbotConversation.update({
        where: { id: conversation.id },
        data: { 
          needsFollowUp: true,
          updatedAt: new Date(),
        },
      });

      // Notify admins via socket.io and create notification
      await notifyAdminsOfFollowUp(conversation.id, req);
    }

    // Set session cookie for anonymous users to maintain session
    if (!userId && !req.cookies?.chatbot_session_id) {
      res.cookie("chatbot_session_id", sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        sameSite: "lax",
      });
    }

    return res.json({
      success: true,
      sessionId,
      messages: [
        {
          id: userMessage.id,
          role: "user",
          content: userMessage.content,
          timestamp: userMessage.createdAt.toISOString(),
        },
        {
          id: assistantMessage.id,
          role: "assistant",
          content: assistantMessage.content,
          timestamp: assistantMessage.createdAt.toISOString(),
        },
      ],
    });
  } catch (error: any) {
    console.error("Chatbot message error:", error);
    return res.status(500).json({ error: "Failed to process message" });
  }
});

// GET /api/chatbot/conversations/:sessionId - Get conversation history
router.get("/conversations/:sessionId", limitChatbotConversations, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const authedReq = req as AuthedRequest;
    const userId = authedReq.user?.id || null;

    // Verify session belongs to user if authenticated
    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const conversation = await prisma.chatbotConversation.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.json({ success: true, messages: [] });
    }

    // Check authorization
    if (userId && conversation.userId && conversation.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        language: conversation.language,
        createdAt: conversation.createdAt,
      },
      messages: conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get conversation error:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// GET /api/chatbot/conversations - Get all conversations for authenticated user
router.get("/conversations", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const authedReq = req as AuthedRequest;
    const userId = authedReq.user!.id;

    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const conversations = await prisma.chatbotConversation.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get last message for preview
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50, // Limit to recent 50 conversations
    });

    return res.json({
      success: true,
      conversations: conversations.map((conv: any) => ({
        id: conv.id,
        sessionId: conv.sessionId,
        language: conv.language,
        lastMessage: conv.messages[0]?.content || null,
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get conversations error:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// POST /api/chatbot/set-language - Update conversation language
router.post("/set-language", limitChatbotLanguageChange, async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const validationResult = setLanguageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }

    const { language, sessionId: providedSessionId } = validationResult.data;

    // Validate language
    const lang = SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
      ? (language as SupportedLanguage)
      : "en";

    const authedReq = req as AuthedRequest;
    const userId = authedReq.user?.id || null;
    const sessionId = providedSessionId || getSessionId(req);

    const conversation = await getOrCreateConversation(sessionId, userId, lang);

    return res.json({
      success: true,
      sessionId: conversation.sessionId,
      language: conversation.language,
    });
  } catch (error: any) {
    console.error("Set language error:", error);
    return res.status(500).json({ error: "Failed to set language" });
  }
});

export default router;

