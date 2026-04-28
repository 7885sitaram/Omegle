"use client"

import { SessionProvider } from "next-auth/react"
import { LanguageProvider } from "@/lib/LanguageContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>{children}</SessionProvider>
    </LanguageProvider>
  )
}

