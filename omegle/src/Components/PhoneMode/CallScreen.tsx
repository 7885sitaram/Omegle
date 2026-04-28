"use client";

import React, { useEffect, useRef, useState } from "react";

interface CallScreenProps {
  roomId: string;
  partnerMobile: string;
  onEndCall: () => void;
}

export default function CallScreen({ roomId, partnerMobile, onEndCall }: CallScreenProps) {
  const zpRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isJoining = useRef(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const start = async () => {
      if (isJoining.current || !containerRef.current) return;
      isJoining.current = true;

      try {
        if (!process.env.NEXT_PUBLIC_ZEGO_APP_ID || !process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET) {
          console.error("ZegoCloud credentials missing!");
          return;
        }

        const { ZegoUIKitPrebuilt } = await import("@zegocloud/zego-uikit-prebuilt");

        const getRandomId = () => {
          if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
          }
          return `user_${Math.floor(Math.random() * 10000)}_${Date.now()}`;
        };
        const userId = getRandomId();

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
          Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID),
          process.env.NEXT_PUBLIC_ZEGO_SERVER_SECRET!,
          roomId,
          userId,
          "You"
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
          container: containerRef.current,
          scenario: {
            mode: ZegoUIKitPrebuilt.OneONoneCall, 
          },
          turnOnCameraWhenJoining: false,
          turnOnMicrophoneWhenJoining: true, 
          showMyCameraToggleButton: false,
          showMyMicrophoneToggleButton: true, 
          showAudioVideoSettingsButton: false,
          showScreenSharingButton: false,
          showTextChat: false,
          showPreJoinView: false,
          showUserList: false,
          layout: "Auto",
          maxUsers: 2,
          onLeaveRoom: () => {
             onEndCall();
          },
        });
      } catch (err) {
        console.error("Failed to join call:", err);
        isJoining.current = false;
      }
    };

    start();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
      }
      isJoining.current = false;
    };
  }, [roomId, onEndCall]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (containerRef.current) {
       const muteBtn = containerRef.current.querySelector('.zego-uikit-mic-button');
       if (muteBtn) (muteBtn as HTMLElement).click();
    }
  };

  const toggleSpeaker = () => {
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    // Note: Zego UI kit's speaker toggle is typically a volume/output switch.
    // We try to trigger it if available, else we handle it visually.
    if (containerRef.current) {
       const speakerBtn = containerRef.current.querySelector('.zego-uikit-speaker-button');
       if (speakerBtn) (speakerBtn as HTMLElement).click();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020617] text-white overflow-hidden h-[100dvh] font-sans">
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-black pointer-events-none opacity-80"></div>

      {/* Top section: Caller Info & Timer (Centered) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 animate-fade-in">
        <div className="mb-2 text-blue-500 bg-blue-500/10 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-[0.3em] border border-blue-500/20">
            Connected
        </div>
        <h2 className="text-4xl md:text-5xl font-light tracking-wide mb-2 drop-shadow-md">Stranger</h2>
        <p className="text-gray-400 text-lg md:text-xl mb-10 font-mono tracking-wider">{partnerMobile}</p>
        
        {/* Large Timer Display */}
        <div className="text-6xl md:text-7xl font-thin tracking-tight text-white mb-20 animate-pulse-slow">
           {formatDuration(callDuration)}
        </div>

        {/* Action Controls Container */}
        <div className="w-full max-w-[280px] flex justify-between items-center mb-16">
          {/* Mute Component */}
          <div className="flex flex-col items-center gap-3">
              <button 
                onClick={toggleMute}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                } backdrop-blur-xl border border-white/5 shadow-2xl active:scale-90`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isMuted ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  )}
                </svg>
              </button>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Mute</span>
          </div>

          {/* Speaker Component */}
          <div className="flex flex-col items-center gap-3">
              <button 
                onClick={toggleSpeaker}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isSpeaker ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                } backdrop-blur-xl border border-white/5 shadow-2xl active:scale-90`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Speaker</span>
          </div>
        </div>

        {/* End Call Button */}
        <button 
          onClick={onEndCall}
          className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white shadow-[0_0_60px_rgba(220,38,38,0.3)] transition-all hover:bg-red-500 active:scale-95 group relative mb-10"
        >
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-10 group-hover:opacity-20"></div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 rotate-[135deg]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
        </button>
      </div>

      {/* Hidden Zego Container */}
      <div 
        className="absolute bottom-0 left-0 opacity-0 pointer-events-none -z-10" 
        style={{ width: '100px', height: '100px' }}
        ref={containerRef} 
      />

      <style jsx>{`
        .animate-fade-in { animation: fadeIn 1s ease-out; }
        .animate-pulse-slow { animation: pulseTimer 2s infinite ease-in-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseTimer {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
