"use client"

import { useEffect, useState } from "react"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

interface UserProfile {
  _id: string
  email?: string
  fullName?: string
  displayName?: string
  profilePicture?: string
  bio?: string
  gender?: string
  dateOfBirth?: string
  country?: string
  state?: string
  city?: string
  languages?: string[]
  interests?: string[]
  preferredGender?: string
  preferredAgeRange?: { min?: number; max?: number }
  preferredLanguage?: string
  regionPreference?: string
  chatMode?: string
  anonymousMode?: boolean
  allowFriendRequests?: boolean
  isPrivate?: boolean
}

interface UserProfileDrawerProps {
  open: boolean
  onClose: () => void
  userId?: string | null
  initialUser?: UserProfile | null
  readOnly?: boolean
  onDeleted?: () => void
}

export function UserProfileDrawer({
  open,
  onClose,
  userId,
  initialUser = null,
  readOnly = false,
  onDeleted,
}: UserProfileDrawerProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isSelf = !!(
    typeof window !== "undefined" &&
    user &&
    window.localStorage.getItem("userId") === user._id
  )

  useEffect(() => {
    if (!open) return

    if (!userId) {
      setUser(initialUser)
      return
    }

    setLoading(true)
    setError(null)

    const requesterId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null

    fetch(`${API_BASE_URL}/users/${userId}?requesterId=${requesterId || ""}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Failed to load profile")
        }
        return res.json()
      })
      .then((data) => {
        setUser(data.user)
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load profile")
      })
      .finally(() => setLoading(false))
  }, [userId, open, initialUser])

  const handleFieldChange = (key: keyof UserProfile, value: any) => {
    setUser((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    if (!user?._id) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: user.fullName,
          displayName: user.displayName,
          bio: user.bio,
          country: user.country,
          state: user.state,
          city: user.city,
          preferredGender: user.preferredGender,
          preferredLanguage: user.preferredLanguage,
          regionPreference: user.regionPreference,
          chatMode: user.chatMode,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile")
      }

      setUser(data.user)
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?._id) return
    if (!confirm("Delete this profile permanently?")) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/users/${user._id}`, {
        method: "DELETE",
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete user")
      }

      if (typeof window !== "undefined") {
        if (window.localStorage.getItem("userId") === user._id) {
          window.localStorage.removeItem("userId")
          window.localStorage.removeItem("profileCompleted")
        }
      }

      if (onDeleted) onDeleted()
      onClose()
    } catch (err: any) {
      setError(err.message || "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      <div className="w-full max-w-md bg-[#020617] border-l border-white/10 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-blue-300/80">
              Profile
            </p>
            <h2 className="text-lg font-semibold text-white">
              {user?.displayName || "User"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {isSelf && !readOnly && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs disabled:opacity-60"
                  title="Save changes"
                >
                  💾
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="p-2 rounded-full bg-red-600/80 hover:bg-red-500 text-white text-xs disabled:opacity-60"
                  title="Delete profile"
                >
                  🗑
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 text-xs"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {loading && (
            <p className="text-xs text-gray-400">Loading profile…</p>
          )}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          {user && (
            <>
              <section className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center">
                  {user.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.profilePicture}
                      alt={user.displayName || "avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm text-gray-500">
                      {user.displayName?.[0]?.toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {user.displayName || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-400">
                    @{user.displayName || "username"}
                  </p>
                </div>
              </section>

              {user.isPrivate ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2">Private Profile</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You must be friends with {user.displayName} to view their full profile details, including bio, location, and interests.
                  </p>
                </div>
              ) : (
                <>
                  {user.bio && (
                    <section>
                      <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-2">Bio</h3>
                      <p className="text-xs text-gray-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 italic">
                        "{user.bio}"
                      </p>
                    </section>
                  )}

                  <section>
                    <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-2">
                      Personal info
                    </h3>
                    <div className="space-y-2 text-xs">
                      <FieldRow
                        label="Full name"
                        editable={isSelf && !readOnly}
                        value={user.fullName || ""}
                        onChange={(v) => handleFieldChange("fullName", v)}
                      />
                      <FieldRow
                        label="Country"
                        editable={isSelf && !readOnly}
                        value={user.country || ""}
                        onChange={(v) => handleFieldChange("country", v)}
                      />
                      <FieldRow
                        label="State"
                        editable={isSelf && !readOnly}
                        value={user.state || ""}
                        onChange={(v) => handleFieldChange("state", v)}
                      />
                      <FieldRow
                        label="City"
                        editable={isSelf && !readOnly}
                        value={user.city || ""}
                        onChange={(v) => handleFieldChange("city", v)}
                      />
                      <FieldRow
                        label="Gender"
                        editable={false}
                        value={user.gender || "—"}
                      />
                      <FieldRow
                        label="Languages"
                        editable={false}
                        value={
                          user.languages && user.languages.length
                            ? user.languages.join(", ")
                            : "—"
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-2">
                      Chat preferences
                    </h3>
                    <div className="space-y-2 text-xs">
                      <FieldRow
                        label="Preferred gender"
                        editable={isSelf && !readOnly}
                        value={user.preferredGender || ""}
                        onChange={(v) => handleFieldChange("preferredGender", v)}
                      />
                      <FieldRow
                        label="Preferred language"
                        editable={isSelf && !readOnly}
                        value={user.preferredLanguage || ""}
                        onChange={(v) => handleFieldChange("preferredLanguage", v)}
                      />
                      <FieldRow
                        label="Region"
                        editable={isSelf && !readOnly}
                        value={user.regionPreference || ""}
                        onChange={(v) => handleFieldChange("regionPreference", v)}
                      />
                      <FieldRow
                        label="Chat mode"
                        editable={isSelf && !readOnly}
                        value={user.chatMode || ""}
                        onChange={(v) => handleFieldChange("chatMode", v)}
                      />
                      <FieldRow
                        label="Interests"
                        editable={false}
                        value={
                          user.interests && user.interests.length
                            ? user.interests.join(", ")
                            : "—"
                        }
                      />
                      <FieldRow
                        label="Age range"
                        editable={false}
                        value={
                          user.preferredAgeRange
                            ? `${user.preferredAgeRange.min ?? "?"} - ${user.preferredAgeRange.max ?? "?"
                            }`
                            : "—"
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide mb-2">
                      Security & account
                    </h3>
                    <div className="space-y-2 text-xs">
                      <FieldRow
                        label="Email"
                        editable={false}
                        value={user.email || "—"}
                      />
                      <FieldRow
                        label="Anonymous mode"
                        editable={false}
                        value={user.anonymousMode ? "On" : "Off"}
                      />
                      <FieldRow
                        label="Friend requests"
                        editable={false}
                        value={user.allowFriendRequests ? "Allowed" : "Blocked"}
                      />
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string
  editable?: boolean
  onChange?: (value: string) => void
}

function FieldRow({ label, value, editable, onChange }: FieldRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      {editable && onChange ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#020617] border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/60 transition"
        />
      ) : (
        <span className="text-[11px] text-gray-200">{value || "—"}</span>
      )}
    </div>
  )
}

