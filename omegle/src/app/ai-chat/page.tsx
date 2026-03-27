"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! I am your AI partner. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), sender: "user", text: userText },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch AI response");
      }

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "ai", text: data.reply },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: "⚠️ Sorry, I encountered an error communicating with Ollama. Make sure it is running locally.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-gray-100 font-sans">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 bg-[#0f172a] border-b border-gray-800 shadow-sm sticky top-0 z-10 w-full shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
          aria-label="Back to dashboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            AI
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>
        </div>
        
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white tracking-wide">AI Partner</h1>
          <p className="text-xs font-medium text-green-400">Online</p>
        </div>
        
        <div className="flex gap-2 text-gray-400">
           <button className="p-2 rounded-full hover:bg-gray-800 hover:text-white transition">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-6 space-y-6" ref={scrollRef}>
        <div className="text-center my-4 opacity-80">
            <span className="text-[10px] text-gray-400 font-semibold bg-gray-800/60 px-4 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-sm border border-gray-700/50">Today</span>
        </div>
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs mr-3 shrink-0 self-end mb-1">
                AI
              </div>
            )}
            <div
              className={`max-w-[75%] md:max-w-[60%] p-3.5 mb-1 shadow-lg ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-[#1e293b] text-gray-100 rounded-2xl rounded-tl-sm border border-gray-700/50"
              }`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start items-end">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs mr-3 shrink-0 mb-1">
              AI
            </div>
            <div className="max-w-[75%] md:max-w-[60%] rounded-2xl p-4 mb-1 bg-[#1e293b] text-gray-100 rounded-tl-sm border border-gray-700/50 flex gap-1.5 items-center shadow-lg h-[52px]">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="p-3 md:p-4 bg-[#0f172a] border-t border-gray-800 w-full shrink-0">
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 max-w-4xl mx-auto bg-[#1e293b] rounded-3xl p-1 pr-1 border border-gray-700 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all shadow-inner relative"
        >
           <button type="button" className="p-3 text-gray-400 hover:text-white transition rounded-full hover:bg-white/5 shrink-0 self-end mb-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                    }
                }}
                placeholder="Message AI Partner..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3.5 px-2 text-[15px] placeholder-gray-500 text-white outline-none scrollbar-hide"
                rows={1}
            />
            <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`p-3 rounded-full transition-all shadow-lg shrink-0 self-end mb-0.5 mr-0.5 ${
                input.trim()
                    ? "bg-purple-600 hover:bg-purple-500 text-white scale-100"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed my-0.5 mr-0.5 scale-95"
                }`}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 -rotate-90 transform"
                    style={{ marginLeft: "2px", marginBottom: "2px" }}
                >
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
            </button>
        </form>
        <div className="text-center mt-2 pb-1">
          <p className="text-[10px] text-gray-600">AI can make mistakes. Verify important information.</p>
        </div>
      </footer>
    </div>
  );
}
