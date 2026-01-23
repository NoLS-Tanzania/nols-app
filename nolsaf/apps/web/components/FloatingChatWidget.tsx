"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Globe, Minimize2, ThumbsUp, ThumbsDown } from "lucide-react";

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface FloatingChatWidgetProps {
  /** Hide the widget on specific routes */
  hiddenRoutes?: string[];
  /** Custom position */
  position?: "bottom-right" | "bottom-left";
}

export default function FloatingChatWidget({ hiddenRoutes = [], position = "bottom-right" }: FloatingChatWidgetProps) {
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
  const resetAutoCloseTimer = () => {
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
  };
  
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
  }, [isOpen]);

  // Track activity for auto-close
  useEffect(() => {
    if (isOpen) {
      resetAutoCloseTimer();
    }
  }, [input, messages.length]);
  
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

  // Initialize conversation when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0 && !isLoadingHistory) {
      initializeConversation();
    }
  }, [isOpen]);
  
  // Cleanup auto-clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoClearRef.current) {
        clearTimeout(autoClearRef.current);
      }
    };
  }, []);

  const initializeConversation = async () => {
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
            content: "Niaje! 👋 Naitwa Twiga 🦒, your friendly travel assistant at NoLSAF! Just like the giraffe (twiga) gracefully reaches for the highest leaves, I'm here to help you find the perfect accommodation! 🎯 How can I assist you today? 😊",
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
  };
  
  // Clear all chat messages from UI (but keep in database)
  const clearChat = () => {
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
    startAutoClearTimer();
  };
  
  // Start auto-clear timer (5 minutes = 300000ms)
  const startAutoClearTimer = () => {
    // Clear any existing timer
    if (autoClearRef.current) {
      clearTimeout(autoClearRef.current);
    }
    
    // Set new timer for 5 minutes
    autoClearRef.current = setTimeout(() => {
      clearChat();
    }, 5 * 60 * 1000); // 5 minutes
  };
  
  // Reset auto-clear timer (call when new message is sent)
  const resetAutoClearTimer = () => {
    chatStartTimeRef.current = Date.now();
    startAutoClearTimer();
  };

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

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingSoundIntervalRef.current) {
        clearInterval(typingSoundIntervalRef.current);
        typingSoundIntervalRef.current = null;
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
    
    // Default position
    if (position === "bottom-left") {
      return { bottom: "16px", left: "16px", right: "auto", top: "auto" };
    }
    return { bottom: "16px", right: "16px", left: "auto", top: "auto" };
  };

  const positionStyles = getPositionStyles();

  return (
    <div className="fixed z-50" style={positionStyles}>
      {/* Chat Card */}
      {isOpen && (
        <div
          ref={widgetRef}
          className={`bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${
            isMinimized ? "w-80 h-14" : "w-96 h-[450px]"
          } ${isDragging ? "cursor-move" : ""} ${
            isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
          style={{
            position: "fixed",
            ...positionStyles,
            transition: isClosing 
              ? "opacity 0.3s ease-out, transform 0.3s ease-out" 
              : "all 0.3s ease-in-out",
          }}
        >
          {/* Header - Draggable */}
          <div
            className="bg-[#02665e] text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move select-none touch-none flex-shrink-0"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => {
              if (isMinimized) {
                setIsMinimized(false);
                setUnreadCount(0); // Clear unread when expanding
              }
              resetAutoCloseTimer();
            }}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">Chat with Twiga</span>
              {isMinimized && unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center min-w-[20px] px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isMinimized && (
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="bg-white/20 text-white text-xs px-2 py-1 rounded border-white/30 focus:outline-none focus:ring-1 focus:ring-white/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="text-gray-900">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                  if (!isMinimized) {
                    // When minimizing, don't clear unread count yet
                  } else {
                    // When expanding, clear unread count
                    setUnreadCount(0);
                  }
                  resetAutoCloseTimer();
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors relative"
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0"
                onClick={resetAutoCloseTimer}
                onScroll={resetAutoCloseTimer}
              >
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-[#02665e] animate-spin" />
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-2 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#02665e] flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}

                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 ${
                            message.role === "user"
                              ? "bg-[#02665e] text-white"
                              : "bg-white text-gray-900 border border-gray-200"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.isTyping && message.displayedContent !== undefined
                              ? message.displayedContent + (message.displayedContent.length < message.content.length ? "▊" : "")
                              : message.content}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p
                              className={`text-xs ${
                                message.role === "user" ? "text-white/70" : "text-gray-500"
                              }`}
                            >
                              {(() => {
                                try {
                                  const date = typeof message.timestamp === "string" 
                                    ? new Date(message.timestamp) 
                                    : message.timestamp;
                                  
                                  // Check if date is valid
                                  if (isNaN(date.getTime())) {
                                    // If invalid, use current time
                                    return new Date().toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    });
                                  }
                                  
                                  // Format as HH:MM
                                  return date.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                } catch (e) {
                                  // Fallback to current time if any error
                                  return new Date().toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  });
                                }
                              })()}
                            </p>
                            {message.role === "assistant" && !message.isTyping && (
                              <div className="flex gap-1 ml-2">
                                <button
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((msg) =>
                                        msg.id === message.id
                                          ? { ...msg, reaction: msg.reaction === "like" ? null : "like" }
                                          : msg
                                      )
                                    );
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    message.reaction === "like"
                                      ? "bg-green-100 text-green-600"
                                      : "text-gray-400 hover:text-green-600 hover:bg-gray-100"
                                  }`}
                                  aria-label="Like this message"
                                >
                                  <ThumbsUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    setMessages((prev) =>
                                      prev.map((msg) =>
                                        msg.id === message.id
                                          ? { ...msg, reaction: msg.reaction === "dislike" ? null : "dislike" }
                                          : msg
                                      )
                                    );
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    message.reaction === "dislike"
                                      ? "bg-red-100 text-red-600"
                                      : "text-gray-400 hover:text-red-600 hover:bg-gray-100"
                                  }`}
                                  aria-label="Dislike this message"
                                >
                                  <ThumbsDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {message.role === "user" && (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isLoading && (
                      <div className="flex gap-2 justify-start">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#02665e] flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <Loader2 className="w-4 h-4 text-[#02665e] animate-spin" />
                        </div>
                      </div>
                    )}
                    
                    {isTyping && !isLoading && (
                      <div className="flex gap-2 justify-start">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#02665e] flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <div className="flex gap-1 items-center">
                            <span className="w-2 h-2 bg-[#02665e] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-2 h-2 bg-[#02665e] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-2 h-2 bg-[#02665e] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-3 bg-white rounded-b-lg flex-shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      resetAutoCloseTimer();
                    }}
                    onFocus={resetAutoCloseTimer}
                    onClick={resetAutoCloseTimer}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#024a44] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
            setIsClosing(false);
            // Load saved position or use default
            const saved = localStorage.getItem("chatbot_widget_position");
            if (saved) {
              try {
                const pos = JSON.parse(saved);
                setPositionState(pos);
              } catch {
                setPositionState({ x: 0, y: 0 });
              }
            } else {
              setPositionState({ x: 0, y: 0 });
            }
            if (messages.length === 0) {
              initializeConversation();
            }
            resetAutoCloseTimer();
          }}
          className={[
            "group",
            "relative",
            "rounded-full",
            "p-[2px]",
            "text-white",
            "shadow-[0_18px_60px_rgba(2,6,23,0.22)]",
            "ring-1 ring-white/20",
            "bg-gradient-to-br from-[#02b4f5]/95 via-[#02665e]/95 to-emerald-500/85",
            "transition-all duration-300",
            "hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(2,6,23,0.28)]",
            "active:translate-y-0 active:scale-[0.98]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#02b4f5]/55",
          ].join(" ")}
          aria-label="Open chat"
          style={{
            position: "fixed",
            ...(position === "bottom-left" 
              ? { bottom: "16px", left: "16px" }
              : { bottom: "16px", right: "16px" }),
          }}
        >
          <span
            className="pointer-events-none absolute -inset-3 rounded-full bg-[#02b4f5]/18 blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-85"
            aria-hidden
          />
          <span
            className="relative grid place-items-center rounded-full bg-[#02665e] p-4 ring-1 ring-white/25 shadow-[0_10px_30px_rgba(2,6,23,0.18)]"
            aria-hidden
          >
            <MessageCircle className="w-6 h-6" />
          </span>
        </button>
      )}
    </div>
  );
}

