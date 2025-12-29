import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth";

const router = Router();

// All routes require admin authentication
router.use(requireAuth as any, requireRole("ADMIN") as any);

// GET /api/admin/chatbot/follow-up-count - Get count of conversations needing follow-up (for polling/notifications)
router.get("/follow-up-count", async (req: Request, res: Response) => {
  try {
    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const count = await prisma.chatbotConversation.count({
      where: { needsFollowUp: true },
    });
    return res.json({ success: true, count });
  } catch (error: any) {
    console.error("Get follow-up count error:", error);
    return res.status(500).json({ error: "Failed to fetch follow-up count" });
  }
});

// GET /api/admin/chatbot/stats - Get analytics and statistics
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const { days = "7" } = req.query;
    const daysNum = parseInt(days as string, 10) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);
    startDate.setHours(0, 0, 0, 0); // Start of day

    // Get basic counts
    const [
      totalConversations,
      needsFollowUpCount,
      followedUpCount,
      recentConversations,
    ] = await Promise.all([
      // Total conversations
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      prisma.chatbotConversation.count(),
      // Needs follow-up
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      prisma.chatbotConversation.count({ where: { needsFollowUp: true } }),
      // Followed up
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      prisma.chatbotConversation.count({ where: { needsFollowUp: false, followedUpAt: { not: null } } }),
      // Recent conversations (last 24 hours)
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      prisma.chatbotConversation.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    // Get conversations by day with error handling
    let conversationsByDay: Array<{ date: string; count: number }> = [];
    try {
      const conversationsByDayRaw = await prisma.$queryRaw<any>`
        SELECT DATE(createdAt) as date, COUNT(*) as count
        FROM chatbot_conversations
        WHERE createdAt >= ${startDate}
        GROUP BY DATE(createdAt)
        ORDER BY date ASC
      `;

      conversationsByDay = (conversationsByDayRaw || []).map((row: any) => {
        let dateStr = row.date;
        // Handle different date formats from MySQL
        if (dateStr instanceof Date) {
          dateStr = dateStr.toISOString().split('T')[0];
        } else if (typeof dateStr === 'string') {
          // MySQL DATE() returns YYYY-MM-DD format, use as-is
          dateStr = dateStr.split('T')[0];
        } else if (dateStr) {
          dateStr = String(dateStr).split('T')[0];
        }
        return {
          date: dateStr || '',
          count: Number(row.count) || 0,
        };
      });
    } catch (err: any) {
      console.error("Error fetching conversations by day:", err);
      // Continue with empty array
    }

    // Get top languages with error handling
    let topLanguages: Array<{ language: string; count: number }> = [];
    try {
      const topLanguagesRaw = await prisma.$queryRaw<any>`
        SELECT language, COUNT(*) as count
        FROM chatbot_conversations
        WHERE createdAt >= ${startDate}
        GROUP BY language
        ORDER BY count DESC
        LIMIT 5
      `;

      topLanguages = (topLanguagesRaw || []).map((row: any) => ({
        language: String(row.language || ''),
        count: Number(row.count) || 0,
      }));
    } catch (err: any) {
      console.error("Error fetching top languages:", err);
      // Continue with empty array
    }

    return res.json({
      success: true,
      stats: {
        total: totalConversations,
        needsFollowUp: needsFollowUpCount,
        followedUp: followedUpCount,
        recent: recentConversations,
        conversationsByDay,
        topLanguages,
      },
    });
  } catch (error: any) {
    console.error("Get chatbot stats error:", error);
    console.error("Error stack:", error?.stack);
    return res.status(500).json({ 
      error: "Failed to fetch stats", 
      message: error?.message || "Unknown error" 
    });
  }
});

// GET /api/admin/chatbot/conversations - Get all conversations that need follow-up
router.get("/conversations", async (req: Request, res: Response) => {
  try {
    const { needsFollowUp, page = 1, pageSize = 20, sortBy = "updatedAt", sortOrder = "desc" } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const where: any = {};
    if (needsFollowUp === "true") {
      where.needsFollowUp = true;
    } else if (needsFollowUp === "false") {
      where.needsFollowUp = false;
    }

    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const [conversations, total] = await Promise.all([
      // @ts-ignore - Prisma Client needs regeneration after schema changes
      prisma.chatbotConversation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1, // Get last message for preview
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { [sortBy as string]: sortOrder as "asc" | "desc" },
        skip,
        take,
      }),
      // @ts-ignore
      prisma.chatbotConversation.count({ where }),
    ]);

    return res.json({
      success: true,
      conversations: conversations.map((conv: any) => ({
        id: conv.id,
        sessionId: conv.sessionId,
        userId: conv.userId,
        userName: conv.user?.name || null,
        userEmail: conv.user?.email || null,
        userPhone: conv.user?.phone || null,
        language: conv.language,
        needsFollowUp: conv.needsFollowUp,
        followUpNotes: conv.followUpNotes,
        followedUpAt: conv.followedUpAt,
        followedUpBy: conv.followedUpBy,
        lastMessage: conv.messages[0]?.content || null,
        lastMessageTime: conv.messages[0]?.createdAt || null,
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (error: any) {
    console.error("Get chatbot conversations error:", error);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET /api/admin/chatbot/conversations/:id - Get full conversation details
router.get("/conversations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const conversation = await prisma.chatbotConversation.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        userId: conversation.userId,
        userName: conversation.user?.name || null,
        userEmail: conversation.user?.email || null,
        userPhone: conversation.user?.phone || null,
        language: conversation.language,
        needsFollowUp: conversation.needsFollowUp,
        followUpNotes: conversation.followUpNotes,
        followedUpAt: conversation.followedUpAt,
        followedUpBy: conversation.followedUpBy,
        messages: conversation.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt,
        })),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get conversation error:", error);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// POST /api/admin/chatbot/conversations/:id/follow-up - Mark conversation as followed up
router.post("/conversations/:id/follow-up", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const authedReq = req as AuthedRequest;
    const adminId = authedReq.user!.id;

    // @ts-ignore - Prisma Client needs regeneration after schema changes
    const conversation = await prisma.chatbotConversation.update({
      where: { id: Number(id) },
      data: {
        needsFollowUp: false,
        followUpNotes: notes || null,
        followedUpAt: new Date(),
        followedUpBy: adminId,
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      conversation: {
        id: conversation.id,
        needsFollowUp: conversation.needsFollowUp,
        followUpNotes: conversation.followUpNotes,
        followedUpAt: conversation.followedUpAt,
        followedUpBy: conversation.followedUpBy,
      },
    });
  } catch (error: any) {
    console.error("Mark follow-up error:", error);
    return res.status(500).json({ error: "Failed to mark follow-up" });
  }
});

export default router;

