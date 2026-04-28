"use client"

import React, { useState } from "react"
import { toast } from "sonner"

interface TruecallerWidgetProps {
  onSearch: (query: string) => void
}

export function TruecallerWidget({ onSearch }: TruecallerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(query)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }
    onSearch(query)
    setIsOpen(false)
    setQuery("")
  }

  return (
    <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-[11000] flex flex-col items-end gap-3">
      {/* Search Popover */}
      {isOpen && (
        <div className="w-[300px] bg-black/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
           <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Mobile Search</span>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
           </div>
           <form onSubmit={handleSubmit} className="flex gap-2">
              <input 
                autoFocus
                type="tel"
                value={query}
                onChange={(e) => setQuery(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit number..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
              />
              <button 
                type="submit"
                className="aspect-square bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                   <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
           </form>
           <p className="text-[9px] text-gray-500 mt-2 font-medium">Truecaller-style identity lookup</p>
        </div>
      )}

      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl overflow-hidden group
          ${isOpen ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"}`}
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white animate-in zoom-in duration-300">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-transparent animate-pulse"></div>
             <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white drop-shadow-md z-10 group-hover:scale-110 transition-transform">
               <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 015.06 2h3a2 2 0 012 1.72 12.81 12.81 0 00.63 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l2.27-2.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.63A2 2 0 0122 16.92z" />
             </svg>
          </div>
        )}
      </button>
    </div>
  )
}
