"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface Comment {
  userId: string
  username: string
  text: string
  createdAt: string
}

interface Post {
  _id: string
  type: "post" | "reel"
  mediaUrl: string
  caption?: string
  likes: string[]
  views: number
  comments?: Comment[]
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
  initialTab?: "posts" | "reels"
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export function GlobalExplore({ open, onClose, currentUserId, initialTab = "posts" }: GlobalExploreProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"posts" | "reels">(initialTab)
  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({})
  const [showCommentsFor, setShowCommentsFor] = useState<{ [postId: string]: boolean }>({})
  const [requestedUsers, setRequestedUsers] = useState<Set<string>>(new Set())
  const [sharingPostId, setSharingPostId] = useState<string | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [shareLoading, setShareLoading] = useState(false)
  const [shareSuccess, setShareSuccess] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [profileViewId, setProfileViewId] = useState<string | null>(null)

  // Synchronize activeTab with initialTab when the modal opens or initialTab changes
  useEffect(() => {
    if (open) setActiveTab(initialTab)
  }, [open, initialTab])

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

  const fetchFriends = async () => {
    if (!currentUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/${currentUserId}/friends`)
      if (res.ok) {
        const data = await res.json()
        setFriends(data.friends || [])
      }
    } catch (err) {
      console.error("Failed to fetch friends", err)
    }
  }

  useEffect(() => {
    if (open) {
      fetchGlobalFeed()
      fetchFriends()
    }
  }, [open, currentUserId])

  const handleShareToFriend = async (friendId: string) => {
    if (!currentUserId || !sharingPostId) return
    setShareLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: currentUserId,
          receiver: friendId,
          sharedPost: sharingPostId
        })
      })
      if (res.ok) {
        const { data } = await res.json()
        
        // Let's emit it over socket right now!
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001"
        const { io } = await import("socket.io-client")
        const socket = io(SOCKET_URL)
        socket.emit("send_private_message", data)
        setTimeout(() => socket.disconnect(), 1000) // Disconnect once sent
        
        setShareSuccess(friendId)
        setTimeout(() => setShareSuccess(null), 2000)
      }
    } catch (err) {
      console.error("Failed to share post", err)
    } finally {
      setShareLoading(false)
    }
  }


  const handleLike = async (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      })
      if (res.ok) {
        const data = await res.json()
        const update = (p: Post) => p._id === postId ? { ...p, likes: data.isLiked ? [...p.likes, currentUserId] : p.likes.filter(id => id !== currentUserId) } : p;
        setPosts(prev => prev.map(update))
        if (selectedPost?._id === postId) {
           setSelectedPost(prev => prev ? update(prev) : null)
        }
      }
    } catch (err) {
      console.error("Like toggle failed", err)
    }
  }

  const handleComment = async (postId: string) => {
    const text = commentInput[postId]
    if (!text || !text.trim() || !currentUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/feed/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, text: text.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        const update = (p: Post) => p._id === postId ? { ...p, comments: data.post.comments } : p;
        setPosts(prev => prev.map(update))
        if (selectedPost?._id === postId) {
           setSelectedPost(prev => prev ? update(prev) : null)
        }
        setCommentInput(prev => ({ ...prev, [postId]: "" }))
      }
    } catch (err) {
      console.error("Comment failed", err)
    }
  }

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/${targetUserId}/friend-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUserId }),
      })
      if (res.ok || res.status === 400 /* already pending/friends */) {
         setRequestedUsers(prev => {
            const next = new Set(prev)
            next.add(targetUserId)
            return next
         })
      }
    } catch (err) {
      console.error("Follow request failed:", err)
    }
  }

  const navigateToProfile = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setProfileViewId(userId)
  }

  const handlePostClick = (post: Post) => {
    setSelectedPost(post)
    setDetailModalOpen(true)
  }

  const handleNextPost = () => {
    if (!selectedPost) return
    const currentIdx = filteredPosts.findIndex(p => p._id === selectedPost._id);
    if (currentIdx < filteredPosts.length - 1) {
       setSelectedPost(filteredPosts[currentIdx + 1]);
    }
  }

  const handlePrevPost = () => {
    if (!selectedPost) return
    const currentIdx = filteredPosts.findIndex(p => p._id === selectedPost._id);
    if (currentIdx > 0) {
       setSelectedPost(filteredPosts[currentIdx - 1]);
    }
  }

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "Just now"
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff/60)}m`
    if (diff < 86400) return `${Math.floor(diff/3600)}h`
    if (diff < 604800) return `${Math.floor(diff/86400)}d`
    return `${Math.floor(diff/604800)}w`
  }

  const filteredPosts = posts.filter(p => p.type === (activeTab === 'posts' ? 'post' : 'reel'))

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[21000] flex flex-col items-center bg-[#050505] animate-in slide-in-from-bottom duration-500 overflow-hidden">
      {/* Premium Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>
      {/* Header Removed (Filtering handled by sidebar) */}
      <div className="flex-shrink-0 w-full h-4" /> 

      {/* Instagram Style Grid (Gap-less 1px line) */}
      <div className="flex-1 w-full max-w-[1012px] overflow-y-auto px-0 py-0 pb-32 md:pb-20 hide-scrollbar z-10 transition-all pt-0 md:pt-4">
         {loading ? (
            <div className="flex items-center justify-center p-20">
               <div className="w-12 h-12 border-4 border-white/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
         ) : (
            <div className="grid grid-cols-3 gap-[1.5px] auto-rows-[minmax(0,1fr)]">
               {filteredPosts.map((post, index) => {
                  // Instagram's exact 10-item pattern logic:
                  // 1x2 tall item on the RIGHT (index 2)
                  // 1x2 tall item on the LEFT (index 5)
                  const mod = index % 10;
                  const isTall = mod === 2 || mod === 5;
                  
                  return (
                    <div 
                      key={post._id} 
                      onClick={() => handlePostClick(post)}
                      className={`group relative bg-[#0a0a0a] cursor-pointer overflow-hidden transition-all duration-500 active:scale-[0.98] ${isTall ? "row-span-2 h-full" : "aspect-square"}`}
                    >
                      {/* Media */}
                      {post.type === 'post' ? (
                         <div className="relative w-full h-full">
                           <img src={post.mediaUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           {/* Post Multi-image icon indicator (optional) */}
                         </div>
                      ) : (
                         <div className="relative w-full h-full">
                           <video src={post.mediaUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted loop onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0; }} />
                           <div className="absolute top-3 right-3 text-white drop-shadow-lg z-10">
                             <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                               <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                             </svg>
                           </div>
                         </div>
                      )}

                      {/* Hover Overlay Stats */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-lg">
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          <span>{post.likes.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                            <path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                          </svg>
                          <span>{post.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  )
               })}
               
               {filteredPosts.length === 0 && (
                  <div className="col-span-3 flex flex-col items-center justify-center opacity-50 mt-20">
                     <p className="text-sm uppercase tracking-widest font-black text-white">No posts yet</p>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Post Detail Modal (Side-by-Side) */}
      {detailModalOpen && selectedPost && (
        <div 
          className="fixed inset-0 z-[22000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-10 animate-in fade-in duration-300"
          onClick={() => setDetailModalOpen(false)}
        >
          {/* Close button Top Right */}
          <button 
            className="absolute top-4 right-4 md:top-8 md:right-8 text-white hover:opacity-70 transition-opacity z-[12001] bg-black/40 rounded-full p-1"
            onClick={() => setDetailModalOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div 
            className="w-full max-w-6xl h-full md:max-h-[850px] bg-black border-x md:border border-white/10 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden rounded-none md:rounded-md shadow-[0_0_50px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Left: Media Area */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px] md:min-h-0 group/media">
              {/* Prev Arrow */}
              {filteredPosts.findIndex(p => p._id === selectedPost._id) > 0 && (
                <button 
                  onClick={handlePrevPost}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/80 z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}

              {selectedPost.type === 'post' ? (
                <img src={selectedPost.mediaUrl} alt="" className="w-full h-full object-contain" />
              ) : (
                <video src={selectedPost.mediaUrl} className="w-full h-full object-contain" autoPlay controls loop />
              )}

              {/* Next Arrow */}
              {filteredPosts.findIndex(p => p._id === selectedPost._id) < filteredPosts.length - 1 && (
                <button 
                  onClick={handleNextPost}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/80 z-20"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}
            </div>

            {/* Right: Interaction Panel */}
            <div className="w-full md:w-[400px] lg:w-[450px] bg-black flex flex-col border-l border-white/10 flex-shrink-0 pb-20 md:pb-0">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div 
                    onClick={(e) => navigateToProfile(selectedPost.userId._id, e)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-white/10 cursor-pointer"
                  >
                    <img src={selectedPost.userId.profilePicture || `https://ui-avatars.com/api/?name=${selectedPost.userId.displayName}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      onClick={(e) => navigateToProfile(selectedPost.userId._id, e)}
                      className="font-bold text-sm text-white hover:underline cursor-pointer notranslate"
                    >
                      {selectedPost.userId.displayName}
                    </span>
                    {selectedPost.type === 'reel' && (
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Original Audio</span>
                    )}
                  </div>
                  {selectedPost.userId._id !== currentUserId && (
                    <button 
                       onClick={() => handleFollow(selectedPost.userId._id)}
                       className={`font-semibold text-xs ml-2 transition-colors ${requestedUsers.has(selectedPost.userId._id) ? "text-gray-500" : "text-blue-500 hover:text-blue-400"}`}
                    >
                       • {requestedUsers.has(selectedPost.userId._id) ? "Requested" : "Follow"}
                    </button>
                  )}
                </div>
                <button className="text-white opacity-50 hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                     <circle cx="5" cy="12" r="2" />
                     <circle cx="12" cy="12" r="2" />
                     <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </div>

              {/* Caption & Comments (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-hide">
                {/* Caption */}
                {selectedPost.caption && (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/5 flex-shrink-0 cursor-pointer" onClick={(e) => navigateToProfile(selectedPost.userId._id, e)}>
                       <img src={selectedPost.userId.profilePicture || `https://ui-avatars.com/api/?name=${selectedPost.userId.displayName}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white mr-2 hover:underline cursor-pointer notranslate" onClick={(e) => navigateToProfile(selectedPost.userId._id, e)}>
                        {selectedPost.userId.displayName}
                      </span>
                      <span className="text-sm text-gray-200">{selectedPost.caption}</span>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {selectedPost.comments?.map((c, i) => (
                  <div key={i} className="flex gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/5 flex-shrink-0 cursor-pointer" onClick={(e) => navigateToProfile(c.userId, e)}>
                       <img src={`https://ui-avatars.com/api/?name=${c.username}&background=random`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-sm text-white hover:underline cursor-pointer notranslate" onClick={(e) => navigateToProfile(c.userId, e)}>
                          {c.username}
                        </span>
                        <span className="text-sm text-gray-200 leading-[1.4]">{c.text}</span>
                      </div>
                      <div className="flex gap-4 mt-2">
                        <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">1w</button>
                        <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions & Input */}
              <div className="p-4 border-t border-white/5 bg-black">
                 <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-4">
                    <button onClick={() => handleLike(selectedPost._id)} className="hover:opacity-60 transition-opacity">
                      {selectedPost.likes.includes(currentUserId || "") ? (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500 fill-current animate-in zoom-in" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                         </svg>
                      ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                         </svg>
                      )}
                    </button>
                     <button 
                        onClick={() => setSharingPostId(selectedPost._id)}
                        className="hover:opacity-60 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                     </button>
                  </div>
                  <button className="hover:opacity-60 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.5">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  </button>
                 </div>

                 <div className="font-bold text-sm text-white mb-1">{selectedPost.likes.length} Likes</div>
                 <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4">FEBRUARY 1</div>

                 <form 
                   onSubmit={(e) => { e.preventDefault(); handleComment(selectedPost._id); }} 
                   className="flex items-center gap-3 border-t border-white/5 pt-3"
                 >
                   <span className="text-xl opacity-80 cursor-pointer hover:opacity-100 transition-opacity">😊</span>
                   <input 
                     type="text" 
                     placeholder="Add a comment..."
                     className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-500"
                     value={commentInput[selectedPost._id] || ""}
                     onChange={e => setCommentInput(prev => ({ ...prev, [selectedPost._id]: e.target.value }))}
                   />
                   <button 
                     type="submit"
                     disabled={!commentInput[selectedPost._id]?.trim()}
                     className={`text-sm font-bold transition-all ${commentInput[selectedPost._id]?.trim() ? "text-blue-500 hover:text-white" : "text-blue-900 pointer-events-none"}`}
                   >
                     Post
                   </button>
                 </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Post Modal */}
      {sharingPostId && (
        <div 
          className="fixed inset-0 z-[23000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSharingPostId(null)}
        >
            <div 
              className="w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-[28px] shadow-2xl flex flex-col max-h-[70vh] md:max-h-[500px] overflow-hidden animate-in zoom-in-95 duration-300"
              onClick={e => e.stopPropagation()}
            >
               <div className="p-5 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-white/50 text-center flex-1">Share To Strangers</h3>
                  <button onClick={() => setSharingPostId(null)} className="text-gray-500 hover:text-white p-1 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                     </svg>
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 scrollbar-none">
                  {friends.length === 0 ? (
                     <div className="text-center text-gray-500 py-16">
                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 opacity-20">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 110-8 4 4 0 010 8zm12 5h-6m3-3v6" />
                           </svg>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">No connections found</p>
                        <p className="text-[10px] mt-1 opacity-50">Add friends to share vibes!</p>
                     </div>
                  ) : (
                     friends.map(friend => (
                        <div key={friend._id} className="flex items-center justify-between gap-3 p-2 hover:bg-white/5 rounded-2xl transition-all">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                 <img src={friend.profilePicture || `https://ui-avatars.com/api/?name=${friend.displayName}`} alt="" className="w-full h-full object-cover" />
                              </div>
                              <span className="font-bold text-xs text-white notranslate">{friend.displayName}</span>
                           </div>
                           <button 
                             onClick={() => handleShareToFriend(friend._id)}
                             disabled={shareLoading || shareSuccess === friend._id}
                             className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${shareSuccess === friend._id ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"}`}
                           >
                             {shareSuccess === friend._id ? "Sent" : "Send"}
                           </button>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  )
}

