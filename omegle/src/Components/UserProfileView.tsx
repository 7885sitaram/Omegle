"use client"

import { useEffect, useState } from "react"
import { FeedUploadModal } from "./FeedUploadModal"
import { MobileVerificationModal } from "./MobileVerificationModal"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

interface Post {
  _id: string
  type: "post" | "reel"
  mediaUrl: string
  caption?: string
  likes?: string[]
  views?: number
  createdAt: string
}

interface UserProfile {
  _id: string
  email?: string
  fullName?: string
  displayName?: string
  profilePicture?: string
  bio?: string
  gender?: string
  dateOfBirth?: string
  country?: string
  state?: string
  city?: string
  phoneNumber?: string
  interests?: string[]
  languages?: string[]
  preferredGender?: "male" | "female" | "other" | "any"
  preferredAgeRange?: { min: number; max: number }
  preferredLanguage?: string
  regionPreference?: "same_country" | "global"
  chatMode?: "text" | "video" | "both"
  anonymousMode?: boolean
  allowFriendRequests?: boolean
  isPrivate?: boolean
  friends?: string[]
  isVerified?: boolean
  reputation?: { good: number; bad: number; spam: number; friendly: number }
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
}

interface UserProfileViewProps {
  open: boolean
  onClose: () => void
  userId?: string | null
  initialUser?: UserProfile | null
  readOnly?: boolean
}

