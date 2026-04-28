"use client"

import { useEffect } from "react"
import { io } from "socket.io-client"
import { toast } from "sonner"

export function GlobalNotifications() {
  useEffect(() => {
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null
    if (!userId) return

    const socket = io(process.env.NEXT_PUBLIC_URL || "http://localhost:4001", {
      transports: ["websocket"]
    })

    socket.on("connect", () => {
      socket.emit("register_user", userId)
    })

    socket.on("friend_request_received", (data: { senderName: string }) => {
      toast.info(`New Friend Request from ${data.senderName}`, {
        description: "Check your profile to accept.",
        action: {
          label: "View",
          onClick: () => (window.location.href = "/profile")
        }
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  return null
}
