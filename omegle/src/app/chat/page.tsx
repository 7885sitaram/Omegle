"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FeedbackModal from "@/Components/Reputation/FeedbackModal";
import WarningModal from "@/Components/Reputation/WarningModal";
import { toast } from "sonner";

const socket = io(process.env.NEXT_PUBLIC_URL!, {
  transports: ["websocket"],
});

interface Message {
  text: string;
  sender: "me" | "stranger" | "system";
}

export default function ChatPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [status, setStatus] = useState("ideal");
  const [roomId, setRoomId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [warnings, setWarnings] = useState(0);
  const [lastScore, setLastScore] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [partnerId, setPartnerId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [reputationInfo, setReputationInfo] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  
  // Double-Lock Connection State
  const [localReady, setLocalReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);

  const warningsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
    if (sessionStatus === "unauthenticated" && !userId) {
      router.replace("/");
    }
  }, [sessionStatus, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchUserInterests = async () => {
      if (typeof window === "undefined") return;
      const userId = window.localStorage.getItem("userId");
      if (!userId) return;
      setCurrentUserId(userId);

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(`${apiBase}/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUserInterests(data.user?.interests || []);
          setDisplayName(data.user?.displayName || "Stranger");
        }
      } catch (err) {
        console.error("Failed to fetch user interests", err);
      }
    };
    fetchUserInterests();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Synchronize when BOTH users are ready
  useEffect(() => {
    if (localReady && partnerReady && status !== "chatting") {
      setStatus("chatting");
      setMessages([{ text: "You are now chatting with a random stranger. Say hi!", sender: "system" }]);
    }
  }, [localReady, partnerReady, status]);

  const startChat = () => {
    // Reset all status flags for a fresh start
    setLocalReady(false);
    setPartnerReady(false);
    setPartnerId("");
    setPartnerName("");
    setReputationInfo(null);
    setShowWarning(false);
    setShowFeedback(false);

    socket.emit("start", { interests: userInterests, userId: currentUserId, displayName: displayName });
    setStatus("waiting");
    setMessages([{ text: "Looking for someone you can talk to...", sender: "system" }]);
  };

  const nextChat = () => {
    const wasChatting = status === "chatting";
    
    socket.emit("next");
    setStatus("ideal");
    setRoomId("");
    setMessages((prev) => [
      ...prev,
      { text: "You have disconnected from the chat.", sender: "system" },
    ]);
    
    // Reset flags
    setLocalReady(false);
    setPartnerReady(false);

    // ONLY show feedback if the connection was fully finalized
    if (wasChatting) {
      setShowFeedback(true);
    } else {
      // If we clicked Next while waiting/warning, just start again immediately
      startChat();
    }
  };

  // Keyboard shortcut: Esc for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "ideal") {
        nextChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, roomId]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || status !== "chatting") return;

    // OPTIMISTIC UPDATE: Instant speed!
    setMessages((prev) => [...prev, { text, sender: "me" }]);
    socket.emit("message", text);
    setInput("");

    // BACKGROUND MODERATION
    (async () => {
      try {
        const res = await fetch("/api/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) return; // Silent fail for moderation in bg

        const data = await res.json();
        setLastScore(data.score);
        setLastStatus(data.status);

        if (data.status === "Bad") {
          warningsRef.current += 1;
          const currentWarnings = warningsRef.current;
          setWarnings(currentWarnings);

          // PENALTY: Deduct reputation in DB
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
            await fetch(`${apiBase}/api/reputation/moderation-penalty`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: currentUserId, score: data.score }),
            });
          } catch (pErr) {
            console.error("Failed to apply penalty", pErr);
          }

          if (currentWarnings >= 3) {
            setMessages((prev) => [
              ...prev,
              {
                text: "CRITICAL: You have been disconnected for multiple violations. Your trust score has been penalized.",
                sender: "system",
              },
            ]);
            setTimeout(() => {
              nextChat();
            }, 3000);
            return;
          }

          setMessages((prev) => [
            ...prev,
            {
              text: `⚠️ WARNING (${currentWarnings}/3): Abuse detected. Please be respectful or you will be banned. (Trust Score Deducted)`,
              sender: "system",
            },
          ]);
          toast.error("Message flagged for abuse. Please stay respectful!");
        }
      } catch (error) {
        console.error("Bg Moderation Error:", error);
      }
    })();
  };

  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    socket.on("matched", async ({ roomId, partnerId: pId, partnerName: pName }) => {
      setRoomId(roomId);
      setPartnerId(pId || "");
      setPartnerName(pName || "Stranger");
      
      // Initialize flags for the new match
      setLocalReady(false);
      setPartnerReady(false);
      setIsPartnerTyping(false);

      if (pId) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
          const res = await fetch(`${apiBase}/api/reputation/${pId}?t=${new Date().getTime()}`);
          if (res.ok) {
            const rep = await res.json();
            setReputationInfo(rep);
            if (rep.trustScore < 0 || rep.badge === "🔴 Risky") {
              setShowWarning(true);
              // We do NOT set localReady here. User must click Accept.
            } else {
              // User is safe, automatically set local ready and notify partner
              setLocalReady(true);
              socket.emit("match_confirmed");
            }
          } else {
            // API Fallback
            setLocalReady(true);
            socket.emit("match_confirmed");
          }
        } catch (err) {
          console.error("Reputation check failed:", err);
          setLocalReady(true);
          socket.emit("match_confirmed");
        }
      }
    });

    socket.on("match_confirmed", () => {
      // Partner has confirmed they are ready
      setPartnerReady(true);
    });

    socket.on("message", ({ msg }) => {
      setMessages((prev) => [...prev, { text: msg, sender: "stranger" }]);
      setIsPartnerTyping(false);
    });

    socket.on("typing", () => {
      setIsPartnerTyping(true);
    });

    socket.on("stop_typing", () => {
      setIsPartnerTyping(false);
    });

    socket.on("waiting", () => {
      setStatus("waiting");
    });

    socket.on("partner_left", ({ partnerId: idFromSocket, partnerName: name } = {}) => {
      const wasChatting = status === "chatting";
      setStatus("ideal");
      setRoomId("");
      setIsPartnerTyping(false);
      if (idFromSocket) setPartnerId(idFromSocket);
      if (name) setPartnerName(name);
      
      // ONLY show feedback if the connection was officially finalized
      if (wasChatting) {
        setShowFeedback(true);
      }
      
      setMessages((prev) => [
        ...prev,
        { text: `${name || 'Stranger'} has disconnected.`, sender: "system" },
      ]);
    });

    return () => {
      socket.off();
    };
  }, [status]); 

  // Handle typing status
  useEffect(() => {
    if (input.trim() && status === "chatting") {
      socket.emit("typing");
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing");
      }, 3000);
    } else {
      socket.emit("stop_typing");
    }
  }, [input, status]);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto p-2 md:p-6 overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#0f172a] rounded-2xl md:rounded-3xl border border-gray-800 shadow-2xl overflow-hidden mb-16 md:mb-0">
          <div className="bg-[#1e293b] p-3 md:p-4 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  status === "chatting"
                    ? "bg-green-500 animate-pulse"
                    : "bg-yellow-500"
                }`}
              ></div>
              <h2 className="font-semibold text-lg">
                {status === "chatting" ? "Chatting with Stranger" : "Text Chat"}
              </h2>
            </div>
            {status !== "ideal" && (
              <button
                onClick={nextChat}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-colors border border-red-500/20"
              >
                Next (Esc)
              </button>
            )}
          </div>

          <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 ${showWarning ? 'blur-2xl pointer-events-none' : ''}`}>
            {status === "ideal" && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ready to chat?</h3>
                  <p className="text-gray-400">Connect with millions across the globe for an anonymous experience.</p>
                </div>
                <button
                  onClick={startChat}
                  className="bg-green-600 hover:bg-green-500 text-white px-10 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-600/20"
                >
                  Start Chatting
                </button>
              </div>
            )}

            {(status === "waiting" || status === "chatting") &&
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.sender === "system"
                      ? "justify-center"
                      : msg.sender === "me"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm md:text-base ${
                      msg.sender === "system"
                        ? msg.text.includes("Warning") || msg.text.includes("disconnected")
                          ? "bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-full !not-italic !text-sm !font-bold my-2 animate-bounce"
                          : "bg-transparent text-gray-500 italic text-xs uppercase tracking-wider"
                        : msg.sender === "me"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-200"
                    }`}
                  >
                    {msg.sender === "me" && <span className="text-[10px] block opacity-50 mb-0.5">You:</span>}
                    {msg.sender === "stranger" && <span className="text-[10px] block opacity-50 mb-0.5">Stranger:</span>}
                    {msg.text}
                  </div>
                </div>
              ))}
            {isPartnerTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-400 px-4 py-2 rounded-2xl text-xs flex items-center gap-2">
                  <span>Stranger is typing</span>
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {status === "chatting" && lastStatus && (
            <div className="px-4 py-2 bg-[#1e293b] border-t border-gray-700 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Moderation:</span>
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${lastStatus === "Good" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                  {lastStatus}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Score:</span>
                <span className="font-mono text-gray-200">{lastScore}</span>
              </div>
            </div>
          )}

          {status === "chatting" && (
            <div className="p-3 md:p-4 bg-[#1e293b] border-t border-gray-700 flex gap-2 md:gap-4 items-center">
              <button
                type="button"
                onClick={nextChat}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 md:px-5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-bold transition-all border border-gray-700"
              >
                Stop
              </button>
              <form onSubmit={sendMessage} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-600/20"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {status === "waiting" && (
            <div className="p-8 text-center bg-[#1e293b] border-t border-gray-700">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-400 text-sm">Searching for a partner...</p>
            </div>
          )}
        </div>
      </main>

      <div className="flex justify-center my-6">
        <Link href="/dashboard" className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full transition font-semibold border border-gray-600 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Return Home
        </Link>
      </div>

      <Footer />

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        targetId={partnerId}
        raterId={currentUserId}
        partnerName={partnerName}
      />

      <WarningModal
        isOpen={showWarning}
        reputation={reputationInfo}
        onAccept={() => {
          setShowWarning(false);
          setLocalReady(true);
          socket.emit("match_confirmed");
        }}
        onReject={() => {
          setShowWarning(false);
          // If rejected, wasChatting is still false, so nextChat resets cleanly
          nextChat();
        }}
      />
    </div>
  );
}
