import React from "react"
import { useLanguage } from "@/lib/LanguageContext"

function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="w-full bg-[#0f172a] border-t border-white/10 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-2">

      {/* Left */}
      <p className="text-xs text-gray-400">
        © {new Date().getFullYear()} {t("nav.logo_stranger")}{t("nav.logo_chat")}. {t("footer.rights")}
      </p>

      {/* Center */}
      <p className="text-xs text-gray-500">
        {t("footer.tagline")}
      </p>

      {/* Right */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="cursor-pointer hover:text-white transition">{t("footer.privacy")}</span>
        <span className="cursor-pointer hover:text-white transition">{t("footer.terms")}</span>
        <span className="cursor-pointer hover:text-white transition">{t("footer.help")}</span>
      </div>

    </footer>
  )
}

export default Footer
