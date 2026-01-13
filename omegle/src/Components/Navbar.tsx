import React from "react"

function Navbar() {
  return (
    <nav className="w-full h-14 bg-[#0f172a] border-b border-white/10 flex items-center px-6">
      
      {/* Left : Logo */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        <h1 className="text-white font-semibold text-lg tracking-wide">
          Stranger<span className="text-blue-400">Chat</span>
        </h1>
      </div>

      {/* Center : Title */}
      <div className="flex-1 text-center">
        <p className="text-sm text-gray-400">
          Talk to strangers anonymously
        </p>
      </div>

      {/* Right : Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Online</span>
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
      </div>

    </nav>
  )
}

export default Navbar
