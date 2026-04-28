"use client";

import React, { useEffect } from "react";
import "./IncomingCall.css"; // We'll create this or use Tailwind classes inline

interface IncomingCallProps {
  callerNumber: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({
  callerNumber,
  onAccept,
  onReject,
}: IncomingCallProps) {
  useEffect(() => {
    // Play ringtone when component mounts
    const audio = new Audio("/ringtone.mp3");
    audio.loop = true;
    audio.play().catch((err) => console.log("Audio play failed:", err));

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#111] text-white overflow-hidden py-16">
      {/* Dynamic background effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black opacity-80 pointer-events-none"></div>

      {/* Top section: Caller info */}
      <div className="z-10 flex flex-col items-center mt-12 animate-slide-down">
        <p className="text-gray-400 text-lg mb-2">Incoming Call...</p>
        <h1 className="text-4xl font-light tracking-wide">{callerNumber}</h1>
        <p className="text-sm mt-4 text-gray-500">Omegle Stranger</p>
      </div>

      {/* Middle section: Contact Avatar (simulated) */}
      <div className="z-10 flex flex-col items-center flex-1 justify-center relative">
        <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(255,255,255,0.1)] relative">
          {/* Avatar pulsing circles */}
          <div className="absolute inset-0 rounded-full border border-gray-600 animate-ping opacity-75"></div>
          <div className="absolute inset-[-20px] rounded-full border border-gray-700 animate-ping opacity-50 animation-delay-500"></div>
          👤
        </div>
      </div>

      {/* Bottom section: Actions */}
      <div className="z-10 flex w-full max-w-sm justify-between px-12 mb-12 animate-slide-up">
        {/* Reject Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={onReject}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white mb-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-transform hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 rotate-[135deg]" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          <span className="text-sm text-gray-300">Decline</span>
        </div>

        {/* Accept Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center text-white mb-2 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-bounce-subtle transition-transform hover:scale-110 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-shake" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </button>
          <span className="text-sm text-gray-300">Accept</span>
        </div>
      </div>
    </div>
  );
}
