"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { io, Socket } from "socket.io-client"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001"

interface Post {
  _id: string
  type: "post" | "reel"
  mediaUrl: string
  caption?: string
  userId: any
}

interface Message {
  _id: string
  sender: any
  receiver: string
  content: string
  sharedPost?: Post
  createdAt: string
}

interface Friend {
  _id: string
  displayName: string
  profilePicture?: string
}

export default function MessagesPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 1. Auth check
    const checkAuth = async () => {
      try {
        const storedUserId = localStorage.getItem("userId")
        
        if (!storedUserId) {
          router.push("/")
          return
        }

        const res = await fetch(`${API_BASE_URL}/users/${storedUserId}?requesterId=${storedUserId}`)
        if (res.ok) {
          const data = await res.json()
          setCurrentUser(data.user)
        } else {
          router.push("/")
        }
      } catch (err) {
        console.error("Auth check failed", err)
        router.push("/")
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (!currentUser) return

    // 2. Fetch friends
    const fetchFriends = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users/${currentUser._id}/friends`)
        if (res.ok) {
          const data = await res.json()
          setFriends(data.friends || [])
        }
      } catch (err) {
        console.error("Failed to fetch friends", err)
      }
    }
    fetchFriends()

    // 3. Connect to Socket for Private Messaging
    const newSocket = io(SOCKET_URL)
    setSocket(newSocket)

    newSocket.on("connect", () => {
      newSocket.emit("register_user", currentUser._id)
    })

    newSocket.on("receive_private_message", (data: Message) => {
      setMessages(prev => [...prev, data])
    })

    return () => {
      newSocket.disconnect()
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || !selectedFriend) return

    // Fetch message history
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${currentUser._id}?withUserId=${selectedFriend._id}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages || [])
        }
      } catch (err) {
        console.error("Failed to fetch messages", err)
      }
    }
    fetchMessages()
  }, [currentUser, selectedFriend])

  useEffect(() => {
    // Scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !currentUser || !selectedFriend || !socket) return

    const tempMsg = {
      _id: Date.now().toString(),
      sender: { _id: currentUser._id, displayName: currentUser.displayName },
      receiver: selectedFriend._id,
      content: inputText.trim(),
      createdAt: new Date().toISOString()
    }

    // Optimistic update
    setMessages(prev => [...prev, tempMsg as any])
    setInputText("")

    try {
      // Save to DB
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: currentUser._id,
          receiver: selectedFriend._id,
          content: tempMsg.content
        })
      })

      if (res.ok) {
        const { data } = await res.json()
        // Emit via socket
        socket.emit("send_private_message", data)
      }
    } catch (err) {
      console.error("Failed to send message", err)
    }
  }

  if (!currentUser) return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col md:flex-row">
      {/* Sidebar - Friends List */}
      <div className={`w-full md:w-[350px] border-r border-white/10 flex flex-col h-screen ${selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black font-serif italic text-white">{currentUser.displayName}</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Messages</p>
        </div>
        
        <div className="flex-1 overflow-y-auto hidden-scrollbar p-2">
          {friends.length === 0 ? (
            <div className="text-center text-gray-500 p-8 mt-10">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
               </svg>
               <p className="text-sm font-semibold">No friends found</p>
               <p className="text-xs mt-1">Follow users to start chatting</p>
            </div>
          ) : (
            friends.map(friend => (
              <div 
                key={friend._id} 
                onClick={() => setSelectedFriend(friend)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all ${selectedFriend?._id === friend._id ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}
              >
                <div className="w-14 h-14 rounded-full border-2 border-transparent hover:border-blue-500 overflow-hidden shrink-0">
                  <img src={friend.profilePicture || `https://ui-avatars.com/api/?name=${friend.displayName}`} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-md text-white">{friend.displayName}</h3>
                  <p className="text-xs text-gray-400 truncate">Tap to chat and share</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-screen bg-[#0f172a] ${!selectedFriend ? 'hidden md:flex' : 'flex'}`}>
        {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
             <div className="w-24 h-24 mb-6 rounded-full border-2 border-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
             </div>
             <h2 className="text-xl text-white font-black tracking-wide">Your Messages</h2>
             <p className="text-sm font-medium mt-2">Send private photos and messages to a friend.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 bg-[#0f172a] flex items-center gap-4 shadow-sm z-10">
              <button 
                className="md:hidden text-white hover:text-gray-300"
                onClick={() => setSelectedFriend(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div 
                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer shrink-0"
                onClick={() => router.push(`/profile/${selectedFriend._id}`)}
              >
                <img src={selectedFriend.profilePicture || `https://ui-avatars.com/api/?name=${selectedFriend.displayName}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 
                  onClick={() => router.push(`/profile/${selectedFriend._id}`)}
                  className="font-bold text-white cursor-pointer hover:underline"
                >
                  {selectedFriend.displayName}
                </h2>
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Active</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 hidden-scrollbar">
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 mb-4">
                  <img src={selectedFriend.profilePicture || `https://ui-avatars.com/api/?name=${selectedFriend.displayName}`} alt="" className="w-full h-full object-cover" />
                </div>
                <h1 className="text-xl font-bold text-white">{selectedFriend.displayName}</h1>
                <p className="text-sm text-gray-400 mt-1">You're friends on Instagram</p>
                <button 
                  onClick={() => router.push(`/profile/${selectedFriend._id}`)}
                  className="mt-4 px-4 py-1.5 bg-white/10 rounded-lg text-sm font-bold hover:bg-white/20 transition-all"
                >
                  View Profile
                </button>
              </div>

              {messages.map((msg, idx) => {
                const isMine = msg.sender._id === currentUser._id || msg.sender === currentUser._id
                
                return (
                  <div key={msg._id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className="flex gap-2 max-w-[70%] text-[15px]">
                      {!isMine && (
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-auto">
                           <img src={msg.sender.profilePicture || `https://ui-avatars.com/api/?name=${msg.sender.displayName}`} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {/* If it's a shared post */}
                        {msg.sharedPost && (
                          <div className={`p-2 rounded-2xl ${isMine ? 'bg-blue-600/20 rounded-br-none border border-blue-500/30' : 'bg-white/5 rounded-bl-none border border-white/10'} shadow-sm`}>
                             <p className="text-xs font-bold text-gray-300 mb-2 px-1">Shared a Post</p>
                             <div className="w-48 h-48 md:w-60 md:h-60 bg-black rounded-xl overflow-hidden cursor-pointer shadow-lg" onClick={() => router.push(`/profile/${selectedFriend._id}` /* can update to post modal mapping later */)}>
                                {msg.sharedPost.type === 'post' ? (
                                  <img src={msg.sharedPost.mediaUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <video src={msg.sharedPost.mediaUrl} className="w-full h-full object-cover" />
                                )}
                             </div>
                          </div>
                        )}
                        
                        {/* If text exists */}
                        {msg.content && (
                          <div className={`px-4 py-2.5 rounded-2xl ${isMine ? 'bg-gradient-to-tr from-blue-600 to-blue-500 text-white rounded-br-none shadow-md shadow-blue-500/20' : 'bg-[#1e293b] text-white rounded-bl-none border border-white/5'}`}>
                            {msg.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-[#0f172a] border-t border-white/5">
              <form 
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 bg-[#1e293b] border border-white/10 px-4 py-1.5 rounded-full shadow-inner"
              >
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full cursor-pointer hover:bg-blue-500/20 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                   </svg>
                </div>
                <input 
                  type="text" 
                  placeholder="Message..." 
                  className="flex-1 bg-transparent text-white outline-none px-2 py-2 placeholder-gray-500 text-sm md:text-md"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                {inputText.trim() && (
                  <button type="submit" className="text-blue-500 font-bold hover:text-blue-400 px-3 py-2 text-sm transition-colors">
                    Send
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
