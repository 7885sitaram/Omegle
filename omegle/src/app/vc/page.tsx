"use client"

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import Video from "@/Components/Video";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const socket = io(process.env.NEXT_PUBLIC_URL!, {
  transports: ["websocket"],
});

export default function VCPage() {
  const { status } = useSession();
  const router = useRouter();

  const [statusChat, setStatusChat] = useState("ideal");
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
    if (status === "unauthenticated" && !userId) {
      router.replace("/");
    }
  }, [status, router]);

  const startChat = () => {
    socket.emit("start");
    setStatusChat("waiting");
  };

  const Next = () => {
    socket.emit("next");
    window.location.reload();
  };

  useEffect(() => {
    socket.on("matched", ({ roomId }) => {
      setRoomId(roomId);
      setStatusChat("chatting");
    });
    return () => {
      socket.off("matched");
    };
  }, []);

  useEffect(() => {
    socket.on("waiting", () => {
      setStatusChat("waiting");
    });

    socket.on("partner_left", () => {
      setStatusChat("ideal");
      setRoomId("");
    });

    return () => {
      socket.off();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-wide">
            Stranger<span className="text-blue-400">Cam</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Talk to strangers via video. No signup. Just connect.
          </p>
        </div>

        {statusChat === "ideal" && (
          <button
            onClick={startChat}
            className="px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-600 transition font-semibold shadow-lg"
          >
            Start Video Chat
          </button>
        )}

        {statusChat === "waiting" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-400">
              Looking for a stranger...
            </p>
          </div>
        )}

        {statusChat === "chatting" && roomId && (
          <div className="w-full max-w-5xl mt-6 flex flex-col items-center">
            <div className="w-full h-[60vh]  rounded-xl overflow-hidden shadow-xl">
              <Video roomId={roomId} />
            </div>

            <button
              onClick={Next}
              className="mt-6 px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 transition font-semibold"
            >
              Next
            </button>
          </div>
        )}
      </main>

      <div className="flex justify-center mb-8">
        <Link
          href="/dashboard"
          className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-full transition font-semibold border border-gray-600 flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Return Home
        </Link>
      </div>

      <Footer />
    </div>
  );
}

