"use client"

import { useState, useRef } from "react"

interface FeedUploadModalProps {
  open: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export function FeedUploadModal({ open, onClose, userId, onSuccess }: FeedUploadModalProps) {
  const [type, setType] = useState<"post" | "reel">("post")
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file || !userId) return
    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("media", file)
    formData.append("userId", userId)
    formData.append("type", type)
    formData.append("caption", caption)

    try {
      const res = await fetch(`${API_BASE_URL}/api/feed`, {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || "Failed to upload content")
      }

      onSuccess()
      onClose()
      // Reset state
      setFile(null)
      setPreview(null)
      setCaption("")
    } catch (err: any) {
      setError(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[27000] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full h-full md:h-auto md:max-w-xl bg-[#0f172a] border-x md:border border-white/10 rounded-none md:rounded-[32px] overflow-hidden flex flex-col shadow-2xl mt-14 md:mt-0">
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <h3 className="text-base md:text-lg font-black text-white tracking-tight">Create New Post</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <div className="flex-1 p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto max-h-none md:max-h-[70vh] pb-32 md:pb-8 scrollbar-thin">
          {/* Type Selector */}
          <div className="flex gap-4 p-1 bg-[#020617] rounded-2xl border border-white/5">
            <button 
              onClick={() => setType("post")}
              className={`flex-1 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${type === "post" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"}`}
            >
              Square Post
            </button>
            <button 
              onClick={() => setType("reel")}
              className={`flex-1 py-2.5 md:py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${type === "reel" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20" : "text-gray-500 hover:text-gray-300"}`}
            >
              Vertical Reel
            </button>
          </div>

          {/* Media Preview / Selector */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative aspect-square md:aspect-video rounded-[20px] md:rounded-[24px] bg-[#020617] border-2 border-dashed border-white/5 hover:border-blue-500/40 transition-all cursor-pointer flex flex-col items-center justify-center p-4 bg-gradient-to-b from-transparent to-white/[0.02]"
          >
            {preview ? (
               <div className="relative w-full h-full flex items-center justify-center">
                  {type === "post" ? (
                    <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                  ) : (
                    <video src={preview} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" controls />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                     <span className="text-white text-[10px] md:text-xs font-black uppercase tracking-widest">Change File</span>
                  </div>
               </div>
            ) : (
              <>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:h-8 md:w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                   </svg>
                </div>
                <p className="text-xs md:text-sm font-bold text-gray-300">Click to upload media</p>
                <p className="text-[9px] md:text-[10px] text-gray-500 mt-1">High quality images and videos recommended</p>
              </>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept={type === 'post' ? "image/*" : "video/*"} 
            />
          </div>

          {/* Caption */}
          <div className="space-y-1.5 pb-10 md:pb-0">
             <label className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-gray-500">Caption</label>
             <textarea 
               value={caption}
               onChange={(e) => setCaption(e.target.value)}
               className="w-full bg-[#020617] border border-white/5 rounded-2xl px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm text-white focus:outline-none focus:border-blue-500/40 transition-all font-medium"
               placeholder="Write something cool about this post..."
               rows={3}
             />
          </div>

          {error && (
            <div className="p-3 md:p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] md:text-xs font-bold animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 md:p-8 bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 flex gap-3 md:gap-4 sticky bottom-0">
           <button 
             onClick={onClose}
             className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
           >
             Discard
           </button>
           <button 
             onClick={handleUpload}
             disabled={uploading || !file}
             className="flex-[2] py-3 md:py-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] md:text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
           >
             {uploading ? "Sharing..." : "Share Now"}
           </button>
        </div>
      </div>
    </div>
  )
}
