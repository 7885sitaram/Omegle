"use client"

import React, { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"

interface SidebarProps {
  currentUserId: string | null
  onOpenProfile: () => void
  onOpenExplore: (tab: "posts" | "reels") => void
  onOpenNotifications: () => void
  onOpenCreate: () => void
  onOpenTruecaller: () => void
  unreadCount?: number
  forceCollapsed?: boolean
  activeOption?: string | null
}

export function Sidebar({ 
  currentUserId, 
  onOpenProfile, 
  onOpenExplore, 
  onOpenNotifications, 
  onOpenCreate,
  onOpenTruecaller,
  unreadCount = 0,
  forceCollapsed = false,
  activeOption = null
}: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isHovered, setIsHovered] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const navItems = [
    { 
      id: "home", 
      label: "Home", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
        </svg>
      ),
      action: () => router.push("/dashboard")
    },
    { 
      id: "posts", 
      label: "Posts", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
      action: () => onOpenExplore("posts")
    },
    { 
      id: "reels", 
      label: "Reels", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M10 8l6 4-6 4V8z" />
        </svg>
      ),
      action: () => onOpenExplore("reels")
    },
    {
      id: "phone",
      label: "Truecaller Search",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 015.06 2h3a2 2 0 012 1.72 12.81 12.81 0 00.63 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l2.27-2.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.63A2 2 0 0122 16.92z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      action: onOpenTruecaller
    },
    { 
      id: "messages", 
      label: "Direct Messages", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-12.7 8.38 8.38 0 013.8.9L21 3z" />
        </svg>
      ),
      action: () => router.push("/messages")
    },
    { 
      id: "notifications", 
      label: "Notifications", 
      icon: (
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.72-8.72 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
          )}
        </div>
      ),
      action: onOpenNotifications
    },
    { 
      id: "create", 
      label: "Create", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      action: onOpenCreate
    },
    { 
      id: "profile", 
      label: "Profile", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      action: onOpenProfile
    },
  ]

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("userId")
      window.localStorage.removeItem("profileCompleted")
    }
    try {
      await signOut({ redirect: false })
    } catch { /* ... */ }
    router.push("/")
  }

  if (!mounted) return null

  return (
    <>
      <div 
        onMouseEnter={() => !forceCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-14 h-[calc(100vh-56px)] hidden md:flex flex-col bg-black border-r border-white/10 z-[10000] transition-all duration-300 group
          ${(isHovered && !forceCollapsed) ? "w-[244px] px-3 py-6" : "w-[64px] items-center py-6"}`}
      >
        {/* Navigation Items */}
        <div className="flex-1 flex flex-col gap-1 w-full overflow-hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "notifications" || item.id === "phone") {
                   setIsHovered(false);
                }
                item.action();
              }}
              className={`flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-all text-gray-400 hover:text-white group relative
                ${(item.id === activeOption) ? "bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" : ""}
                ${(isHovered && !forceCollapsed) ? "w-full" : "w-12 justify-center"}`}
              title={(!isHovered || forceCollapsed) ? item.label : ""}
            >
              <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </div>
              {isHovered && !forceCollapsed && (
                <span className="text-sm font-bold tracking-wide animate-in fade-in slide-in-from-left-2 duration-300">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bottom Actions - Logout Restored */}
        <div className="mt-auto flex flex-col gap-1 w-full pb-6">
           <button 
             onClick={handleLogout}
             className={`flex items-center gap-4 p-3 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all font-bold
                ${isHovered ? "w-full" : "w-12 justify-center"}`}
           >
              <div className="flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              {isHovered && <span className="text-sm">Logout</span>}
           </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full h-16 md:hidden bg-black/80 backdrop-blur-xl border-t border-white/10 z-[10000] flex items-center justify-around px-1">
         {navItems.filter(i => ["home", "posts", "reels", "create", "messages", "profile"].includes(i.id)).map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className={`flex flex-col items-center justify-center min-w-[55px] h-full transition-all active:scale-90 ${activeOption === item.id ? "text-white" : "text-gray-400 hover:text-white"}`}
            >
              <div className={`flex-shrink-0 mb-0.5 ${item.id === "create" ? "scale-110 text-blue-500" : "scale-90"}`}>
                {item.icon}
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                {item.label}
              </span>
            </button>
         ))}
      </div>
    </>
  )
}
