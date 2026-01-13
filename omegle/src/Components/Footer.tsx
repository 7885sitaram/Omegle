import React from "react"

function Footer() {
  return (
    <footer className="w-full bg-[#0f172a] border-t border-white/10 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-2">

      {/* Left */}
      <p className="text-xs text-gray-400">
        © {new Date().getFullYear()} StrangerChat. All rights reserved.
      </p>

      {/* Center */}
      <p className="text-xs text-gray-500">
        Anonymous • Secure • No Signup
      </p>

      {/* Right */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="cursor-pointer hover:text-white transition">Privacy</span>
        <span className="cursor-pointer hover:text-white transition">Terms</span>
        <span className="cursor-pointer hover:text-white transition">Help</span>
      </div>

    </footer>
  )
}

export default Footer
