"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

interface Props {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  onVerified: (user: any) => void
}

export function MobileVerificationModal({ isOpen, onClose, userId, onVerified }: Props) {
  const [verifyingStep, setVerifyingStep] = useState<1 | 2>(1)
  const [mobileNum, setMobileNum] = useState("")
  const [otp, setOtp] = useState("")
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [targetEmail, setTargetEmail] = useState<string | null>(null)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(mobileNum)) {
      setVerificationError("Please enter a valid 10-digit mobile number")
      return
    }
    
    if (cooldown > 0) return

    setVerificationLoading(true)
    setVerificationError(null)
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, mobileNumber: mobileNum }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send OTP")
      
      setTargetEmail(data.targetEmail)
      setVerifyingStep(2)
      setCooldown(60)
    } catch (err: any) {
      setVerificationError(err.message)
    } finally {
      setVerificationLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setVerificationError("Please enter the 6-digit OTP")
      return
    }

    setVerificationLoading(true)
    setVerificationError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-mobile-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          mobileNumber: mobileNum, 
          otp 
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Verification failed")
      
      toast.success("Profile verified successfully!")
      onVerified(data.user)
      onClose()
    } catch (err: any) {
      setVerificationError(err.message)
    } finally {
      setVerificationLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0f172a] border border-blue-500/30 rounded-[32px] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        <h3 className="text-xl font-black text-white mb-2">Verify Your Account</h3>
        <p className="text-xs text-gray-400 mb-8 font-medium">Verify your mobile number to get a verified badge. We will send an OTP to your <strong>registered email</strong> for security.</p>
        
        {verifyingStep === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">Enter Mobile Number</label>
               <input 
                 type="tel" 
                 value={mobileNum}
                 onChange={(e) => {
                   const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                   setMobileNum(val);
                 }}
                 placeholder="10-digit mobile number"
                 className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all font-mono tracking-widest text-center"
               />
            </div>
            {verificationError && <p className="text-[10px] text-red-400 font-bold">{verificationError}</p>}
            <button 
              onClick={handleSendOTP}
              disabled={verificationLoading || cooldown > 0}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              {verificationLoading ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] uppercase tracking-widest font-black text-gray-500">Enter OTP</label>
               <input 
                 type="text" 
                 maxLength={6}
                 value={otp}
                 onChange={(e) => setOtp(e.target.value)}
                 placeholder="0 0 0 0 0 0"
                 className="w-full bg-[#020617] border border-white/10 rounded-xl px-4 py-3 text-center text-xl font-black text-white tracking-[0.5em] focus:outline-none focus:border-blue-500 transition-all"
               />
               <p className="text-[10px] text-emerald-400 text-center mt-4 font-black uppercase tracking-widest bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                 OTP sent to {targetEmail}
               </p>
            </div>
            {verificationError && <p className="text-[10px] text-red-400 font-bold">{verificationError}</p>}
            <div className="flex gap-3">
               <button 
                 onClick={() => setVerifyingStep(1)}
                 className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-black uppercase tracking-widest transition-all"
               >
                 Back
               </button>
               <button 
                 onClick={handleVerifyOTP}
                 disabled={verificationLoading}
                 className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20"
               >
                 {verificationLoading ? "Verifying..." : "Verify Content"}
               </button>
            </div>
          </div>
        )}

        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
