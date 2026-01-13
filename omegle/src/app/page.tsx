"use client"

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import Video from "@/Components/Video";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_URL!, {

  transports: ["websocket"]
})
export default function Home() {

  const [status, setStatus] = useState("ideal")
  const [roomId, setRoomId] = useState("")
  const startChat = () => {
    socket.emit("start")
    setStatus("waiting")
  }

  const Next = () => {
    socket.emit("next")
    window.location.reload()
  }

  useEffect(() => {
    socket.on("matched", ({ roomId }) => {
      setRoomId(roomId)
      setStatus("chatting")

    })
    return () => { socket.off("matched") }

  }, [])

  useEffect(() => {
    socket.on("waiting", () => {
      setStatus("waiting")
    })

    socket.on("partner_left", () => {
      setStatus("ideal")
      setRoomId("")
    })

    return () => {
      socket.off()
    }
  }, [])



  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">

        {/* Heading Section */}
        <div className="max-w-xl text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wide">
            Stranger<span className="text-blue-400">Chat</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Talk to strangers anonymously. No signup. Just connect.
          </p>
        </div>

        {/* Ideal State */}
        {status === "ideal" && (
          <button
            onClick={startChat}
            className="px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-600 transition font-semibold shadow-lg"
          >
            Start Chat
          </button>
        )}

        {/* Waiting State */}
        {status === "waiting" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">
              Looking for a stranger...
            </p>
          </div>
        )}

        {/* Chatting State */}
        {status === "chatting" && roomId && (
          <div className="w-full max-w-5xl mt-6 flex flex-col items-center">

            {/* Video Container */}
            <div className="w-full h-[60vh]  rounded-xl overflow-hidden shadow-xl">
              <Video roomId={roomId} />
            </div>

            {/* Controls */}
            <button
              onClick={Next}
              className="mt-6 px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 transition font-semibold"
            >
              Next
            </button>

          </div>
        )}

      </main>

      {/* Footer */}
      <Footer />
    </div>

  );
}
