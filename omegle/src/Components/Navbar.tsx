"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

interface NavbarProps {
  centerContent?: React.ReactNode
  showProfile?: boolean
  onOpenProfile?: () => void
}

function Navbar({ centerContent, showProfile, onOpenProfile }: NavbarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("userId")
      window.localStorage.removeItem("profileCompleted")
    }
    try {
      await signOut({ redirect: false })
    } catch {
      // ignore if next-auth not active
    }
    router.push("/")
  }


  const [notificationsOpen, setNotificationsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [userId, setUserId] = React.useState<string | null>(null)
  const [userProfile, setUserProfile] = React.useState<{
    displayName?: string
    profilePicture?: string
  } | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("userId")
      setUserId(id)
    }
  }, [])

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}?requesterId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setUserProfile(data.user)
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err)
      }
    }
    fetchUserProfile()
  }, [userId, API_BASE_URL])

  const fetchNotifications = React.useCallback(async () => {
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/friend-requests`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.requests || [])
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err)
    }
  }, [userId, API_BASE_URL])

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleRequestAction = async (requestId: string, status: "accepted" | "rejected") => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}/friend-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n._id !== requestId))
      }
    } catch (err) {
      console.error(`Failed to ${status} request`, err)
    }
  }

  return (
    <nav className="w-full h-14 bg-[#0f172a] border-b border-white/10 flex items-center px-6 sticky top-0 z-50">
      {/* Left : Logo */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <h1 className="text-white font-semibold text-lg tracking-wide">
          Stranger<span className="text-blue-400">Chat</span>
        </h1>
      </div>

      {/* Center */}
      <div className="flex-1 flex justify-center">
        {centerContent ? (
          centerContent
        ) : (
          <div className="flex items-center gap-2 overflow-hidden px-4 py-1.5 rounded-full bg-white/5 border border-white/5 max-w-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">
               Connect with the world
            </p>
          </div>
        )}
      </div>

      {/* Right : Notifications + Profile + Logout */}
      <div className="flex items-center gap-4">
        {userId && (
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition relative"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0f172a]"></span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-3 border-b border-white/10 bg-[#334155]/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">Friend Requests</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 text-sm italic">
                      No pending requests
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id} className="p-4 border-b border-white/5 hover:bg-white/5 transition group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border border-white/10">
                            {n.from.profilePicture ? (
                              <img src={n.from.profilePicture} alt="User" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-gray-400 capitalize">{n.from.displayName?.[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white tracking-tight">{n.from.displayName}</p>
                            <p className="text-[10px] text-gray-400">wants to be your friend</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequestAction(n._id, "accepted")}
                            className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition shadow-lg shadow-blue-600/20"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRequestAction(n._id, "rejected")}
                            className="flex-1 py-1.5 rounded-lg bg-[#334155] hover:bg-[#475569] text-gray-300 text-[10px] font-bold transition"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {showProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-[#1e293b]/40 hover:bg-[#1e293b]/60 border border-white/5 hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-[#0f172a] group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-300">
              {userProfile?.profilePicture ? (
                <img src={userProfile.profilePicture} alt="Avatar" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-black uppercase">
                  {userProfile?.displayName ? userProfile.displayName[0] : "U"}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start leading-tight pr-1">
              <span className="text-[12px] font-bold text-gray-100 group-hover:text-white transition-colors">
                {userProfile?.displayName || "Loading..."}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                <span className="text-[10px] text-emerald-400 font-bold tracking-tight uppercase opacity-80">Online</span>
              </div>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="px-5 py-2 rounded-2xl bg-red-500/5 hover:bg-red-500 text-[11px] font-black uppercase tracking-widest text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all duration-500 shadow-lg shadow-red-500/5 hover:shadow-red-500/20 active:scale-95"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