export function UserProfileView({
  open,
  onClose,
  userId,
  initialUser = null,
  readOnly = false,
}: UserProfileViewProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "posts" | "reels">("overview")
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [showUpload, setShowUpload] = useState(false)

  // Reputation States
  const [reputationData, setReputationData] = useState<any>(null)
  const [fetchingRep, setFetchingRep] = useState(false)

  // Verification States
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  // Social List Modal States
  const [userListModal, setUserListModal] = useState<{ open: boolean; type: "followers" | "following"; users: any[] }>({ open: false, type: "followers", users: [] })
  const [listLoading, setListLoading] = useState(false)
  
  // Logic to determine which user ID to use (prop vs session fallback)
  const effectiveUserId = (userId || (typeof window !== "undefined" && open ? window.localStorage.getItem("userId") : null))?.trim() as string | null

  const isSelf = !!(
    typeof window !== "undefined" &&
    (effectiveUserId === window.localStorage.getItem("userId")?.trim() || (user && window.localStorage.getItem("userId")?.trim() === user._id))
  )

  useEffect(() => {
    if (!open) return

    if (!effectiveUserId) {
      if (open) setUser(null)
      return
    }

    // Reset old data to prevent "stale" display while loading
    if (effectiveUserId !== user?._id) {
       setUser(null)
       setReputationData(null)
       setPosts([])
    }

    setLoading(true)
    setError(null)

    const requesterId = typeof window !== "undefined" ? window.localStorage.getItem("userId")?.trim() : null

    // 1. Fetch Core Profile Data
    fetch(`${API_BASE_URL}/users/${effectiveUserId}?requesterId=${requesterId || ""}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Failed to load profile")
        }
        return res.json()
      })
      .then((data) => {
        setUser(data.user)
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load profile")
      })
      .finally(() => setLoading(false))

    // 2. Fetch Reputation Details (Lower Priority)
    setFetchingRep(true)
    const buster = new Date().getTime();
    fetch(`${API_BASE_URL}/api/reputation/${effectiveUserId}?t=${buster}`)
      .then(res => res.json())
      .then(data => {
        setReputationData(data)
      })
      .catch(err => {
        console.error("Reputation fetch error:", err);
        // Fallback or silent fail for reputation
      })
      .finally(() => setFetchingRep(false))
  }, [effectiveUserId, open, initialUser])

  const fetchPosts = async () => {
    if (!effectiveUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/user/${effectiveUserId}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Failed to fetch posts", err)
    }
  }

  useEffect(() => {
    if (open && effectiveUserId) {
      fetchPosts()
    }
  }, [open, effectiveUserId])

  const handleSave = async () => {
    if (!user?._id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update profile")

      setUser(data.user)
      setEditMode(false)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?._id) return
    const confirmed = window.confirm("🚩 CAUTION: You are about to permanently delete your account. All your data including posts, follows, and reputation will be lost forever. \n\nAre you absolutely sure you want to proceed?")
    
    if (!confirmed) return
    
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: "DELETE"
      })
      
      if (!res.ok) throw new Error("Deletion failed")
      
      alert("Account Deleted. You will be redirected shortly.")
      window.location.href = "/" // Redirect to lander/login
    } catch (err) {
      console.error("Delete failed", err)
      setError("Failed to delete account. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user?._id || !open) return
    const requesterId = typeof window !== "undefined" ? window.localStorage.getItem("userId")?.trim() : null
    if (!requesterId) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/social/follow/${user._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId }),
      })
      if (res.ok) {
        const data = await res.json()
        setUser(prev => prev ? { 
          ...prev, 
          isFollowing: data.isFollowing,
          followersCount: (prev.followersCount || 0) + (data.isFollowing ? 1 : -1)
        } : null)
      }
    } catch (err) {
      console.error("Follow toggle failed:", err)
    }
  }

  const fetchUserList = async (type: "followers" | "following") => {
    if (!userId) return
    setListLoading(true)
    setUserListModal({ open: true, type, users: [] })
    try {
      const res = await fetch(`${API_BASE_URL}/api/social/${userId}/${type}`)
      if (res.ok) {
        const data = await res.json()
        setUserListModal(prev => ({ ...prev, users: data.users || [] }))
      }
    } catch (err) {
      console.error(`Failed to fetch ${type}:`, err)
    } finally {
      setListLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={onClose} />

      <div className={`relative w-full max-w-4xl bg-[#0f172a] border ${user?.isVerified ? 'border-blue-500/30' : 'border-white/10'} rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-full max-h-[850px]`}>
        {user?.isVerified && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
        )}

        {/* Header Section */}
        <div className={`px-8 md:px-16 pt-12 pb-8 border-b border-white/5 ${user?.isVerified ? 'bg-gradient-to-b from-blue-500/10 to-transparent' : 'bg-gradient-to-b from-white/5 to-transparent'}`}>
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center md:items-start text-center md:text-left">
            {/* Avatar */}
            <div className="relative group">
              <div className={`absolute inset-0 bg-gradient-to-tr ${user?.isVerified ? 'from-blue-400 via-blue-600 to-blue-400' : 'from-blue-500 via-purple-500 to-pink-500'} rounded-full animate-spin-slow opacity-20 blur-xl group-hover:opacity-40 transition-opacity`} />
              <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr ${user?.isVerified ? 'from-blue-400 to-blue-700' : 'from-blue-500 via-purple-500 to-pink-600'} shadow-2xl relative z-10`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0f172a] border-4 border-[#0f172a] flex items-center justify-center">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-4xl font-black text-gray-500">{user?.displayName?.[0] || 'U'}</span>
                  )}
                </div>
              </div>
              {user?.isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2 rounded-full border-4 border-[#0f172a] z-20 shadow-xl scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              {reputationData?.badge === "🟢 Trusted User" && (
                <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-[#0f172a] z-20 shadow-xl group-hover:scale-125 transition-transform" title="Highly Trusted">
                   <span className="text-[10px]">⭐</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight text-white">
                    @{user?.displayName || 'anonymous'}
                  </h2>
                  {user?.isVerified && (
                     <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest text-blue-400">
                       Verified
                     </span>
                  )}
                </div>
                {isSelf && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all active:rotate-45"
                      title="Account Settings"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="px-6 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg"
                    >
                      {editMode ? "Cancel" : "Edit Profile"}
                    </button>
                    {isSelf && user?.isVerified === false && (
                      <button
                        onClick={() => setShowVerifyModal(true)}
                        className="px-6 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        Verify Now
                      </button>
                    )}
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-6 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                      Create Post
                    </button>
                  </div>
                )}
                {!isSelf && user && (
                  <button
                    onClick={handleFollowToggle}
                    className={`px-8 py-1.5 rounded-xl border font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-lg ${user.isFollowing ? "bg-white/10 text-white border-white/5 hover:bg-white/20" : "bg-blue-600 text-white border-blue-500/20 hover:bg-blue-500 shadow-blue-500/20"}`}
                  >
                    {user.isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center md:justify-start gap-10">
                <div className="text-center md:text-left">
                  <span className="block text-lg font-black text-white">{posts.filter(p => p.type === 'post').length}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Posts</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="block text-lg font-black text-white">{posts.filter(p => p.type === 'reel').length}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Reels</span>
                </div>
                <div 
                  onClick={() => fetchUserList("followers")}
                  className="text-center md:text-left cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <span className="block text-lg font-black text-white">{user?.followersCount || 0}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Followers</span>
                </div>
                <div 
                  onClick={() => fetchUserList("following")}
                  className="text-center md:text-left cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <span className="block text-lg font-black text-white">{user?.followingCount || 0}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Following</span>
                </div>
              </div>

              {/* Bio */}
              <div className="max-w-md">
                <p className="font-black text-sm text-gray-100 mb-1">{user?.fullName || 'Stranger User'}</p>
                {editMode ? (
                  <textarea
                    value={user?.bio || ''}
                    onChange={(e) => setUser(prev => prev ? { ...prev, bio: e.target.value } : null)}
                    className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    placeholder="Write a little about yourself..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">
                    {user?.bio || "No bio yet—just vibing anonymously."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center border-b border-white/5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-black transition-all ${activeTab === 'overview' ? "text-blue-400 border-t-2 border-blue-400 -mt-[1px]" : "text-gray-500 hover:text-gray-300"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-black transition-all ${activeTab === 'posts' ? "text-blue-400 border-t-2 border-blue-400 -mt-[1px]" : "text-gray-500 hover:text-gray-300"}`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-black transition-all ${activeTab === 'reels' ? "text-blue-400 border-t-2 border-blue-400 -mt-[1px]" : "text-gray-500 hover:text-gray-300"}`}
          >
            Reels
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          {loading && !user && (
            <div className="max-w-2xl mx-auto space-y-12 animate-pulse">
               <div className="flex gap-8 items-center">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-white/5" />
                  <div className="flex-1 space-y-4">
                     <div className="h-8 w-48 bg-white/10 rounded-xl" />
                     <div className="h-4 w-full bg-white/5 rounded-lg" />
                     <div className="h-4 w-2/3 bg-white/5 rounded-lg" />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="h-40 bg-white/5 rounded-[32px]" />
                  <div className="h-40 bg-white/5 rounded-[32px]" />
               </div>
            </div>
          )}

          {user && (
            <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <SectionBox title="Personal Details">
                    <InfoLine label="Full Name" value={user.fullName} editable={editMode} onChange={v => setUser({ ...user, fullName: v })} />
                    <InfoLine label="Country" value={user.country} editable={editMode} onChange={v => setUser({ ...user, country: v })} />
                    <InfoLine label="State" value={user.state} editable={editMode} onChange={v => setUser({ ...user, state: v })} />
                    <InfoLine label="City" value={user.city} editable={editMode} onChange={v => setUser({ ...user, city: v })} />
                    <InfoLine label="Gender" value={user.gender} />
                  </SectionBox>

                  <SectionBox title="Reputation & Trust">
                    <div className="space-y-4">
                      {fetchingRep ? (
                        <div className="flex gap-2 animate-pulse">
                          <div className="h-10 w-10 bg-white/5 rounded-full" />
                          <div className="h-10 flex-1 bg-white/5 rounded-2xl" />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-center bg-[#020617] px-4 py-2 rounded-2xl border border-white/5">
                               <span className="block text-xl font-black text-white">{reputationData?.trustScore || 0}</span>
                               <span className="text-[9px] uppercase font-black text-gray-500">Score</span>
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-black text-white">{reputationData?.badge || "Normal"}</span>
                                  <div className="flex text-yellow-500 text-[10px]">
                                    {"★".repeat(Math.max(0, Math.min(5, Math.ceil((reputationData?.trustScore || 0) / 10) + 2)))}
                                  </div>
                               </div>
                               <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic line-clamp-2">
                                 {reputationData?.aiSummary || "Reputation analysis in progress..."}
                               </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <RepStat label="Good" value={reputationData?.reputation?.good} color="text-green-500" />
                             <RepStat label="Friendly" value={reputationData?.reputation?.friendly} color="text-pink-500" />
                             <RepStat label="Bad" value={reputationData?.reputation?.bad} color="text-orange-500" />
                             <RepStat label="Spam" value={reputationData?.reputation?.spam} color="text-red-500" />
                          </div>
                        </>
                      )}
                    </div>
                  </SectionBox>
                </div>
              )}

              {activeTab === 'posts' && (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {posts.filter(p => p.type === 'post').map(post => (
                    <div key={post._id} className="aspect-square bg-white/5 border border-white/5 rounded-2xl overflow-hidden group/item relative">
                      <img src={post.mediaUrl} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-black">❤️ {post.likes?.length || 0}</span>
                      </div>
                    </div>
                  ))}
                  {posts.filter(p => p.type === 'post').length === 0 && (
                    <div className="col-span-3 py-20 flex flex-col items-center justify-center opacity-40">
                      <p className="text-xs uppercase tracking-widest font-black">No posts yet</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reels' && (
                <div className="grid grid-cols-3 gap-1 md:gap-4">
                  {posts.filter(p => p.type === 'reel').map(post => (
                    <div key={post._id} className="aspect-[9/16] bg-white/5 border border-white/5 rounded-2xl overflow-hidden group/item relative">
                      <video src={post.mediaUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                        <span className="text-white text-[10px] font-black">▶ {post.views || 0}</span>
                      </div>
                    </div>
                  ))}
                  {posts.filter(p => p.type === 'reel').length === 0 && (
                    <div className="col-span-3 py-20 flex flex-col items-center justify-center opacity-40">
                      <p className="text-xs uppercase tracking-widest font-black">No reels yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {editMode && (
          <div className="px-8 py-6 border-t border-white/10 bg-[#020617]/50 flex justify-end gap-3">
            <button
              onClick={() => setEditMode(false)}
              className="px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

{/* Settings Overlay: Redesigned as a Category-based Hub */}
{showSettings && (
  <div className="absolute inset-0 z-[120] bg-[#020617]/98 backdrop-blur-3xl animate-in slide-in-from-right-full duration-500 flex flex-col">
    {/* Header */}
    <div className="p-8 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#020617]/50 backdrop-blur-md z-10">
      <div className="flex items-center gap-4">
        <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400 group transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h3 className="text-xl font-black text-white px-2">Account Settings</h3>
          <p className="px-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Manage your profile & preferences</p>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
      >
        {saving ? "Syncing..." : "Save All"}
      </button>
    </div>

    {/* Scrollable Categories */}
    <div className="flex-1 overflow-y-auto px-8 md:px-16 py-10 space-y-16 scrollbar-hide">
      
      {/* Category 1: Identity */}
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-blue-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-blue-500/30" /> Identity Hub
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <SettingsInput label="Full Name" value={user?.fullName} onChange={v => setUser({ ...user!, fullName: v })} />
           <SettingsInput label="Display Name" value={user?.displayName} onChange={v => setUser({ ...user!, displayName: v })} />
           <div className="col-span-full">
              <SettingsTextarea label="Bio / Tagline" value={user?.bio} onChange={v => setUser({ ...user!, bio: v })} />
           </div>
        </div>
      </div>

      {/* Category 2: Personal Details */}
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-purple-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-purple-500/30" /> Personal Info
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <SettingsSelect 
             label="Gender" 
             value={user?.gender} 
             options={["male", "female", "other"]} 
             onChange={v => setUser({ ...user!, gender: v })} 
           />
           <SettingsInput 
             label="Date of Birth" 
             type="date" 
             value={user?.dateOfBirth?.split('T')[0]} 
             onChange={v => setUser({ ...user!, dateOfBirth: v })} 
           />
           <SettingsInput label="Country" value={user?.country} onChange={v => setUser({ ...user!, country: v })} />
           <SettingsInput label="State" value={user?.state} onChange={v => setUser({ ...user!, state: v })} />
           <SettingsInput label="City" value={user?.city} onChange={v => setUser({ ...user!, city: v })} />
        </div>
      </div>

      {/* Category 3: Communication & Vibe */}
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-emerald-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-emerald-500/30" /> Communication & Skills
        </h4>
        <div className="grid grid-cols-1 gap-8">
           <SettingsMultiSelect 
             label="Languages you speak" 
             values={user?.languages || []} 
             options={["English", "Hindi", "Spanish", "French", "German", "Arabic", "Chinese"]} 
             onChange={v => setUser({ ...user!, languages: v })} 
           />
           <SettingsMultiSelect 
             label="Interests & Hobbies" 
             values={user?.interests || []} 
             options={["Gaming", "Music", "Movies", "Coding", "Travel", "Fitness", "Anime", "Art"]} 
             onChange={v => setUser({ ...user!, interests: v })} 
           />
           <SettingsSelect 
             label="Default Chat Mode" 
             value={user?.chatMode} 
             options={["text", "video", "both"]} 
             onChange={v => setUser({ ...user!, chatMode: v as any })} 
           />
        </div>
      </div>

      {/* Category 4: Deep Match Preferences */}
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-sky-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-sky-500/30" /> Matching Intelligence
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <SettingsSelect 
             label="Preferred Stranger Gender" 
             value={user?.preferredGender} 
             options={["male", "female", "other", "any"]} 
             onChange={v => setUser({ ...user!, preferredGender: v as any })} 
           />
           <SettingsInput label="Stranger's Language" value={user?.preferredLanguage} onChange={v => setUser({ ...user!, preferredLanguage: v })} />
           <SettingsSelect 
             label="Discovery Region" 
             value={user?.regionPreference} 
             options={["same_country", "global"]} 
             onChange={v => setUser({ ...user!, regionPreference: v as any })} 
           />
           <div className="flex flex-col gap-3">
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-500">Stranger's Age Range</span>
              <div className="flex items-center gap-4">
                 <input 
                   type="number" 
                   min="18" 
                   max="100" 
                   value={user?.preferredAgeRange?.min || 18} 
                   onChange={e => setUser({ ...user!, preferredAgeRange: { min: parseInt(e.target.value), max: user?.preferredAgeRange?.max || 35 }})}
                   className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" 
                 />
                 <span className="text-gray-500">to</span>
                 <input 
                   type="number" 
                   min="18" 
                   max="100" 
                   value={user?.preferredAgeRange?.max || 35} 
                   onChange={e => setUser({ ...user!, preferredAgeRange: { min: user?.preferredAgeRange?.min || 18, max: parseInt(e.target.value) }})}
                   className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white" 
                 />
              </div>
           </div>
        </div>
      </div>

      {/* Category 5: Profile Privacy */}
      <div className="space-y-6">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-orange-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-orange-500/30" /> Privacy Governance
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <SettingsToggle 
             label="Anonymous Mode" 
             description="Hide your profile during stranger chats" 
             enabled={!!user?.anonymousMode} 
             onToggle={() => setUser({ ...user!, anonymousMode: !user?.anonymousMode })} 
           />
           <SettingsToggle 
             label="Global Friend Requests" 
             description="Allow strangers to send you friendship requests" 
             enabled={!!user?.allowFriendRequests} 
             onToggle={() => setUser({ ...user!, allowFriendRequests: !user?.allowFriendRequests })} 
           />
        </div>
      </div>

      {/* Category 6: Account & Security */}
      <div className="space-y-6 pb-20">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-rose-500 flex items-center gap-2">
           <span className="w-8 h-[1px] bg-rose-500/30" /> Account & Security
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex flex-col gap-1">
             <span className="text-[10px] uppercase tracking-widest font-black text-gray-500">Registered Email</span>
             <span className="text-sm font-black text-white">{user?.email || "—"}</span>
           </div>
           
           <SettingsInput 
             label="Phone Number" 
             value={user?.phoneNumber} 
             onChange={v => setUser({ ...user!, phoneNumber: v })} 
           />
        </div>

        <div className="mt-12 p-8 rounded-[40px] bg-rose-500/5 border border-rose-500/10 space-y-6">
           <div>
             <h5 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-2">Danger Zone</h5>
             <p className="text-[11px] text-gray-500 font-bold leading-relaxed">
               Deleting your account is permanent. This will erase all your posts, reels, followers, and profile data. 
               You can re-register with the same credentials afterwards, but you will start as a completely new user.
             </p>
           </div>
           
           <button 
             onClick={handleDeleteAccount}
             className="w-full py-4 rounded-2xl bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 active:scale-95 shadow-xl shadow-rose-900/10 hover:shadow-rose-500/20"
           >
             Permanently Delete My Account
           </button>
        </div>
      </div>
    </div>
  </div>
)}

        <MobileVerificationModal 
          isOpen={showVerifyModal} 
          onClose={() => setShowVerifyModal(false)} 
          userId={user?._id || null} 
          onVerified={(updatedUser) => setUser(updatedUser)} 
        />

        <FeedUploadModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          userId={user?._id || ""}
          onSuccess={fetchPosts}
        />

        {/* Social List Modal */}
        {userListModal.open && (
          <div className="absolute inset-0 z-[60] bg-[#020617]/95 animate-in fade-in duration-300 flex flex-col">
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button onClick={() => setUserListModal({ ...userListModal, open: false })} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 className="text-xl font-black text-white px-2">
                    {userListModal.type.charAt(0).toUpperCase() + userListModal.type.slice(1)}
                  </h3>
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{userListModal.users.length} Users</span>
            </div>

            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
              {listLoading ? (
                <div className="flex items-center justify-center p-20">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-6">
                  {userListModal.users.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                      <p className="text-xs font-black uppercase tracking-widest">No users found</p>
                    </div>
                  ) : (
                    userListModal.users.map((u: any) => (
                      <div key={u._id} className="flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 p-0.5">
                               <img src={u.profilePicture || `https://ui-avatars.com/api/?name=${u.displayName}`} alt="" className="w-full h-full object-cover rounded-full" />
                            </div>
                            <div className="flex flex-col">
                               <span className="font-black text-sm text-white">@{u.displayName}</span>
                               <span className="text-[10px] text-gray-500 font-medium line-clamp-1">{u.bio || "No bio available"}</span>
                            </div>
                         </div>
                         <button 
                            className="p-2 rounded-lg bg-white/5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="View Profile"
                            onClick={() => {
                               // Since we are already in UserProfileView, we should ideally re-fetch for this user
                               // For now, let's just close this and the parent should update (handled in GlobalExplore)
                               onClose();
                            }}
                         >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                           </svg>
                         </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionBox({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-blue-400/80">{title}</h4>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

function InfoLine({ label, value, editable, onChange }: { label: string, value?: string, editable?: boolean, onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5 group">
      <span className="text-[9px] uppercase tracking-widest font-black text-gray-500 group-hover:text-blue-500/50 transition-colors">{label}</span>
      {editable && onChange ? (
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 focus:bg-[#020617] transition-all"
        />
      ) : (
        <p className="text-sm font-bold text-gray-200">{value || "—"}</p>
      )}
    </div>
  )
}

function RepStat({ label, value, color }: { label: string, value?: number, color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/5 rounded-2xl">
      <span className="text-[9px] uppercase font-black tracking-widest text-gray-500">{label}</span>
      <span className={`text-sm font-black ${color}`}>{value || 0}</span>
    </div>
  )
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-blue-500">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

function SettingsItem({ icon, label, value }: { icon: string, label: string, value: string }) {
  return (
    <div className="p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest font-black text-gray-500">{label}</span>
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
    </div>
  )
}

// Helper components for the redesigned settings
function SettingsInput({ label, value, onChange, type = "text" }: { label: string, value?: string, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-xl" placeholder="-" />
    </div>
  )
}

function SettingsTextarea({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">{label}</label>
      <textarea rows={3} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-xl resize-none" placeholder="-" />
    </div>
  )
}

function SettingsSelect({ label, value, options, onChange }: { label: string, value?: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">{label}</label>
      <select value={value || ""} onChange={e => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all shadow-xl appearance-none">
        <option value="">-</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  )
}

function SettingsMultiSelect({ label, values, options, onChange }: { label: string, values: string[], options: string[], onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
     if (values.includes(opt)) onChange(values.filter(v => v !== opt));
     else onChange([...values, opt]);
  }
  return (
    <div className="flex flex-col gap-3">
      <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button 
            key={opt} 
            onClick={() => toggle(opt)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${values.includes(opt) ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/5 text-gray-400 hover:text-white"}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function SettingsToggle({ label, description, enabled, onToggle }: { label: string, description: string, enabled: boolean, onToggle: () => void }) {
  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/[0.07] transition-all">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-widest font-black text-white">{label}</span>
        <span className="text-[10px] text-gray-500 font-bold">{description}</span>
      </div>
      <button onClick={onToggle} className={`relative w-14 h-7 rounded-full transition-all duration-500 flex items-center px-1 ${enabled ? "bg-blue-600" : "bg-white/10"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow-xl transition-all duration-500 transform ${enabled ? "translate-x-7" : "translate-x-0"}`} />
      </button>
    </div>
  )
}
