"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  attachment?: string;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setMessages([
      {
        id: "1",
        sender: "ai",
        text: "Hello! I am your AI companion. How can I help you today?",
      },
    ]);
  }, []);
  const [input, setInput] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<{id?: string; displayName?: string} | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fileTypeLabel, setFileTypeLabel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch(e) {}
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isLoading) return;

    const userText = input.trim();
    const currentFile = attachedFile;
    
    setInput("");
    setAttachedFile(null);

    const newMessages: Message[] = [
      ...messages,
      { 
        id: Date.now().toString(), 
        sender: "user", 
        text: userText, 
        attachment: currentFile?.name 
      },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const formData = new FormData();
      if (userText) formData.append("message", userText);
      if (currentFile) formData.append("file", currentFile);
      if (user?.id) formData.append("userId", user.id);
      if (user?.displayName) formData.append("userName", user.displayName);

      const res = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errStr = "AI is currently unavailable. Please try again later.";
        try {
          const errData = await res.json();
          errStr = errData.error || errStr;
        } catch(e) {}
        throw new Error(errStr);
      }

      // Add empty AI message instantly
      const aiMsgId = Date.now().toString();
      setMessages((prev) => [...prev, { id: aiMsgId, sender: "ai", text: "" }]);
      
      const reader = res.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (reader) {
        let textContent = "";
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');
          buffer = parts.pop() || "";
          
          let newText = "";
          for (const line of parts) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                newText += parsed.response;
              }
            } catch (e) {
              // Ignore partial JSON
            }
          }
          
          if (newText) {
            // Render character by character to simulate human typing
            for (const char of newText) {
              textContent += char;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMsgId ? { ...msg, text: textContent } : msg
                )
              );
              // Magic Vibe Booster: Simulate human typing delay
              await new Promise((r) => setTimeout(r, 20 + Math.random() * 20)); // ~30ms avg delay
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "ai",
          text: err.message || "Something went wrong. Please try again.",
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
        
        <div className="relative notranslate">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
            AI
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></div>
        </div>
        
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white tracking-wide">AI Partner</h1>
          <p className="text-xs font-medium text-green-400">Online now</p>
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
              className={`max-w-[75%] md:max-w-[60%] p-3.5 mb-1 shadow-lg flex flex-col gap-1 ${
                msg.sender === "user"
                  ? "bg-purple-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-[#1e293b] text-gray-100 rounded-2xl rounded-tl-sm border border-gray-700/50"
              }`}
            >
              {msg.attachment && (
                <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg mb-1 text-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate max-w-[150px]">{msg.attachment}</span>
                </div>
              )}
              {msg.text && (
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              )}
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
        <div className="max-w-4xl mx-auto flex flex-col gap-2 relative">
          {/* File Preview */}
          {attachedFile && (
            <div className="self-start max-w-sm flex items-center gap-2 bg-[#1e293b] border border-purple-500/30 rounded-lg p-2.5 text-xs text-gray-200 ml-1 mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="bg-purple-600/20 p-2 rounded-md">
                 {fileTypeLabel === 'image' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                 ) : fileTypeLabel === 'video' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                 )}
               </div>
               <div className="flex flex-col">
                 <span className="truncate flex-1 font-medium">{attachedFile.name}</span>
                 <span className="text-[10px] text-gray-500 uppercase tracking-tighter">{fileTypeLabel} selected</span>
               </div>
               <button 
                type="button" 
                onClick={() => { setAttachedFile(null); setFileTypeLabel(null); }}
                className="hover:text-red-400 p-1.5 hover:bg-black/20 rounded-full transition-colors shrink-0 ml-1"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>
          )}

          <div className="relative">
            {/* Attachment Menu */}
            {isMenuOpen && (
              <div className="absolute bottom-full right-12 mb-4 bg-[#1e293b]/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-48 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 z-20">
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = ".pdf,.doc,.docx,.txt";
                      fileInputRef.current.click();
                      setFileTypeLabel("document");
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-gray-300 hover:text-white group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Document</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*";
                      fileInputRef.current.click();
                      setFileTypeLabel("image");
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-gray-300 hover:text-white group"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-600/20 flex items-center justify-center text-pink-400 group-hover:bg-pink-600 group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "video/*";
                      fileInputRef.current.click();
                      setFileTypeLabel("video");
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all text-gray-300 hover:text-white group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="font-medium text-sm">Video</span>
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                handleSend(e);
                setFileTypeLabel(null);
              }}
              className="flex items-end gap-2 bg-[#1e293b] rounded-3xl p-1.5 pr-1.5 border border-gray-700/80 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all shadow-xl group/form"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setAttachedFile(e.target.files[0]);
                  }
                }}
              />
               <textarea
                   value={input}
                   onChange={(e) => setInput(e.target.value)}
                   onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                           e.preventDefault();
                           handleSend(e);
                           setFileTypeLabel(null);
                       }
                   }}
                   placeholder="Type your message here..."
                   className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-3 px-4 text-[15px] placeholder-gray-500 text-white outline-none scrollbar-hide ml-2"
                   rows={1}
               />
               
               <div className="flex items-center gap-1 mb-0.5 mr-0.5">
                  <button 
                    type="button" 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className={`p-2.5 rounded-full transition-all duration-200 ${isMenuOpen ? 'bg-purple-600 text-white rotate-45' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                  >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                  </button>

                  <button
                      type="submit"
                      disabled={isLoading || (!input.trim() && !attachedFile)}
                      className={`p-2.5 rounded-full transition-all shadow-lg shrink-0 ${
                      input.trim() || attachedFile
                          ? "bg-purple-600 hover:bg-purple-500 text-white scale-100"
                          : "bg-gray-800 text-gray-600 cursor-not-allowed scale-95"
                      }`}
                  >
                      <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-6 h-6 -rotate-90 transform"
                      >
                          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                      </svg>
                  </button>
               </div>
            </form>
          </div>
          <div className="text-center mt-1 pb-1">
            <p className="text-[10px] text-gray-600">AI can make mistakes. Verify important info.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
