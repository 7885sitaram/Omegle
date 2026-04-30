"use client"

import React, { useState, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { UserProfileView } from "./UserProfileView"
import { io, Socket } from "socket.io-client"

interface PhoneSearchPopupProps {
  isOpen?: boolean
  onClose?: () => void
  initialPhone?: string
}

export function PhoneSearchPopup({ 
  isOpen: externalOpen, 
  onClose: externalClose, 
  initialPhone = "" 
}: PhoneSearchPopupProps) {
  const pathname = usePathname()
  const [internalOpen, setInternalOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(initialPhone)
  
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen
  const setIsOpen = (val: boolean) => {
    if (externalClose && !val) externalClose()
    setInternalOpen(val)
  }

  useEffect(() => {
    if (initialPhone) setPhoneNumber(initialPhone)
  }, [initialPhone])
  const [searchResult, setSearchResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState("")
  
  // Profile View States
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showProfileView, setShowProfileView] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
  const SOCKET_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:4001"

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = window.localStorage.getItem("userId")
      setUserId(storedId)
      
      if (storedId) {
        socketRef.current = io(SOCKET_URL, { transports: ["websocket"] })
        socketRef.current.emit("register_user", storedId)
      }
    }
    
    return () => {
       socketRef.current?.disconnect()
    }
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber.trim()) return
    
    if (!/^\d{10}$/.test(phoneNumber)) {
      toast.warning("Please enter a valid 10-digit mobile number")
      return
    }

    setLoading(true)
    setError("")
    setSearchResult(null)

    try {
      const resp = await fetch(`${API_BASE_URL}/users/search-by-phone?phone=${encodeURIComponent(phoneNumber)}&requesterId=${userId}`)
      const data = await resp.json()

      if (resp.ok) {
        setSearchResult(data.user)
      } else {
        setError(data.message || "User not found")
        toast.error(data.message || "No user found with this number")
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search")
      toast.error("An error occurred during search")
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async (targetId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation() // Prevent opening profile when clicking add button
    
    if (!userId) {
      toast.warning("Please login first")
      return
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/users/${targetId}/friend-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: userId })
      })

      if (resp.ok) {
        toast.success("Friend request sent!")
        setSearchResult({ ...searchResult, isRequested: true })
        
        // Emit socket notification
        socketRef.current?.emit("friend_request", {
           senderId: userId,
           targetId: targetId,
           senderName: "Someone" // Fallback name
        })
      } else {
        const data = await resp.json()
        toast.error(data.message || "Failed to send request")
      }
    } catch (err) {
      console.error("Add friend error:", err)
      toast.error("Failed to send request")
    }
  }

  const openUserProfile = (id: string) => {
    setSelectedUserId(id)
    setShowProfileView(true)
  }

  if (pathname === "/") return null;

  return (
    <>
      <div className="fixed inset-0 z-[28000] pointer-events-none flex items-center justify-center p-4">
        {/* Search Card */}
        {isOpen && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] md:max-w-xs md:fixed md:left-16 md:top-[214px] bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto transform transition-all duration-300 animate-in fade-in zoom-in-95 md:slide-in-from-left-4 z-[10001]"
          >
            {/* Arrow connecting to Sidebar icon (4th item) */}
            <div className="absolute left-[-6px] top-[18px] w-3 h-3 bg-blue-600 rotate-45 hidden md:block shadow-[-1px_-1px_0_rgba(255,255,255,0.1)]" />

            <div className="bg-blue-600 p-4 flex items-center justify-between relative">
              <div className="flex items-center gap-2 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <h3 className="font-semibold">Phone Search</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 p-1 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 bg-slate-50/50">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Enter 10-digit number..."
                  value={phoneNumber}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPhoneNumber(val);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bottom-2 aspect-square bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-all"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </button>
              </form>

              <div className="mt-4 min-h-[100px] flex flex-col items-center justify-center">
                {searchResult ? (
                  <div 
                    onClick={() => openUserProfile(searchResult._id)}
                    className="w-full bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 cursor-pointer hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                      {searchResult.profilePicture ? (
                        <img src={searchResult.profilePicture} alt={searchResult.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-lg">
                          {searchResult.displayName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 truncate">{searchResult.displayName}</h4>
                        {searchResult.reputation?.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                            searchResult.reputation.badge === "Trusted User" 
                            ? "bg-green-100 text-green-600" 
                            : searchResult.reputation.badge === "Risky"
                            ? "bg-red-100 text-red-600"
                            : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {searchResult.reputation.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex text-yellow-400 text-[10px]">
                          {"★".repeat(Math.max(0, Math.min(5, Math.ceil((searchResult.reputation?.score || 0) / 10) + 2)))}
                          {"☆".repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Math.ceil((searchResult.reputation?.score || 0) / 10) + 2))))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">({searchResult.reputation?.score || 0})</span>
                      </div>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5 italic">{searchResult.reputation?.status || "Analyzing behavior..."}</p>
                    </div>
                    {!searchResult.isFriend && (
                      <button
                        onClick={(e) => !searchResult.isRequested && handleAddFriend(searchResult._id, e)}
                        disabled={searchResult.isRequested}
                        className={`p-2 rounded-lg transition-all ${
                          searchResult.isRequested 
                          ? "bg-emerald-50 text-emerald-600 cursor-default" 
                          : "bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        }`}
                      >
                        {searchResult.isRequested ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ) : error ? (
                  <div className="text-center">
                    <div className="h-10 w-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm text-slate-500">{error}</p>
                  </div>
                ) : (
                  <div className="text-center opacity-40">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">Search by mobile number</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <UserProfileView
        open={showProfileView}
        onClose={() => setShowProfileView(false)}
        userId={selectedUserId}
      />
    </>
  )
}
