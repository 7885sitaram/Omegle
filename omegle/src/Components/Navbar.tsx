"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useLanguage } from "@/lib/LanguageContext"
import { LanguageSwitcher } from "./LanguageSwitcher"

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
  const [loading, setLoading] = React.useState(true)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("userId")
      setUserId(id)
    }
  }, [])

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE_URL}/users/${userId}?requesterId=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setUserProfile(data.user)
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err)
      } finally {
        setLoading(false)
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
    <nav className="w-full h-14 bg-[#0f172a] backdrop-blur-2xl border-b border-white/10 flex items-center px-3 md:px-8 fixed top-0 left-0 right-0 z-[10100]">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 md:gap-3 min-w-fit sm:min-w-[200px]">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20 active:scale-95 transition-transform cursor-pointer text-sm">S</div>
        <h1 className="text-white font-black text-lg md:text-xl tracking-tighter hidden xs:block sm:block">
          Stranger<span className="text-blue-500 italic">Chat</span>
        </h1>
      </div>

      {/* Center: Search Context - Hidden on very small screens or made compact */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto px-2 md:px-4 overflow-hidden">
        <div className="w-full max-w-full">
          {centerContent || (
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 opacity-40 whitespace-nowrap overflow-hidden">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></span>
               <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] truncate">Connecting Global Chat</p>
             </div>
          )}
        </div>
      </div>

      {/* Right: Profile Toggle Only */}
      <div className="flex items-center justify-end gap-2 md:gap-4 min-w-fit sm:min-w-[200px]">
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>

        {showProfile && (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 rounded-xl md:rounded-2xl bg-[#1e293b]/40 hover:bg-[#1e293b]/60 border border-white/5 hover:border-blue-500/30 transition-all duration-500 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg md:rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-[#0f172a] group-hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] transition-all duration-300">
              {userProfile?.profilePicture ? (
                <img src={userProfile.profilePicture} alt="Avatar" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[10px] md:text-xs font-black uppercase">
                  {userProfile?.displayName ? userProfile.displayName[0] : "U"}
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
              <span className="text-[11px] md:text-[12px] font-bold text-gray-100 group-hover:text-white transition-colors truncate max-w-[80px]">
                {loading ? "..." : (userProfile?.displayName || "anon")}
              </span>
              <div className="flex items-center gap-1">
                <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
                <span className="text-[8px] md:text-[10px] text-emerald-400 font-bold tracking-tight uppercase opacity-80">Online</span>
              </div>
            </div>
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navbar
