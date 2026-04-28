"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import Link from "next/link";
import { UserProfileView } from "@/Components/UserProfileView";
import { GlobalExplore } from "@/Components/GlobalExplore";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setupFlag = searchParams.get("setup");

  const [showProfile, setShowProfile] = useState(false);
  const [showGlobalExplore, setShowGlobalExplore] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null); // null = not yet checked
  const [showTruecallerResults, setShowTruecallerResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  
  // Luxury Service Eligibility
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("userId");
      if (id) {
        setSelectedUserId(id);

        // Fetch user profile to check if profile setup is completed
        const checkProfileStatus = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/users/${id}?requesterId=${id}`);
            if (res.ok) {
              const data = await res.json();
              const completed = !!data.user?.isProfileCompleted;
              setProfileCompleted(completed);
              setIsVerified(!!data.user?.isVerified);
              
              const repRes = await fetch(`${API_BASE_URL}/api/reputation/${id}`);
              if (repRes.ok) {
                const repData = await repRes.json();
                setTrustScore(repData.trustScore || 0);
              }

              if (completed) {
                window.localStorage.setItem("profileCompleted", "true");
              } else {
                window.localStorage.removeItem("profileCompleted");
              }
            } else {
              // Could not fetch - fall back to localStorage
              const cached = window.localStorage.getItem("profileCompleted");
              setProfileCompleted(cached === "true");
            }
          } catch (err) {
            console.error("Failed to check profile status", err);
            const cached = window.localStorage.getItem("profileCompleted");
            setProfileCompleted(cached === "true");
          }
        };
        checkProfileStatus();
      } else {
        // No userId in storage — treat as incomplete (will redirect via auth)
        setProfileCompleted(false);
      }
    }
  }, [API_BASE_URL]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchError(null);
    setSearchLoading(true);
    setSearchResults([]);
    setSearchOverlayOpen(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}&requesterId=${selectedUserId || ""}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "No users found");
      }
      setSearchResults(data.users || []);
    } catch (err: any) {
      setSearchError(err.message || "No users found");
    } finally {
      setSearchLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-transparent text-white">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-2xl text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-wide">
            Stranger<span className="text-blue-500">Chat</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">
            Talk to strangers, make friends, and explore the world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full px-4">
          <Link href="/vc" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-blue-500 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Video Chat</h2>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Face-to-face energy with random people.</p>
            </div>
          </Link>

          <Link href="/chat" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-green-500 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">Text Chat</h2>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Classic anonymous text conversations.</p>
            </div>
          </Link>

          <Link href="/ai-chat" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-purple-500 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">AI Partner</h2>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Chat with our intelligent AI companion.</p>
            </div>
          </Link>

          <div 
            onClick={() => {
              if (isVerified === null || trustScore === null) {
                toast.info("Checking eligibility...");
                return;
              }
              if (!isVerified) {
                toast.error("Luxury Alert: Mobile verification is required for Phone Mode!");
                return;
              }
              if (trustScore < 5) {
                toast.error(`Luxury Alert: Your reputation score (${trustScore}) is too low for Phone Mode. Minimum 5 required.`);
                return;
              }
              router.push("/phone");
            }} 
            className="group cursor-pointer"
          >
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-yellow-500 rounded-[32px] p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-lg z-10 shadow-lg">PRO</div>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6 text-yellow-400 group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2 text-white">StrangerPhone</h2>
              <p className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">Premium voice calls with verified users.</p>
            </div>
          </div>

        </div>
      </main>

      <Footer />

      {searchOverlayOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-500">
          <div className="w-full max-w-md mx-4 bg-[#0f172a] border border-white/10 rounded-3xl p-5 shadow-[0_32px_120px_rgba(0,0,0,1)] animate-in zoom-in-95 fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">
                  User Search
                </p>
                <h3 className="text-sm font-bold text-white">Results Found</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchOverlayOpen(false);
                  setSearchError(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {searchLoading && (
              <p className="text-xs text-gray-400">Searching...</p>
            )}
            {searchError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 px-3 py-2 rounded-lg">
                {searchError}
              </p>
            )}

            {!searchLoading && !searchError && searchResults.length === 0 && (
              <p className="text-xs text-gray-400">No users found for this query.</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-72 overflow-y-auto mt-1">
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl p-3 flex items-center justify-between hover:border-blue-500/60 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        {u.profilePicture ? (
                          <img
                            src={u.profilePicture}
                            alt={u.displayName || "avatar"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-gray-400">
                            {u.displayName?.[0]?.toUpperCase() || "U"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {u.displayName}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          @{u.displayName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (u.isFriend) {
                          setSelectedUserId(u._id);
                          setShowProfile(true);
                          setSearchOverlayOpen(false);
                        } else if (!u.isRequested) {
                          try {
                            const res = await fetch(`${API_BASE_URL}/users/${u._id}/friend-requests`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ requesterId: selectedUserId })
                            });
                            if (res.ok) {
                              setSearchResults(prev => prev.map(item => item._id === u._id ? { ...item, isRequested: true } : item));
                            }
                          } catch (err) {
                            console.error("Failed to send request", err);
                          }
                        }
                      }}
                      disabled={u.isRequested}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold text-white transition ${u.isFriend ? "bg-green-600 hover:bg-green-500" :
                          u.isRequested ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
                        }`}
                    >
                      {u.isFriend ? "View Profile" : u.isRequested ? "Requested" : "Add Friend"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <UserProfileView
        open={showProfile}
        onClose={() => setShowProfile(false)}
        userId={selectedUserId}
      />
      <GlobalExplore
        open={showGlobalExplore}
        onClose={() => setShowGlobalExplore(false)}
        currentUserId={selectedUserId}
      />
    </div>
  );
}
