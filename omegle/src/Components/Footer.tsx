import React from "react"
import { useLanguage } from "@/lib/LanguageContext"

function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="w-full bg-[#0f172a] border-t border-white/10 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Left */}
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
        <p className="text-xs font-bold text-gray-400">
          © {new Date().getFullYear()} <span className="text-white">Stranger</span><span className="text-blue-500 italic">Chat</span>. All Rights Reserved.
        </p>
        <div className="hidden md:block w-px h-3 bg-white/10" />
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-black">
          Built for Global Connections
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6 text-[10px] uppercase tracking-widest font-black text-gray-500">
        <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
        <span className="cursor-pointer hover:text-white transition-colors">Terms of Service</span>
        <span className="cursor-pointer hover:text-white transition-colors">Help Center</span>
        <span className="cursor-pointer hover:text-white transition-colors text-blue-500">Community Guidelines</span>
      </div>
    </footer>
  )
}

export default Footer
