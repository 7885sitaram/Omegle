"use client"

import { useEffect, useState } from "react"

type Gender = "male" | "female" | "other" | ""
type PreferredGender = "male" | "female" | "other" | "any"
type RegionPreference = "same_country" | "global"
type ChatMode = "text" | "video" | "both"

interface AgeRange {
  min: number
  max: number
}

interface Props {
  /** Optionally force the overlay open regardless of localStorage */
  forceOpen?: boolean
}

const INTEREST_OPTIONS = [
  "Gaming",
  "Music",
  "Movies & Series",
  "Coding",
  "Travel",
  "Fitness",
  "Anime",
  "Art & Design",
  "Tech Talk",
  "Deep Talks",
]

const LANGUAGE_OPTIONS = [
  "English",
  "Hindi",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Chinese",
]

export function ProfileOnboardingOverlay({ forceOpen }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)

  const [fullName, setFullName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [gender, setGender] = useState<Gender>("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [country, setCountry] = useState("")
  const [stateValue, setStateValue] = useState("")
  const [city, setCity] = useState("")
  const [languages, setLanguages] = useState<string[]>([])
  const [customLanguage, setCustomLanguage] = useState("")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  )

  const [interests, setInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState("")
  const [preferredGender, setPreferredGender] = useState<PreferredGender>("any")
  const [preferredAgeRange, setPreferredAgeRange] = useState<AgeRange>({
    min: 18,
    max: 35,
  })
  const [preferredLanguage, setPreferredLanguage] = useState("")
  const [regionPreference, setRegionPreference] =
    useState<RegionPreference>("global")
  const [chatMode, setChatMode] = useState<ChatMode>("text")
  const [anonymousMode, setAnonymousMode] = useState(true)
  const [allowFriendRequests, setAllowFriendRequests] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
      return
    }

    if (typeof window === "undefined") return
    const completed = window.localStorage.getItem("profileCompleted")
    if (completed !== "true") {
      const timeout = setTimeout(() => setOpen(true), 400)
      return () => clearTimeout(timeout)
    }
  }, [forceOpen])

  useEffect(() => {
    if (!profileImageFile) {
      setProfileImagePreview(null)
      return
    }

    const url = URL.createObjectURL(profileImageFile)
    setProfileImagePreview(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [profileImageFile])

  const toggleFromList = (
    value: string,
    list: string[],
    setter: (v: string[]) => void
  ) => {
    if (list.includes(value)) {
      setter(list.filter((x) => x !== value))
    } else {
      setter([...list, value])
    }
  }

  const handleAddCustom = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
    clear: () => void
  ) => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (!list.includes(trimmed)) {
      setter([...list, trimmed])
    }
    clear()
  }

  const totalSteps = 3

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      console.log("[ProfileOverlay] Submitting profile data...")
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

      const body = {
        userId:
          typeof window !== "undefined"
            ? window.localStorage.getItem("userId") || undefined
            : undefined,
        fullName: fullName || undefined,
        displayName: displayName || undefined,
        bio: bio || undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        country: country || undefined,
        state: stateValue || undefined,
        city: city || undefined,
        languages,
        interests,
        preferredGender,
        preferredAgeRange,
        preferredLanguage: preferredLanguage || undefined,
        regionPreference,
        chatMode,
        anonymousMode,
        allowFriendRequests,
      }

      const url = `${API_BASE_URL}/form`
      console.log("[ProfileOverlay] POST", url, body)

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data: any = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile")
      }

      // Optional profile image upload if user selected a picture
      const createdId: string | undefined = data?.id || data?.user?._id
      if (createdId && profileImageFile) {
        try {
          const imgUrl = `${API_BASE_URL}/profile-img/${createdId}`
          console.log("[ProfileOverlay] Uploading profile image to", imgUrl)

          const formData = new FormData()
          formData.append("image", profileImageFile)

          const imgRes = await fetch(imgUrl, {
            method: "POST",
            body: formData,
          })

          if (!imgRes.ok) {
            const imgData = await imgRes.json().catch(() => ({}))
            console.warn(
              "Profile image upload failed:",
              imgRes.status,
              imgData
            )
          }
        } catch (imgErr) {
          console.warn("Profile image upload error:", imgErr)
        }
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("profileCompleted", "true")
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
      }, 800)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-blue-500/10 via-transparent to-purple-500/10 animate-pulse" />

      <div className="relative z-50 w-full max-w-3xl mx-4 rounded-3xl bg-[#020617]/90 border border-white/10 shadow-[0_24px_80px_rgba(15,23,42,0.9)] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-600/40 via-purple-600/30 to-sky-500/40">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/80">
              StrangerChat Setup
            </p>
            <h2 className="text-lg md:text-xl font-semibold text-white">
              Let&apos;s tune your vibe ⚡
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-blue-100/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Better matches</span>
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 pb-3">
          <div className="flex items-center gap-2 mb-4">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const current = index + 1
              const isActive = current === step
              const isDone = current < step
              return (
                <div
                  key={current}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    isDone
                      ? "bg-gradient-to-r from-emerald-400 to-sky-400"
                      : isActive
                      ? "bg-white/80"
                      : "bg-white/10"
                  }`}
                />
              )
            })}
          </div>
        </div>

        <div className="px-6 pb-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {step === 1 && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div>
                <p className="text-sm text-gray-300 mb-1">
                  Start with the basics
                </p>
                <p className="text-xs text-gray-500">
                  We don&apos;t show this publicly, it just helps us make your
                  chats feel more human.
                </p>
              </div>

              <div className="grid md:grid-cols-[auto,1fr] gap-6 items-start">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-24 h-24 rounded-full border border-blue-400/60 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden shadow-lg shadow-blue-600/30 flex items-center justify-center">
                    {profileImagePreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileImagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-500 text-center px-2">
                        Add a face to your vibe
                      </span>
                    )}
                  </div>
                  <label className="relative inline-flex items-center justify-center px-3 py-1.5 rounded-full text-[11px] font-medium bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition">
                    <span>Upload avatar</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setProfileImageFile(file)
                      }}
                    />
                  </label>
                  <p className="text-[9px] text-gray-500 text-center max-w-[120px]">
                    JPG / PNG, recommended square image.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">
                      Full name
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                      placeholder="Just for personalization"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">
                      Display name
                    </label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                      placeholder="What strangers will see"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  One-line bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition resize-none"
                  placeholder="Example: Night owl coder who loves deep conversations and bad jokes."
                />
                <p className="text-[10px] text-gray-500 text-right mt-1">
                  {bio.length}/300
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Gender
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["male", "female", "other"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g as Gender)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                          gender === g
                            ? "bg-blue-600/90 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                            : "bg-[#020617] border-gray-800 text-gray-400 hover:border-blue-500/60 hover:text-white"
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Country
                  </label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                    placeholder="India"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    State / Region
                  </label>
                  <input
                    value={stateValue}
                    onChange={(e) => setStateValue(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    City
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-2 text-gray-400">
                  Languages you&apos;re comfortable in
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        toggleFromList(lang, languages, setLanguages)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        languages.includes(lang)
                          ? "bg-emerald-500/90 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                          : "bg-[#020617] border-gray-800 text-gray-400 hover:border-emerald-400/60 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="flex-1 bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/60 transition"
                    placeholder="Add another language..."
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddCustom(
                        customLanguage,
                        languages,
                        setLanguages,
                        () => setCustomLanguage("")
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div>
                <p className="text-sm text-gray-300 mb-1">
                  What are you into right now?
                </p>
                <p className="text-xs text-gray-500">
                  We&apos;ll quietly use this to pair you with people into the
                  same stuff.
                </p>
              </div>

              <div>
                <label className="block text-xs mb-2 text-gray-400">
                  Tap to select interests
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() =>
                        toggleFromList(interest, interests, setInterests)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        interests.includes(interest)
                          ? "bg-purple-600/90 border-purple-300 text-white shadow-[0_0_25px_rgba(168,85,247,0.55)]"
                          : "bg-[#020617] border-gray-800 text-gray-400 hover:border-purple-400/60 hover:text-white"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    className="flex-1 bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/60 transition"
                    placeholder="Add your own flavour (e.g. Startup ideas, Philosophy)…"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleAddCustom(
                        customInterest,
                        interests,
                        setInterests,
                        () => setCustomInterest("")
                      )
                    }
                    className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs mb-2 text-gray-400">
                    Who do you prefer to match with?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["any", "male", "female", "other"] as PreferredGender[]).map(
                      (opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPreferredGender(opt)}
                          className={`px-3 py-2 rounded-xl text-xs border transition-all ${
                            preferredGender === opt
                              ? "bg-blue-600/90 border-blue-300 text-white shadow-[0_0_20px_rgba(37,99,235,0.55)]"
                              : "bg-[#020617] border-gray-800 text-gray-400 hover:border-blue-400/60 hover:text-white"
                          }`}
                        >
                          {opt === "any"
                            ? "Anyone"
                            : opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs mb-2 text-gray-400">
                    Age range you&apos;re okay with
                  </label>
                  <div className="flex items-center gap-3 text-xs text-gray-300 mb-2">
                    <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                      {preferredAgeRange.min} - {preferredAgeRange.max} yrs
                    </span>
                    <span className="text-[10px] text-gray-500">
                      (18+ only, obviously)
                    </span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="range"
                        min={18}
                        max={60}
                        value={preferredAgeRange.min}
                        onChange={(e) =>
                          setPreferredAgeRange((prev) => ({
                            ...prev,
                            min: Math.min(
                              Number(e.target.value),
                              prev.max - 1
                            ),
                          }))
                        }
                        className="flex-1 accent-blue-500"
                      />
                      <input
                        type="range"
                        min={19}
                        max={80}
                        value={preferredAgeRange.max}
                        onChange={(e) =>
                          setPreferredAgeRange((prev) => ({
                            ...prev,
                            max: Math.max(
                              Number(e.target.value),
                              prev.min + 1
                            ),
                          }))
                        }
                        className="flex-1 accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Primary language to match on
                  </label>
                  <input
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
                    placeholder="e.g. English, Hindi…"
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Where should we look for strangers?
                  </label>
                  <div className="flex gap-2 mt-1">
                    {(["same_country", "global"] as RegionPreference[]).map(
                      (opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setRegionPreference(opt)}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs border transition-all ${
                            regionPreference === opt
                              ? "bg-emerald-600/90 border-emerald-300 text-white shadow-[0_0_20px_rgba(16,185,129,0.55)]"
                              : "bg-[#020617] border-gray-800 text-gray-400 hover:border-emerald-400/60 hover:text-white"
                          }`}
                        >
                          {opt === "same_country" ? "Prefer my country" : "Global mix"}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div>
                <p className="text-sm text-gray-300 mb-1">
                  Final touch: how do you like to chat?
                </p>
                <p className="text-xs text-gray-500">
                  You can always change these later, this just sets your default
                  StrangerChat mode.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {(["text", "video", "both"] as ChatMode[]).map((mode) => {
                  const label =
                    mode === "text"
                      ? "Text"
                      : mode === "video"
                      ? "Video"
                      : "Mix it"
                  const desc =
                    mode === "text"
                      ? "Low-key keyboard convos."
                      : mode === "video"
                      ? "Face-to-face energy."
                      : "We&apos;ll pick what feels right."
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setChatMode(mode)}
                      className={`relative flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border text-left text-xs transition-all ${
                        chatMode === mode
                          ? "bg-sky-600/90 border-sky-300 text-white shadow-[0_0_30px_rgba(56,189,248,0.6)] scale-[1.02]"
                          : "bg-[#020617] border-gray-800 text-gray-300 hover:border-sky-400/60 hover:text-white"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>
                      <span className="text-[10px] text-gray-400">
                        {desc}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#020617] border border-gray-800">
                  <div>
                    <p className="text-xs font-medium text-gray-200">
                      Anonymous mode
                    </p>
                    <p className="text-[10px] text-gray-500">
                      We hide personal info & keep things low-key.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnonymousMode((v) => !v)}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                      anonymousMode ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        anonymousMode ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#020617] border border-gray-800">
                  <div>
                    <p className="text-xs font-medium text-gray-200">
                      Allow friend requests
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Let good chats turn into repeat conversations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowFriendRequests((v) => !v)}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${
                      allowFriendRequests ? "bg-blue-500" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        allowFriendRequests ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3 text-[11px] text-emerald-200 flex items-start gap-2">
                <span className="mt-0.5 text-lg">✨</span>
                <p>
                  These preferences help match you with people who feel like
                  your crowd. You&apos;re still anonymous — no public profile,
                  no social links, just better vibes.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-[#020617]/90 flex items-center justify-between gap-3">
          <div className="flex flex-col text-xs text-gray-500">
            {error && (
              <span className="text-red-400 text-xs mb-1">{error}</span>
            )}
            {success && (
              <span className="text-emerald-400 text-xs">
                Saved! Tuning your matches…
              </span>
            )}
            {!error && !success && (
              <span>~1 minute setup. You&apos;re almost in.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="px-3 py-2 rounded-xl text-xs border border-gray-700 text-gray-300 hover:bg-white/5 transition"
              >
                Back
              </button>
            )}
            {step < totalSteps && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
              >
                Next
              </button>
            )}
            {step === totalSteps && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/40 transition disabled:opacity-60"
              >
                {submitting ? "Saving profile…" : "Save & jump in"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

