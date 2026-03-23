"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import Link from "next/link";
import { ProfileOnboardingOverlay } from "@/Components/ProfileOnboardingOverlay";
import { UserProfileDrawer } from "@/Components/UserProfileDrawer";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const setupFlag = searchParams.get("setup");
  const forceOpen = setupFlag === "1";

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("userId");
      if (id) {
        setCurrentUserId(id);

        // Fetch user profile to see if it's completed
        const checkProfileStatus = async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.user?.displayName && data.user?.interests?.length > 0) {
                window.localStorage.setItem("profileCompleted", "true");
              }
            }
          } catch (err) {
            console.error("Failed to check profile status", err);
          }
        };
        checkProfileStatus();
      }
    }
  }, [API_BASE_URL]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    setSearchError(null);
    setSearchLoading(true);
    setSearchResults([]);
    setSearchOverlayOpen(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}&requesterId=${currentUserId || ""}`
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

  const centerSearchBar = (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-md flex items-center gap-2"
    >
      <div className="flex-1 relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by username…"
          className="w-full bg-[#020617] border border-gray-700 rounded-full px-4 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
          Enter ↵
        </span>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">
      <Navbar
        centerContent={centerSearchBar}
        showProfile={true}
        onOpenProfile={() => setProfileDrawerOpen(true)}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-wide">
            Stranger<span className="text-blue-500">Chat</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl">
            Connect with the world. Choose your way to chat.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl w-full px-4">
          <Link href="/vc" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-white">
                Video Chat
              </h2>
              <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
                Connect randomly with strangers via webcam. See who you meet
                next!
              </p>
            </div>
          </Link>

          <Link href="/chat" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-green-500 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
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
              <h2 className="text-2xl font-bold mb-3 text-white">Text Chat</h2>
              <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
                Quickly connect with strangers through text. Simple and fast.
              </p>
            </div>
          </Link>

          <Link href="/ai-chat" className="group">
            <div className="bg-[#1e293b] hover:bg-[#334155] border border-gray-700 hover:border-purple-500 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl h-full cursor-pointer">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
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
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-3 text-white">
                AI Chat Partner
              </h2>
              <p className="text-gray-400 group-hover:text-gray-200 transition-colors">
                Chat with an intelligent AI partner. A friendly conversation is
                just a click away.
              </p>
            </div>
          </Link>
        </div>
      </main>

      <Footer />
      <ProfileOnboardingOverlay forceOpen={forceOpen} />
      {searchOverlayOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md mx-4 bg-[#020617] border border-white/10 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                Search result
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchOverlayOpen(false);
                  setSearchError(null);
                }}
                className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded-full hover:bg-white/5"
              >
                Close
              </button>
            </div>

            {searchLoading && (
              <p className="text-xs text-gray-400">Searching…</p>
            )}
            {searchError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 px-3 py-2 rounded-lg">
                {searchError}
              </p>
            )}

            {!searchLoading && !searchError && searchResults.length === 0 && (
              <p className="text-xs text-gray-400">No users found.</p>
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
                          // eslint-disable-next-line @next/next/no-img-element
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
                          setCurrentUserId(u._id);
                          setProfileDrawerOpen(true);
                          setSearchOverlayOpen(false);
                        } else if (!u.isRequested) {
                          try {
                            const res = await fetch(`${API_BASE_URL}/users/${u._id}/friend-requests`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ requesterId: currentUserId })
                            });
                            if (res.ok) {
                              // Update local state for this user
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
                      {u.isFriend ? "View Profile" : u.isRequested ? "Requested" : "Add friend"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <UserProfileDrawer
        open={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        userId={currentUserId}
      />
    </div>
  );
}

