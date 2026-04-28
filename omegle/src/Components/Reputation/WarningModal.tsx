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
      <div className="bg-[#0f172a] border-2 border-red-500/50 w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.2)] transform transition-all animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center uppercase tracking-tighter">
          <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6 shadow-lg border border-red-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-black text-white mb-2 italic">⚠️ Danger Warning ⚠️</h2>
          <p className="text-gray-400 text-sm font-bold mb-8">This user has a high number of negative reports.</p>

          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl mb-8 flex flex-col items-center gap-4">
             <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-red-500">{reputation.badge}</span>
                <div className="flex text-yellow-500 text-sm">
                  {"★".repeat(Math.max(0, Math.min(5, Math.ceil((reputation.trustScore || 0) / 10) + 2)))}
                  {"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.ceil((reputation.trustScore || 0) / 10) + 2))))}
                </div>
             </div>
             <p className="text-white text-lg font-black italic">TRUST SCORE: {reputation.trustScore}</p>
             <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{reputation.status}</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={onAccept}
              className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-500 font-black hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
            >
              Continue Anyway (At your own risk)
            </button>
            <button
              onClick={onReject}
              className="w-full py-5 rounded-2xl bg-red-600 text-white font-black hover:bg-red-500 shadow-lg shadow-red-600/30 transition-all active:scale-95 text-lg"
            >
              Skip and Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
