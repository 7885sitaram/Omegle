"use client";

import React from "react";

interface WarningModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onReject: () => void;
  reputation: {
    trustScore: number;
    badge: string;
    status: string;
  };
}

export default function WarningModal({ isOpen, onAccept, onReject, reputation }: WarningModalProps) {
  if (!isOpen) return null;

  const isRisky = (reputation.badge === "🔴 Risky" || (reputation.trustScore !== undefined && reputation.trustScore < 0));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border-2 border-red-500/50 w-full max-w-sm rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)] transform transition-all animate-in zoom-in-95 duration-300">
        <div className="p-6 md:p-8 text-center uppercase tracking-tighter">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4 md:mb-6 shadow-lg border border-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-12 md:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-xl md:text-3xl font-black text-white mb-1 md:mb-2 italic">⚠️ Danger ⚠️</h2>
          <p className="text-gray-400 text-[10px] md:text-sm font-bold mb-6 md:mb-8">This user has a high number of negative reports.</p>

          <div className="bg-red-500/10 border border-red-500/20 p-4 md:p-6 rounded-2xl md:rounded-3xl mb-6 md:mb-8 flex flex-col items-center gap-3 md:gap-4">
             <div className="flex items-center gap-2 md:gap-3">
                <span className="text-xl md:text-2xl font-black text-red-500">{reputation.badge}</span>
                <div className="flex text-yellow-500 text-[10px] md:text-sm">
                  {"★".repeat(Math.max(0, Math.min(5, Math.ceil((reputation.trustScore || 0) / 10) + 2)))}
                  {"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.ceil((reputation.trustScore || 0) / 10) + 2))))}
                </div>
             </div>
             <p className="text-white text-base md:text-lg font-black italic">SCORE: {reputation.trustScore}</p>
             <p className="text-red-400 text-[9px] md:text-xs font-bold uppercase tracking-widest">{reputation.status}</p>
          </div>

          <div className="space-y-3 md:space-y-4">
            <button
              onClick={onAccept}
              className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-gray-500 text-[10px] md:text-xs font-black hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
            >
              Continue Anyway
            </button>
            <button
              onClick={onReject}
              className="w-full py-4 md:py-5 rounded-xl md:rounded-2xl bg-red-600 text-white text-sm md:text-lg font-black hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all active:scale-95"
            >
              Skip and Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
