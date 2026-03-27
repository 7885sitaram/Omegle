"use client"

import { useEffect, useState } from "react"

interface Post {
  _id: string
  type: "post" | "reel"
  mediaUrl: string
  caption?: string
  likes: string[]
  views: number
  userId: {
    _id: string
    displayName: string
    profilePicture?: string
  }
}

interface GlobalExploreProps {
  open: boolean
  onClose: () => void
  currentUserId: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export function GlobalExplore({ open, onClose, currentUserId }: GlobalExploreProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts")

  const fetchGlobalFeed = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/global`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Failed to fetch global feed", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchGlobalFeed()
    }
  }, [open])

  const handleLike = async (postId: string) => {
    if (!currentUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      })
      if (res.ok) {
        const data = await res.json()
        setPosts(prev => prev.map(p => 
          p._id === postId ? { ...p, likes: data.isLiked ? [...p.likes, currentUserId] : p.likes.filter(id => id !== currentUserId) } : p
        ))
      }
    } catch (err) {
      console.error("Like toggle failed", err)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[11500] flex flex-col items-center bg-[#020617] animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-6xl px-8 py-6 flex items-center justify-between border-b border-white/5">
         <div className="flex flex-col">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <span className="bg-gradient-to-tr from-blue-500 to-purple-500 text-transparent bg-clip-text">Global Discovery</span>
              <span className="text-[10px] py-0.5 px-2 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 uppercase tracking-widest">Live</span>
            </h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Explore what the world is sharing</p>
         </div>
         <button onClick={onClose} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
         </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-[#0f172a] border border-white/5 rounded-2xl mt-8">
         <button 
           onClick={() => setActiveTab('posts')}
           className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'posts' ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"}`}
         >
           Latest Posts
         </button>
         <button 
           onClick={() => setActiveTab('reels')}
           className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'reels' ? "bg-purple-600 text-white shadow-xl shadow-purple-600/20" : "text-gray-500 hover:text-gray-300"}`}
         >
           Tending Reels
         </button>
      </div>

      {/* Grid Content */}
      <div className="flex-1 w-full max-w-6xl overflow-y-auto p-8 md:p-12 mt-4 scrollbar-hide">
         {loading ? (
            <div className="flex items-center justify-center h-full">
               <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
         ) : (
            <div className={`grid gap-6 ${activeTab === 'posts' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'}`}>
               {posts.filter(p => p.type === (activeTab === 'posts' ? 'post' : 'reel')).map(post => (
                  <div key={post._id} className={`group relative bg-[#0f172a] border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl transition-all hover:scale-[1.02] hover:border-blue-500/30 ${activeTab === 'reels' ? 'aspect-[9/16]' : 'aspect-square'}`}>
                     <div className="absolute inset-0 z-0">
                        {post.type === 'post' ? (
                          <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={post.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop />
                        )}
                     </div>

                     {/* Overlay */}
                     <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                        <div className="flex items-center gap-3 mb-3">
                           <div className="w-8 h-8 rounded-full border border-white/20 p-0.5 overflow-hidden">
                              <img src={post.userId.profilePicture || `https://ui-avatars.com/api/?name=${post.userId.displayName}`} alt="" className="w-full h-full rounded-full object-cover" />
                           </div>
                           <span className="text-sm font-bold text-white">@{post.userId.displayName}</span>
                        </div>
                        <p className="text-[11px] text-gray-300 font-medium line-clamp-2 mb-4">{post.caption || "No caption provided."}</p>
                        
                        <div className="flex items-center justify-between">
                            <button 
                              onClick={() => handleLike(post._id)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md transition-all active:scale-95 ${post.likes.includes(currentUserId || "") ? "bg-red-500/80 text-white" : "bg-white/5 text-gray-200 hover:bg-white/10"}`}
                            >
                               <span className="text-sm">❤️</span>
                               <span className="text-[10px] font-black">{post.likes.length}</span>
                            </button>
                            <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-widest">
                               ▶ {post.views}
                            </div>
                        </div>
                     </div>
                  </div>
               ))}
               
               {posts.filter(p => p.type === (activeTab === 'posts' ? 'post' : 'reel')).length === 0 && (
                  <div className="col-span-full h-96 flex flex-col items-center justify-center opacity-30">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                     </svg>
                     <p className="text-xs uppercase tracking-[0.3em] font-black">No global content yet</p>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Footer / Load More */}
      <div className="w-full max-w-6xl px-8 py-8 flex justify-center border-t border-white/5 bg-gradient-to-t from-blue-500/5 to-transparent">
         <button 
           onClick={fetchGlobalFeed}
           className="px-12 py-4 rounded-[24px] bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/10 transition-all active:scale-95"
         >
           Refresh Feed
         </button>
      </div>
    </div>
  )
}
