"use client";

import React, { useState } from "react";
import { toast } from "sonner";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string; // The partner's user ID
  raterId: string;  // The current user's ID
  partnerName?: string;
}

export default function FeedbackModal({ isOpen, onClose, targetId, raterId, partnerName }: FeedbackModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleRate = async (type: "good" | "bad" | "spam" | "friendly") => {
    if (!targetId || !raterId) {
      toast.error("Unable to identify users for rating.");
      return;
    }

    setLoading(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
      const res = await fetch(`${apiBase}/api/reputation/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raterId, targetId, ratingType: type }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Thank you for your feedback!");
        setSubmitted(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        toast.error(data.message || "Failed to submit rating.");
        onClose(); // Close anyway if it's a conflict/already rated
      }
    } catch (err) {
      console.error("Rating error:", err);
      toast.error("Connection error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f172a] border border-gray-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl transform transition-all animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          {!submitted ? (
            <>
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">How was your session with {partnerName || 'Stranger'}?</h2>
              <p className="text-gray-400 mb-8">Your feedback helps {partnerName || 'this user'} build their reputation.</p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={loading}
                  onClick={() => handleRate("good")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-all group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">👍</span>
                  <span className="text-sm font-semibold text-green-500">Good User</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleRate("friendly")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">❤️</span>
                  <span className="text-sm font-semibold text-pink-500">Friendly</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleRate("bad")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">👎</span>
                  <span className="text-sm font-semibold text-orange-500">Bad Behavior</span>
                </button>

                <button
                  disabled={loading}
                  onClick={() => handleRate("spam")}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🚫</span>
                  <span className="text-sm font-semibold text-red-500">Spam/Abuse</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="mt-8 text-gray-500 hover:text-white text-sm font-medium transition-colors"
              >
                Skip for now
              </button>
            </>
          ) : (
            <div className="py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-green-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Feedback Received!</h2>
              <p className="text-gray-400">Thank you for helping us keep {process.env.NEXT_PUBLIC_APP_NAME || 'StrangerChat'} safe.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
