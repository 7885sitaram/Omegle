"use client"

import { useEffect, useState } from "react"
import { FeedUploadModal } from "./FeedUploadModal"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

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
  languages?: string[]
  interests?: string[]
  preferredGender?: string
  preferredAgeRange?: { min?: number; max?: number }
  preferredLanguage?: string
  regionPreference?: string
  chatMode?: string
  anonymousMode?: boolean
  allowFriendRequests?: boolean
  isPrivate?: boolean
  friends?: string[]
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

  const isSelf = !!(
    typeof window !== "undefined" &&
    user &&
    window.localStorage.getItem("userId") === user._id
  )

  useEffect(() => {
    if (!open) return

    if (!userId && initialUser) {
      setUser(initialUser)
      return
    }

    if (!userId) return

    setLoading(true)
    setError(null)

    const requesterId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null

    fetch(`${API_BASE_URL}/users/${userId}?requesterId=${requesterId || ""}`)
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
  }, [userId, open, initialUser])

  const fetchPosts = async () => {
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/user/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Failed to fetch posts", err)
    }
  }

  useEffect(() => {
    if (open && userId) {
      fetchPosts()
    }
  }, [open, userId])

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col h-full max-h-[850px]">
        {/* Header Section */}
        <div className="px-8 md:px-16 pt-12 pb-8 border-b border-white/5 bg-gradient-to-b from-blue-500/5 to-transparent">
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center md:items-start text-center md:text-left">
            {/* Avatar */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 rounded-full animate-spin-slow opacity-20 blur-xl group-hover:opacity-40 transition-opacity" />
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-600 shadow-2xl relative z-10">
                <div className="w-full h-full rounded-full overflow-hidden bg-[#0f172a] border-4 border-[#0f172a] flex items-center justify-center">
                  {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-4xl font-black text-gray-500">{user?.displayName?.[0] || 'U'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <h2 className="text-2xl font-black tracking-tight text-white">
                  @{user?.displayName || 'anonymous'}
                </h2>
                {isSelf && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="px-6 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg"
                    >
                      {editMode ? "Cancel" : "Edit Profile"}
                    </button>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-6 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                      + Create
                    </button>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-gray-400 hover:text-white transition-all active:rotate-45"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
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
                <div className="text-center md:text-left">
                  <span className="block text-lg font-black text-white">{user?.friends?.length || 0}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Friends</span>
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
                    placeholder="Write your bio..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-gray-400 leading-relaxed font-medium">
                    {user?.bio || "Connect with new people and share vibes. ✨"}
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
          {loading && <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}

          {user && !loading && (
            <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <SectionBox title="Personal Details">
                    <InfoLine label="Full Name" value={user.fullName} editable={editMode} onChange={v => setUser({ ...user, fullName: v })} />
                    <InfoLine label="Country" value={user.country} editable={editMode} onChange={v => setUser({ ...user, country: v })} />
                    <InfoLine label="City" value={user.city} editable={editMode} onChange={v => setUser({ ...user, city: v })} />
                    <InfoLine label="Gender" value={user.gender} />
                  </SectionBox>
                  <SectionBox title="Location">
                    <InfoLine label="State" value={user.state} editable={editMode} onChange={v => setUser({ ...user, state: v })} />
                    <div className="mt-4 p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10 text-center">
                      <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs text-white">Live match seeker</p>
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

        {/* Settings Overlay */}
        {showSettings && (
          <div className="absolute inset-0 z-50 bg-[#020617]/95 animate-in slide-in-from-right-full duration-500 flex flex-col">
            <div className="p-8 border-b border-white/10 flex items-center gap-4">
              <button onClick={() => setShowSettings(false)} className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-xl font-black text-white px-2">Settings</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-12">
              <SettingsGroup title="Authentication & Identity">
                <SettingsItem icon="🔐" label="Auth Status" value="Verified Session" />
                <SettingsItem icon="📧" label="Registered Email" value={user?.email || "—"} />
                <SettingsItem icon="🛡️" label="Security" value="Login Activity" />
              </SettingsGroup>

              <SettingsGroup title="Privacy & Social">
                <SettingsItem icon="🔒" label="Privacy" value={user?.isPrivate ? "Private Account" : "Public Account"} />
                <SettingsItem icon="✨" label="Anonymous Mode" value={user?.anonymousMode ? "Active" : "Standard"} />
                <SettingsItem icon="👥" label="Friend Requests" value={user?.allowFriendRequests ? "Enabled" : "Disabled"} />
              </SettingsGroup>

              <SettingsGroup title="Social Media">
                <SettingsItem icon="✨" label="Anonymous Mode" value={user?.anonymousMode ? "Active" : "Standard"} />
              </SettingsGroup>
            </div>
          </div>
        )}

        <FeedUploadModal
          open={showUpload}
          onClose={() => setShowUpload(false)}
          userId={user?._id || ""}
          onSuccess={fetchPosts}
        />
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
