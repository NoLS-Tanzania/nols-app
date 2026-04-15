"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Minimize2, ThumbsUp, ThumbsDown } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

interface Message {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date | string;
  isTyping?: boolean; // For typing animation
  displayedContent?: string; // For progressive display
  reaction?: "like" | "dislike" | null; // User reaction
}

type SupportedLanguage = "en" | "es" | "fr" | "pt" | "ar" | "zh";

const LANGUAGES: { code: SupportedLanguage; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

const API_BASE_URL = "";

interface FloatingChatWidgetProps {
  /** Hide the widget on specific routes */
  hiddenRoutes?: string[];
  /** Custom position */
  position?: "bottom-right" | "bottom-left";
  /** Extra bottom offset applied on mobile (< 768px) so FAB clears a mobile nav bar */
  mobileBottomOffset?: number;
}

export default function FloatingChatWidget({ hiddenRoutes: _hiddenRoutes = [], position = "bottom-right", mobileBottomOffset = 0 }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const typingSoundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [positionState, setPositionState] = useState(() => {
    // Load saved position from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("chatbot_widget_position");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { x: 0, y: 0 };
        }
      }
    }
    return { x: 0, y: 0 };
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  
  // Auto-close timer (30 seconds)
  const autoCloseRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // Auto-clear chat timer (5 minutes)
  const autoClearRef = useRef<NodeJS.Timeout | null>(null);
  const chatStartTimeRef = useRef<number>(Date.now());
  const startAutoClearTimerRef = useRef<(() => void) | null>(null);
  
  // Fade-out animation state
  const [isClosing, setIsClosing] = useState(false);
  
  // Unread messages count
  const [unreadCount, setUnreadCount] = useState(0);
  const lastReadMessageIdRef = useRef<string | number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Reset auto-close timer on any activity
  const resetAutoCloseTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
    }
    if (isOpen) {
      autoCloseRef.current = setTimeout(() => {
        // Trigger fade-out animation
        setIsClosing(true);
        setTimeout(() => {
          setIsOpen(false);
          setIsMinimized(false);
          setIsClosing(false);
        }, 300); // Match animation duration
      }, 30000); // 30 seconds
    }
  }, [isOpen]);
  
  // Save position to localStorage
  const savePosition = (pos: { x: number; y: number }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatbot_widget_position", JSON.stringify(pos));
    }
  };

  // Handle drag start (mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isOpen || !widgetRef.current) return;
    
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
    resetAutoCloseTimer();
  };
  
  // Handle drag start (touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isOpen || !widgetRef.current) return;
    
    const touch = e.touches[0];
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
    setIsDragging(true);
    resetAutoCloseTimer();
    e.preventDefault(); // Prevent scrolling while dragging
  };

  // Handle drag (mouse and touch)
  useEffect(() => {
    const updatePosition = (clientX: number, clientY: number) => {
      if (!isDragging || !isOpen) return;

      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;

      // Constrain to viewport
      const maxX = window.innerWidth - (isMinimized ? 320 : 384); // widget width
      const maxY = window.innerHeight - (isMinimized ? 56 : 450); // widget height

      const newPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      };
      
      setPositionState(newPosition);
      savePosition(newPosition); // Persist position
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault(); // Prevent scrolling
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      document.body.style.userSelect = "none"; // Prevent text selection while dragging
      document.body.style.touchAction = "none"; // Prevent touch actions while dragging
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
    };
  }, [isDragging, dragOffset, isOpen, isMinimized]);

  // Auto-close timer effect
  useEffect(() => {
    if (isOpen) {
      resetAutoCloseTimer();
    } else {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
      }
    }

    return () => {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
      }
    };
  }, [isOpen, resetAutoCloseTimer]);

  // Track activity for auto-close
  useEffect(() => {
    if (isOpen) {
      resetAutoCloseTimer();
    }
  }, [input, messages.length, isOpen, resetAutoCloseTimer]);
  
  // Track unread messages when minimized
  useEffect(() => {
    if (messages.length === 0) {
      lastReadMessageIdRef.current = null;
      setUnreadCount(0);
      return;
    }
    
    const lastMessage = messages[messages.length - 1];
    
    if (isMinimized) {
      // When minimized, count new assistant messages
      if (lastMessage.role === "assistant") {
        // Check if this is a new message we haven't seen
        if (lastReadMessageIdRef.current === null || lastMessage.id !== lastReadMessageIdRef.current) {
          setUnreadCount((prev) => {
            // Only increment if we're tracking a new message
            const isNewMessage = lastReadMessageIdRef.current === null || 
              lastMessage.id !== lastReadMessageIdRef.current;
            return isNewMessage ? prev + 1 : prev;
          });
          lastReadMessageIdRef.current = lastMessage.id;
        }
      }
    } else {
      // When expanded, mark all messages as read
      lastReadMessageIdRef.current = lastMessage.id;
      setUnreadCount(0);
    }
  }, [messages, isMinimized]);
  
  // Cleanup auto-clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoClearRef.current) {
        clearTimeout(autoClearRef.current);
      }
    };
  }, []);
  
  // Clear all chat messages from UI (but keep in database)
  const clearChat = useCallback(() => {
    setMessages([]);
    setUnreadCount(0);
    lastReadMessageIdRef.current = null;
    
    // Show welcome message after clearing
    const welcomeMessage: Message = {
      id: "welcome",
      role: "assistant",
      content: "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! Just like the giraffe (twiga) gracefully reaches for the highest leaves, I'm here to help you find the perfect accommodation! 🎯 How can I assist you today? 😊",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    
    // Keep the same session ID - messages are still in database
    // Don't clear session ID from localStorage
    
    // Reset chat start time
    chatStartTimeRef.current = Date.now();
    
    // Restart auto-clear timer
    startAutoClearTimerRef.current?.();
  }, []);
  
  // Start auto-clear timer (5 minutes = 300000ms)
  const startAutoClearTimer = useCallback(() => {
    // Clear any existing timer
    if (autoClearRef.current) {
      clearTimeout(autoClearRef.current);
    }
    
    // Set new timer for 5 minutes
    autoClearRef.current = setTimeout(() => {
      clearChat();
    }, 5 * 60 * 1000); // 5 minutes
  }, [clearChat]);

  useEffect(() => {
    startAutoClearTimerRef.current = startAutoClearTimer;
  }, [startAutoClearTimer]);
  
  // Reset auto-clear timer (call when new message is sent)
  const resetAutoClearTimer = useCallback(() => {
    chatStartTimeRef.current = Date.now();
    startAutoClearTimer();
  }, [startAutoClearTimer]);

  const initializeConversation = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      let currentSessionId = localStorage.getItem("chatbot_session_id");
      const savedLanguage = (localStorage.getItem("chatbot_language") as SupportedLanguage) || "en";
      setLanguage(savedLanguage);

      if (!currentSessionId) {
        currentSessionId = `temp_${Date.now()}`;
      }

      // Load conversation history from database
      const response = await fetch(`${API_BASE_URL}/api/chatbot/conversations/${currentSessionId}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        if (data.messages && data.messages.length > 0) {
          // Load existing messages from database
          setMessages(
            data.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
          );
          setSessionId(data.conversation.sessionId);
          if (data.conversation.language) {
            setLanguage(data.conversation.language as SupportedLanguage);
          }
        } else {
          // No previous messages, show welcome message
          const welcomeMessage: Message = {
            id: "welcome",
            role: "assistant",
            content:
              "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! Just like the giraffe (twiga) gracefully reaches for the highest leaves, I'm here to help you find the perfect accommodation! 🎯 How can I assist you today? 😊",
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
        if (data.conversation?.sessionId) {
          setSessionId(data.conversation.sessionId);
          localStorage.setItem("chatbot_session_id", data.conversation.sessionId);
        }
      } else {
        // Start fresh if loading fails
        const welcomeMessage: Message = {
          id: "welcome",
          role: "assistant",
          content: "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! How can I assist you today? 😊",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        const newSessionId = `temp_${Date.now()}`;
        setSessionId(newSessionId);
        localStorage.setItem("chatbot_session_id", newSessionId);
      }

      // Reset chat start time
      chatStartTimeRef.current = Date.now();

      // Start auto-clear timer (5 minutes) - clears UI but keeps in database
      startAutoClearTimer();
    } catch (error) {
      console.error("Failed to load conversation:", error);
      const welcomeMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! How can I assist you today? 😊",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      const newSessionId = `temp_${Date.now()}`;
      setSessionId(newSessionId);
      localStorage.setItem("chatbot_session_id", newSessionId);
      chatStartTimeRef.current = Date.now();
      startAutoClearTimer();
    } finally {
      setIsLoadingHistory(false);
    }
  }, [startAutoClearTimer]);

  // Initialize conversation when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoadingHistory) {
      void initializeConversation();
    }
  }, [isOpen, isLoadingHistory, messages.length, initializeConversation]);

  // Handle inactivity timeout (60 seconds)
  useEffect(() => {
    if (!isOpen || isMinimized || isLoadingHistory || messages.length <= 1) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (sessionId) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/chatbot/message`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              message: "timeout",
              language,
              sessionId,
            }),
          });
          const data = await response.json();
          if (data.success && data.messages) {
            const timeoutMsg = data.messages.find((m: any) => m.role === "assistant");
            if (timeoutMsg) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  role: "assistant",
                  content: timeoutMsg.content,
                  timestamp: new Date(timeoutMsg.timestamp),
                },
              ]);
            }
          }
        } catch (error) {
          console.error("Failed to send timeout message:", error);
        }
      }
    }, 60000);

    const timeoutId = timeoutRef.current;
    const typingTimeoutId = typingTimeoutRef.current;
    const typingSoundIntervalId = typingSoundIntervalRef.current;

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (typingTimeoutId) clearTimeout(typingTimeoutId);
      if (typingSoundIntervalId) {
        clearInterval(typingSoundIntervalId);
        if (typingSoundIntervalRef.current === typingSoundIntervalId) {
          typingSoundIntervalRef.current = null;
        }
      }
    };
  }, [messages.length, sessionId, language, isOpen, isMinimized, isLoadingHistory]);
  
  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (typingSoundIntervalRef.current) {
        clearInterval(typingSoundIntervalRef.current);
      }
    };
  }, []);

  const handleLanguageChange = async (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem("chatbot_language", newLanguage);

    if (sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/chatbot/set-language`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            language: newLanguage,
            sessionId,
          }),
        });
      } catch (error) {
        console.error("Failed to update language:", error);
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    resetAutoCloseTimer(); // Reset timer on send

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input.trim();
    setInput("");
    setIsLoading(true);
    
    // Reset auto-clear timer when sending a message
    resetAutoClearTimer();

    try {
      // Send sessionId to save messages to database
      // Only include sessionId if it's not null (Zod validation expects string or undefined)
      const requestBody: { message: string; language: SupportedLanguage; sessionId?: string } = {
        message: userInput,
        language,
      };
      if (sessionId) {
        requestBody.sessionId = sessionId;
      }

      const response = await fetch(`${API_BASE_URL}/api/chatbot/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("chatbot_session_id", data.sessionId);
        }

        // Find the assistant message
        const assistantMsg = data.messages.find((msg: any) => msg.role === "assistant");
        if (assistantMsg) {
          // Show typing indicator first
          setIsTyping(true);
          
          // Clear any existing typing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Don't add user message again - it was already added immediately above
          // The backend response includes it, but we skip it to avoid duplicates
          
          // Show typing indicator briefly, then start typing animation (total 3 seconds)
          setIsTyping(true);
          
          // Initialize audio context for typing sounds
          if (!audioContextRef.current && typeof window !== "undefined" && window.AudioContext) {
            try {
              audioContextRef.current = new AudioContext();
            } catch (e) {
              console.log("Audio context not available");
            }
          }
          
          // Function to play typing sound
          const playTypingSound = () => {
            if (!audioContextRef.current) return;
            
            try {
              const oscillator = audioContextRef.current.createOscillator();
              const gainNode = audioContextRef.current.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContextRef.current.destination);
              
              oscillator.frequency.value = 800; // Higher pitch for typing
              oscillator.type = "sine";
              
              gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.05);
              
              oscillator.start(audioContextRef.current.currentTime);
              oscillator.stop(audioContextRef.current.currentTime + 0.05);
            } catch (e) {
              // Silently fail if audio can't play
            }
          };
          
          // Add assistant message immediately with typing animation
          const fullContent = assistantMsg.content;
          const typingMessage: Message = {
            id: assistantMsg.id,
            role: "assistant",
            content: fullContent,
            timestamp: new Date(assistantMsg.timestamp),
            isTyping: true,
            displayedContent: "",
          };
          
          setMessages((prev) => [...prev, typingMessage]);
          
          // Calculate typing speed to complete in exactly 3 seconds
          const totalDuration = 3000; // 3 seconds total
          const totalCharacters = fullContent.length;
          const intervalTime = Math.max(10, Math.floor(totalDuration / totalCharacters)); // Minimum 10ms per update
          const charsPerUpdate = Math.max(1, Math.ceil(totalCharacters / (totalDuration / intervalTime)));
          
          // Play typing sound periodically (every 3-4 characters)
          let soundCounter = 0;
          const soundInterval = setInterval(() => {
            if (soundCounter < totalCharacters) {
              playTypingSound();
              soundCounter += charsPerUpdate * 3; // Play sound every ~3 character updates
            }
          }, intervalTime * 3);
          typingSoundIntervalRef.current = soundInterval;
          
          // Start typing animation immediately
          let currentIndex = 0;
          const typingInterval = setInterval(() => {
            currentIndex += charsPerUpdate;
            
            if (currentIndex >= fullContent.length) {
              clearInterval(typingInterval);
              if (typingSoundIntervalRef.current) {
                clearInterval(typingSoundIntervalRef.current);
                typingSoundIntervalRef.current = null;
              }
              setIsTyping(false);
              // Update message to show full content without typing
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsg.id
                    ? { ...msg, isTyping: false, displayedContent: undefined }
                    : msg
                )
              );
            } else {
              // Update displayed content
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsg.id
                    ? { ...msg, displayedContent: fullContent.slice(0, currentIndex) }
                    : msg
                )
              );
            }
          }, intervalTime);
        } else {
          // Fallback: add messages normally if no assistant message
          const newMessages = data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages((prev) => [...prev, ...newMessages]);
        }
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: "I'm sorry, I encountered an error. Please try again. 😔",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate position styles
  const getPositionStyles = () => {
    if (isOpen && (positionState.x !== 0 || positionState.y !== 0)) {
      return {
        left: `${positionState.x}px`,
        top: `${positionState.y}px`,
        bottom: "auto",
        right: "auto",
      };
    }
    if (position === "bottom-left") {
      return { bottom: "20px", left: "20px", right: "auto", top: "auto" };
    }
    return { bottom: "20px", right: "20px", left: "auto", top: "auto" };
  };

  const positionStyles = getPositionStyles();

  const formatTime = (ts: Date | string) => {
    try {
      const d = typeof ts === "string" ? new Date(ts) : ts;
      if (isNaN(d.getTime())) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  };

  return (
    <div className="fixed z-50">
      {mobileBottomOffset > 0 && (
        <style>{`@media (max-width: 767px) { .nolsaf-chat-fab { bottom: ${20 + mobileBottomOffset}px !important; } }`}</style>
      )}
      {/* ── Chat Panel ── */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 transition-[opacity,transform] duration-300 ${
            isMinimized ? "w-72" : "w-[340px] sm:w-[370px]"
          } ${isDragging ? "cursor-move" : ""} ${
            isClosing ? "opacity-0 scale-95 translate-y-2" : "opacity-100 scale-100 translate-y-0"
          }`}
          style={{
            position: "fixed",
            ...positionStyles,
            height: isMinimized ? "56px" : "520px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(10, 25, 41, 0.25)",
          }}
        >
          {/* ── Header ── */}
          <div
            className="relative flex-shrink-0 flex items-center justify-between px-4 py-3.5 cursor-move select-none touch-none overflow-hidden"
            style={{ 
              background: "linear-gradient(135deg, #0a1929 0%, #0d3b52 45%, #0e7490 100%)",
              borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={() => {
              if (isMinimized) { setIsMinimized(false); setUnreadCount(0); }
              resetAutoCloseTimer();
            }}
          >
            {/* Decorative subtle glow overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-30"
              style={{ background: "radial-gradient(ellipse at top right, rgba(6, 182, 212, 0.15), transparent 50%)" }} />

            {/* Left — avatar + name */}
            <div className="relative flex items-center gap-3 z-10">
              {/* Twiga avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="h-11 w-11 rounded-2xl flex items-center justify-center text-2xl shadow-xl backdrop-blur-sm transition-transform hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(52, 211, 153, 0.12))",
                    border: "1.5px solid rgba(255, 255, 255, 0.15)",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1)",
                  }}
                >
                  🦒
                </div>
                {/* Online indicator - refined */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-lg ring-2 ring-[#0a1929]" />
                </span>
              </div>

              {/* Name + subtitle */}
              <div className="flex flex-col leading-tight gap-1">
                <span
                  className="text-[16px] font-bold tracking-tight text-white"
                  style={{ 
                    textShadow: "0 2px 12px rgba(0, 0, 0, 0.4)",
                    fontFamily: "system-ui, -apple-system, sans-serif"
                  }}
                >
                  Twiga
                </span>
                <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-white/65 tracking-wide uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90 flex-shrink-0 shadow-sm" />
                  AI Travel Assistant
                </span>
              </div>

              {isMinimized && unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1.5 text-[10px] font-bold text-white shadow-lg ring-2 ring-white/20 animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            {/* Right — controls */}
            <div className="relative flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
              {!isMinimized && (
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="text-white text-[11px] font-medium px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all cursor-pointer hover:bg-white/15"
                  style={{ 
                    background: "rgba(255, 255, 255, 0.1)", 
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(8px)"
                  }}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="text-gray-900 bg-white font-normal">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  setIsMinimized(!isMinimized);
                  if (isMinimized) setUnreadCount(0);
                  resetAutoCloseTimer();
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/80 transition-all hover:bg-white/15 hover:text-white hover:scale-105 active:scale-95"
                style={{ 
                  background: "rgba(255, 255, 255, 0.08)", 
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(4px)"
                }}
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white/80 transition-all hover:bg-rose-500/20 hover:text-white hover:scale-105 active:scale-95"
                style={{ 
                  background: "rgba(255, 255, 255, 0.08)", 
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(4px)"
                }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Messages ── */}
          {!isMinimized && (
            <>
              <div
                className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-4"
                style={{ background: "linear-gradient(180deg,#f1f5f9 0%,#f8fafc 100%)" }}
                onClick={resetAutoCloseTimer}
                onScroll={resetAutoCloseTimer}
              >
                {isLoadingHistory ? (
                  <div className="flex h-full items-center justify-center">
                    <LogoSpinner size="sm" ariaLabel="Loading" />
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {/* Bot avatar */}
                        {message.role === "assistant" && (
                          <div
                            className="flex-shrink-0 h-7 w-7 rounded-xl flex items-center justify-center text-sm shadow-sm mb-0.5"
                            style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                          >
                            🦒
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                            message.role === "user"
                              ? "rounded-br-sm text-white"
                              : "rounded-bl-sm bg-white border border-slate-100 text-slate-800"
                          }`}
                          style={
                            message.role === "user"
                              ? { background: "linear-gradient(135deg,#0a5c82,#02665e)" }
                              : undefined
                          }
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.isTyping && message.displayedContent !== undefined
                              ? message.displayedContent + (message.displayedContent.length < message.content.length ? "▊" : "")
                              : message.content}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 gap-2">
                            <span className={`text-[10px] font-medium ${message.role === "user" ? "text-white/55" : "text-slate-400"}`}>
                              {formatTime(message.timestamp)}
                            </span>
                            {message.role === "assistant" && !message.isTyping && (
                              <div className="flex gap-0.5">
                                <button
                                  onClick={() =>
                                    setMessages((prev) =>
                                      prev.map((m) => m.id === message.id ? { ...m, reaction: m.reaction === "like" ? null : "like" } : m)
                                    )
                                  }
                                  className={`h-5 w-5 rounded-md flex items-center justify-center transition-all ${
                                    message.reaction === "like"
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "text-slate-300 hover:text-emerald-500 hover:bg-emerald-50"
                                  }`}
                                  aria-label="Like"
                                >
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setMessages((prev) =>
                                      prev.map((m) => m.id === message.id ? { ...m, reaction: m.reaction === "dislike" ? null : "dislike" } : m)
                                    )
                                  }
                                  className={`h-5 w-5 rounded-md flex items-center justify-center transition-all ${
                                    message.reaction === "dislike"
                                      ? "bg-rose-50 text-rose-600"
                                      : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                                  }`}
                                  aria-label="Dislike"
                                >
                                  <ThumbsDown className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* User avatar */}
                        {message.role === "user" && (
                          <div
                            className="flex-shrink-0 h-7 w-7 rounded-xl flex items-center justify-center mb-0.5 shadow-sm"
                            style={{ background: "linear-gradient(135deg,#334155,#475569)" }}
                          >
                            <User className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Fetching indicator */}
                    {isLoading && (
                      <div className="flex items-end gap-2 justify-start">
                        <div
                          className="flex-shrink-0 h-7 w-7 rounded-xl flex items-center justify-center text-sm shadow-sm"
                          style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                        >
                          🦒
                        </div>
                        <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-100 px-4 py-3 shadow-sm">
                          <LogoSpinner size="xs" ariaLabel="Loading" />
                        </div>
                      </div>
                    )}

                    {/* Typing animation dots */}
                    {isTyping && !isLoading && (
                      <div className="flex items-end gap-2 justify-start">
                        <div
                          className="flex-shrink-0 h-7 w-7 rounded-xl flex items-center justify-center text-sm shadow-sm"
                          style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                        >
                          🦒
                        </div>
                        <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-100 px-4 py-3 shadow-sm">
                          <div className="flex gap-1.5 items-center">
                            {[0, 150, 300].map((delay) => (
                              <span
                                key={delay}
                                className="w-2 h-2 rounded-full animate-bounce"
                                style={{ animationDelay: `${delay}ms`, background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* ── Input Area ── */}
              <div
                className="flex-shrink-0 px-3 py-3 border-t border-slate-100"
                style={{ background: "#ffffff" }}
              >
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); resetAutoCloseTimer(); }}
                    onFocus={resetAutoCloseTimer}
                    onClick={resetAutoCloseTimer}
                    placeholder="Type your message…"
                    disabled={isLoading}
                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/20 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}
                  >
                    {isLoading ? (
                      <LogoSpinner size="xs" ariaLabel="Sending" className="text-white/90" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
                <p className="text-center text-[10px] text-slate-300 mt-2 tracking-wide">
                  Powered by NoLSAF AI · Twiga 🦒
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FAB Button ── */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setIsClosing(false);
            const saved = localStorage.getItem("chatbot_widget_position");
            if (saved) {
              try { setPositionState(JSON.parse(saved)); }
              catch { setPositionState({ x: 0, y: 0 }); }
            } else {
              setPositionState({ x: 0, y: 0 });
            }
            if (messages.length === 0) initializeConversation();
            resetAutoCloseTimer();
          }}
          aria-label="Open chat with Twiga"
          className="nolsaf-chat-fab group relative rounded-full bg-transparent p-0 border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-400/60"
          style={{
            position: "fixed",
            ...(position === "bottom-left" ? { bottom: "20px", left: "20px" } : { bottom: "20px", right: "20px" }),
          }}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: "linear-gradient(135deg, #0e7490, #0d3b52)" }} />
          {/* Outer glow */}
          <span className="pointer-events-none absolute -inset-3 rounded-full blur-xl opacity-40 transition-opacity duration-300 group-hover:opacity-60"
            style={{ background: "radial-gradient(circle, #0e7490, #0d3b52, transparent 70%)" }} />
          {/* Inner button */}
          <span
            className="relative flex h-[54px] w-[54px] items-center justify-center rounded-full text-white shadow-[0_12px_40px_rgba(10,25,41,0.4)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_16px_56px_rgba(14,116,144,0.5)] group-active:scale-95"
            style={{ background: "linear-gradient(135deg, #0a1929 0%, #0d3b52 50%, #0e7490 100%)" }}
          >
            <MessageCircle className="w-6 h-6" />
          </span>
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 z-10 h-5 min-w-[20px] rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1 text-[10px] font-bold text-white flex items-center justify-center shadow-lg ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

