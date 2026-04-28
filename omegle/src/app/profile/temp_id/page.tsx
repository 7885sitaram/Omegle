"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export default function UserProfile({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id: targetUserId } = params
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profileData, setProfileData] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requested, setRequested] = useState(false)

  // 1. Check Auth
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId")
    if (!storedUserId) {
      router.push("/")
      return
    }
    setCurrentUser({ _id: storedUserId })
  }, [router])

  // 2. Fetch Profile Info & Posts
  useEffect(() => {
    if (!currentUser || !targetUserId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const userRes = await fetch(`${API_BASE_URL}/users/${targetUserId}?requesterId=${currentUser._id}`)
        if (userRes.ok) {
          const { user } = await userRes.json()
          setProfileData(user)
        }

        const postRes = await fetch(`${API_BASE_URL}/api/feed/user/${targetUserId}`)
        if (postRes.ok) {
          const data = await postRes.json()
          setUserPosts(data.posts || [])
        }
      } catch (err) {
        console.error("Failed fetching profile", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentUser, targetUserId])

  const handleFollow = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE_URL}/users/${targetUserId}/friend-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId: currentUser._id }),
      })
      if (res.ok || res.status === 400) {
        setRequested(true)
      }
    } catch (err) {
      console.error("Follow error", err)
    }
  }

  const handleMessageClick = () => {
    router.push('/messages')
  }

  if (loading) {
    return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">Loading...</div>
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold">User Not Found</h2>
        <button className="mt-4 text-blue-500 hover:underline" onClick={() => router.back()}>Go Back</button>
      </div>
    )
  }

  const isSelf = currentUser?._id === targetUserId

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center pb-10">
      <div className="w-full max-w-3xl px-4 py-4 flex items-center border-b border-white/5 sticky top-0 bg-[#020617] z-10">
        <button onClick={() => router.back()} className="mr-4 text-white hover:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-lg font-bold tracking-tight">{profileData.displayName}</h1>
      </div>

      <div className="w-full max-w-3xl px-4 md:px-8 mt-6 flex flex-col">
        <div className="flex items-center gap-6 md:gap-10">
          <div className="w-20 h-20 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-gray-700 shrink-0">
            <img 
              src={profileData.profilePicture || `https://ui-avatars.com/api/?name=${profileData.displayName}`} 
              alt={profileData.displayName} 
              className="w-full h-full object-cover" 
            />
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row items-baseline md:items-center gap-3 md:gap-6">
              <h2 className="text-xl font-medium">{profileData.displayName}</h2>
              {!isSelf && (
                <div className="flex gap-2">
                  {!profileData.isPrivate || requested ? (
                    <button 
                      onClick={handleMessageClick}
                      className="px-5 py-1.5 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors"
                    >
                      Message
                    </button>
                  ) : null}
                  <button 
                    onClick={handleFollow}
                    disabled={requested}
                    className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-colors ${requested ? 'bg-white/10 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {requested ? 'Requested' : 'Follow'}
                  </button>
                </div>
              )}
              {isSelf && (
                <button className="px-5 py-1.5 bg-white/10 text-white rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors">
                  Edit Profile
                </button>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm mb-2">
              <div><span className="font-bold">{userPosts.length}</span> posts</div>
              <div><span className="font-bold">{profileData.friends?.length || 0}</span> followers</div>
              <div><span className="font-bold">{profileData.friends?.length || 0}</span> following</div>
            </div>

            <div className="text-sm">
              <div className="font-bold">{profileData.fullName || profileData.displayName}</div>
              <p className="text-gray-300 mt-1">{profileData.bio || "No bio available."}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 flex justify-center">
          <div className="flex gap-10">
            <button className="px-1 md:px-3 py-4 border-t border-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Posts
            </button>
            <button className="px-1 md:px-3 py-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Reels
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 md:gap-2 mt-2">
          {userPosts.length === 0 ? (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center opacity-50">
              <div className="w-16 h-16 border-2 border-white rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">No Posts Yet</h2>
            </div>
          ) : (
            userPosts.map(post => (
              <div key={post._id} className="aspect-square bg-[#0f172a] group relative cursor-pointer overflow-hidden">
                {post.type === "post" ? (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <video src={post.mediaUrl} className="w-full h-full object-cover" />
                )}
                
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 font-bold text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                       <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span>{post.likes.length}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
