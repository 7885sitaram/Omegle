"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const warningsRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
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

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(`${apiBase}/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUserInterests(data.user?.interests || []);
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

  const startChat = () => {
    socket.emit("start", { interests: userInterests });
    setStatus("waiting");
    setMessages([{ text: "Looking for a stranger...", sender: "system" }]);
  };

  const nextChat = () => {
    socket.emit("next");
    window.location.reload();
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (text && status === "chatting") {
      try {
        setLastScore(null);
        setLastStatus(null);

        const res = await fetch("/api/moderate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) throw new Error("Moderation failed");

        const data = await res.json();
        setLastScore(data.score);
        setLastStatus(data.status);

        if (data.status === "Bad") {
          warningsRef.current += 1;
          const currentWarnings = warningsRef.current;
          setWarnings(currentWarnings);

          if (currentWarnings >= 3) {
            setMessages((prev) => [
              ...prev,
              {
                text: "You have been disconnected for violating chat rules.",
                sender: "system",
              },
            ]);
            setTimeout(() => {
              nextChat();
            }, 2000);
            return;
          }

          setMessages((prev) => [
            ...prev,
            {
              text: `Warning ${currentWarnings}/3: Your message was flagged as Bad (Score: ${data.score}). Please keep it respectful.`,
              sender: "system",
            },
          ]);
          setInput("");
          return;
        }

        socket.emit("message", text);
        setMessages((prev) => [...prev, { text, sender: "me" }]);
        setInput("");
      } catch (error) {
        console.error("Error:", error);
        socket.emit("message", text);
        setMessages((prev) => [...prev, { text, sender: "me" }]);
        setInput("");
      }
    }
  };

  useEffect(() => {
    socket.on("matched", ({ roomId }) => {
      setRoomId(roomId);
      setStatus("chatting");
      setMessages([
        {
          text: "You are now chatting with a random stranger. Say hi!",
          sender: "system",
        },
      ]);
    });

    socket.on("message", ({ msg }) => {
      setMessages((prev) => [...prev, { text: msg, sender: "stranger" }]);
    });

    socket.on("waiting", () => {
      setStatus("waiting");
    });

    socket.on("partner_left", () => {
      setStatus("ideal");
      setRoomId("");
      setMessages((prev) => [
        ...prev,
        { text: "Stranger has disconnected.", sender: "system" },
      ]);
    });

    return () => {
      socket.off();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white font-sans">
      <Navbar />

      <main className="flex-1 flex flex-col container mx-auto max-w-4xl p-4 md:p-6 overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#0f172a] rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
          <div className="bg-[#1e293b] p-4 border-bottom border-gray-700 flex justify-between items-center">
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
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-red-500/20"
              >
                Next (Esc)
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
            {status === "ideal" && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Ready to chat?</h3>
                  <p className="text-gray-400">
                    Join thousands of people online and start a conversation.
                  </p>
                </div>
                <button
                  onClick={startChat}
                  className="bg-green-600 hover:bg-green-500 text-white px-10 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-lg shadow-green-600/20"
                >
                  Start Chatting
                </button>
              </div>
            )}

            {status !== "ideal" &&
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
                    className={`
                  max-w-[80%] px-4 py-2 rounded-2xl text-sm md:text-base
                  ${
                    msg.sender === "system"
                      ? msg.text.includes("Warning") ||
                        msg.text.includes("disconnected")
                        ? "bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-full !not-italic !text-sm !font-bold my-2 animate-bounce"
                        : "bg-transparent text-gray-500 italic text-xs uppercase tracking-wider"
                      : msg.sender === "me"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-200"
                  }
                `}
                  >
                    {msg.sender === "me" && (
                      <span className="text-[10px] block opacity-50 mb-0.5">
                        You
                      </span>
                    )}
                    {msg.sender === "stranger" && (
                      <span className="text-[10px] block opacity-50 mb-0.5">
                        Stranger
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          {status === "chatting" && lastStatus && (
            <div className="px-4 py-2 bg-[#1e293b] border-t border-gray-700 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Moderation:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    lastStatus === "Good"
                      ? "bg-green-500/20 text-green-500"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
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
            <form
              onSubmit={sendMessage}
              className="p-4 bg-[#1e293b] border-t border-gray-700 flex gap-4"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Send
              </button>
            </form>
          )}

          {status === "waiting" && (
            <div className="p-8 text-center bg-[#1e293b] border-t border-gray-700">
              <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-gray-400 text-sm">Waiting for a partner...</p>
            </div>
          )}
        </div>
      </main>

      <div className="flex justify-center my-6">
        <Link
          href="/dashboard"
          className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full transition font-semibold border border-gray-600 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Return Home
        </Link>
      </div>

      <Footer />
    </div>
  );
}

