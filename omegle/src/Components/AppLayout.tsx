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

      <div className="flex flex-1 pt-14 relative z-[100]">
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
        <main className="flex-1 md:ml-[64px] transition-all duration-300 pb-20 md:pb-0 overflow-y-auto px-0 md:px-0">
          {children}
        </main>
      </div>

      {/* Persistent Widgets REMOVED: Managed by Sidebar action now */}

      {/* Click-away Overlay for Pop-overs */}
      {(showNotifications || showTruecallerResults) && (
        <div 
          className="fixed inset-0 z-[19000] bg-black/5 md:bg-transparent" 
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
        <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 p-4">
           <div className="w-full max-w-[340px] md:max-w-md bg-[#0f172a] border border-white/10 rounded-[24px] p-5 md:p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4 md:mb-5">
                 <h3 className="text-sm font-bold text-white tracking-tight">Search Results</h3>
                 <button onClick={() => setSearchOverlayOpen(false)} className="p-1 text-gray-400 hover:text-white transition">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                       <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                 </button>
              </div>
              {/* Simple results list */}
              <div className="space-y-2 max-h-[300px] md:max-h-80 overflow-y-auto scrollbar-none">
                 {searchLoading && (
                   <div className="py-10 flex flex-col items-center gap-3">
                     <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                     <p className="text-[10px] uppercase font-black tracking-widest text-gray-500">Searching...</p>
                   </div>
                 )}
                 {searchError && <p className="text-center py-10 text-[10px] uppercase font-black tracking-widest text-red-400">{searchError}</p>}
                 {!searchLoading && searchResults.length === 0 && !searchError && (
                    <p className="text-center py-10 text-[10px] uppercase font-black tracking-widest text-gray-500">No matches found</p>
                 )}
                 {searchResults.map(u => (
                    <div key={u._id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-[10px] font-black uppercase">
                            {u.displayName?.charAt(0)}
                         </div>
                         <span className="text-xs md:text-sm font-bold text-white">{u.displayName}</span>
                       </div>
                        <button 
                          onClick={() => { setViewUserId(u._id); setShowProfile(true); setSearchOverlayOpen(false); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-all"
                        >
                          View
                        </button>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {/* Global Notifications Pop-over - Responsive Alignment */}
      {showNotifications && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="fixed left-4 right-4 md:left-16 md:right-auto top-1/2 -translate-y-1/2 md:translate-y-0 md:top-[330px] md:w-80 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[24px] shadow-2xl p-5 md:p-6 z-[20001] animate-in fade-in zoom-in-95 md:slide-in-from-left-4 duration-300"
        >
           {/* Arrow connecting to Sidebar icon (Desktop only) */}
           <div className="absolute left-[-6px] top-[15px] w-3 h-3 bg-[#0f172a] rotate-45 border-l border-t border-white/10 hidden md:block" />

           <div className="flex items-center justify-between mb-4 relative">
              <h3 className="text-sm font-bold text-white tracking-tight">Recent Notifications</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} 
                className="text-gray-400 hover:text-white transition p-1"
              >
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <path d="M18 6L6 18M6 6l12 12" />
                 </svg>
              </button>
           </div>
           <div className="text-gray-500 text-[10px] uppercase font-black tracking-widest italic text-center py-12 border border-white/5 rounded-2xl bg-white/5">
              You're all caught up!
           </div>
        </div>
      )}
    </div>
  )
}
