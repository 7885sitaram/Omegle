"use client"

import React, { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import { GlobalExplore } from "./GlobalExplore"
import { UserProfileView } from "./UserProfileView"
import { GlobalNotifications } from "./GlobalNotifications"
import { TruecallerWidget } from "./TruecallerWidget"
import { toast } from "sonner"
import { PhoneSearchPopup } from "./PhoneSearchPopup"
import { ProfileOnboardingOverlay } from "./ProfileOnboardingOverlay"
import { useSearchParams } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [showExplore, setShowExplore] = useState(false)
  const [exploreTab, setExploreTab] = useState<"posts" | "reels">("posts")
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showTruecallerResults, setShowTruecallerResults] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [truecallerSearchQuery, setTruecallerSearchQuery] = useState("")
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null)
  const [checkingProfile, setCheckingProfile] = useState(true)

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const setupFlag = searchParams.get("setup")
  const forceOpen = setupFlag === "1"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("userId")
      if (id && id !== "undefined" && id !== "null") {
        setCurrentUserId(id)
        // FAST CHECK: check profile status globally
        const checkStatus = async () => {
          try {
            if (!id || id === "undefined" || id === "null") {
               setCheckingProfile(false);
               return;
            }
            const res = await fetch(`${API_BASE_URL}/users/${id}?requesterId=${id}`)
            if (res.ok) {
              const data = await res.json()
              const completed = !!data.user?.isProfileCompleted
              setProfileCompleted(completed)
              if (completed) {
                window.localStorage.setItem("profileCompleted", "true")
              }
            } else {
              const cached = window.localStorage.getItem("profileCompleted")
              setProfileCompleted(cached === "true")
            }
          } catch (err) {
            const cached = window.localStorage.getItem("profileCompleted")
            setProfileCompleted(cached === "true")
          } finally {
            setCheckingProfile(false)
          }
        }
        checkStatus()
      } else {
        setCurrentUserId(null)
        setCheckingProfile(false)
      }
    }
  }, [pathname])

  // Auto-close any active modal/overlay when the pathname changes
  useEffect(() => {
    setShowExplore(false)
    setShowProfile(false)
    setShowNotifications(false)
    setSearchOverlayOpen(false)
  }, [pathname])

  if (pathname === "/") return <>{children}</>

  const handleOpenExplore = (tab: "posts" | "reels") => {
    setExploreTab(tab)
    setShowExplore(true)
  }

  const handleTruecallerSearch = (query: string) => {
    setTruecallerSearchQuery(query)
    setShowTruecallerResults(true)
  }

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearchError(null)
    setSearchLoading(true)
    setSearchResults([])
    setSearchOverlayOpen(true)

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/search?q=${encodeURIComponent(q)}&requesterId=${currentUserId || ""}`
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "No users found")
      setSearchResults(data.users || [])
    } catch (err: any) {
      setSearchError(err.message || "No users found")
    } finally {
      setSearchLoading(false)
    }
  }

  const globalSearchContent = (
    <form onSubmit={handleGlobalSearch} className="w-full max-w-lg flex items-center gap-2 group">
      <div className="flex-1 relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-all duration-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search strangers..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
        />
      </div>
    </form>
  )

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      <GlobalNotifications />
      
      {/* Top Header: Full Width */}
      <Navbar 
        onOpenProfile={() => { 
          const rawId = currentUserId || (typeof window !== "undefined" ? window.localStorage.getItem("userId") : null);
          const id = (rawId && rawId !== "undefined" && rawId !== "null") ? rawId : null;
          if (id) setCurrentUserId(id);
          setViewUserId(id); 
          setShowProfile(true); 
        }}
        showProfile={true}
        centerContent={pathname === "/dashboard" ? globalSearchContent : null}
      />

      <div className="flex flex-1 pt-14">
        {/* Side Navigation: Below Header */}
        <Sidebar 
          currentUserId={currentUserId}
          onOpenProfile={() => { 
            const rawId = currentUserId || (typeof window !== "undefined" ? window.localStorage.getItem("userId") : null);
            const id = (rawId && rawId !== "undefined" && rawId !== "null") ? rawId : null;
            if (id) setCurrentUserId(id);
            setViewUserId(id); 
            setShowProfile(true); 
          }}
          onOpenExplore={handleOpenExplore}
          onOpenNotifications={() => setShowNotifications(!showNotifications)}
          onOpenCreate={() => toast.info("Feed Upload feature coming soon!")}
          onOpenTruecaller={() => setShowTruecallerResults(true)}
          forceCollapsed={showNotifications || showTruecallerResults}
          activeOption={showNotifications ? 'notifications' : showTruecallerResults ? 'phone' : null}
        />

        {/* Main Content Area */}
        <main className="flex-1 md:ml-[64px] transition-all duration-300 pb-20 md:pb-0 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Persistent Widgets REMOVED: Managed by Sidebar action now */}

      {/* Click-away Overlay for Pop-overs */}
      {(showNotifications || showTruecallerResults) && (
        <div 
          className="fixed inset-0 z-[10000] bg-black/5" 
          onClick={() => {
            setShowNotifications(false);
            setShowTruecallerResults(false);
          }}
        />
      )}

      {/* Global Modals */}
      <GlobalExplore 
        open={showExplore} 
        onClose={() => setShowExplore(false)} 
        currentUserId={currentUserId}
        initialTab={exploreTab}
      />
      
      <UserProfileView 
        open={showProfile} 
        onClose={() => setShowProfile(false)} 
        userId={viewUserId} 
      />

      <PhoneSearchPopup 
         initialPhone={truecallerSearchQuery}
         isOpen={showTruecallerResults}
         onClose={() => setShowTruecallerResults(false)}
      />

      {currentUserId && profileCompleted === false && !checkingProfile && pathname !== "/" && (
        <ProfileOnboardingOverlay
          forceOpen={forceOpen}
          onComplete={() => setProfileCompleted(true)}
        />
      )}

      {/* Global Search Overlay */}
      {searchOverlayOpen && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="w-full max-w-md mx-4 bg-[#0f172a] border border-white/10 rounded-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-white">Search Results</h3>
                 <button onClick={() => setSearchOverlayOpen(false)} className="text-gray-400 hover:text-white transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                       <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                 </button>
              </div>
              {/* Simple results list */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                 {searchLoading && <p className="text-xs text-gray-500">Searching...</p>}
                 {searchError && <p className="text-xs text-red-400">{searchError}</p>}
                 {searchResults.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                       <span className="text-sm font-bold">{u.displayName}</span>
                        <button 
                          onClick={() => { setViewUserId(u._id); setShowProfile(true); setSearchOverlayOpen(false); }}
                          className="text-[10px] uppercase font-black text-blue-500 hover:underline"
                        >
                          View
                        </button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Global Notifications Pop-over - Aligned with Sidebar icon (6th item) */}
      {showNotifications && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed left-0 md:left-16 top-[330px] w-[90vw] md:w-80 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 z-[10001] animate-in slide-in-from-left-4 duration-300"
        >
           {/* Arrow connecting to Sidebar icon */}
           <div className="absolute left-[-6px] top-[15px] w-3 h-3 bg-[#0f172a] rotate-45 border-l border-t border-white/10 hidden md:block" />

           <div className="flex items-center justify-between mb-3 relative">
              <h3 className="text-sm font-bold text-white">Recent Notifications</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                className="text-gray-400 hover:text-white transition p-1"
              >
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                 </svg>
              </button>
           </div>
           <div className="text-gray-500 text-xs italic text-center py-10 border border-white/5 rounded-xl bg-white/5">
              You're all caught up!
           </div>
        </div>
      )}
    </div>
  )
}
