"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/Components/Navbar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import IncomingCall from "@/Components/PhoneMode/IncomingCall";
import CallScreen from "@/Components/PhoneMode/CallScreen";
import Link from "next/link";
import { MobileVerificationModal } from "@/Components/MobileVerificationModal";
import { toast } from "sonner";
import FeedbackModal from "@/Components/Reputation/FeedbackModal";
import WarningModal from "@/Components/Reputation/WarningModal";

let socket: Socket | null = null;

export default function PhonePage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();

  const [status, setStatus] = useState<"checking" | "ideal" | "searching" | "incoming" | "accepted_waiting" | "in-call">("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [partnerMobile, setPartnerMobile] = useState("");
  const [roomId, setRoomId] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [partnerUserId, setPartnerUserId] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [reputationInfo, setReputationInfo] = useState<any>(null);
  
  // Handshake states for Phone Mode
  const [localReady, setLocalReady] = useState(false);
  const [partnerReady, setPartnerReady] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_URL!, {
        transports: ["websocket"],
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  useEffect(() => {
    const checkUserEligibility = async () => {
      const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
      if (!userId) {
        if (sessionStatus === "unauthenticated") {
          router.replace("/");
        }
        return;
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
        const res = await fetch(`${apiBase}/users/${userId}?requesterId=${userId}`);
        const repRes = await fetch(`${apiBase}/api/reputation/${userId}?t=${new Date().getTime()}`);
        
        if (res.ok && repRes.ok) {
          const userData = await res.json();
          const repData = await repRes.json();
          
          const user = userData.user;
          const isVerified = user.isVerified === true;
          const trustScore = repData.trustScore || 0;

          if (!isVerified) {
            setErrorMsg("You must verify your mobile number to access Phone Mode.");
            setStatus("ideal");
          } else if (trustScore < 5) {
            setErrorMsg(`Luxury Alert: Your reputation score (${trustScore}) is too low. A minimum score of 5 is required for Phone Mode.`);
            setStatus("ideal");
          } else {
            setUserData(user);
            setStatus("ideal");
          }
        } else if (res.ok) {
           // If reputation fetch fails, default to allowing if verified (or you can choose to block)
           const data = await res.json();
           if (data.user.isVerified) {
             setUserData(data.user);
             setStatus("ideal");
           } else {
             setErrorMsg("You must verify your mobile number to access Phone Mode.");
             setStatus("ideal");
           }
        }
      } catch (err) {
        setErrorMsg("Failed to check account eligibility. Please try again later.");
        setStatus("ideal");
      }
    };

    if (sessionStatus !== "loading") {
      checkUserEligibility();
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (!socket) return;

    socket.on("searching_phone", () => {
      setStatus("searching");
    });

    socket.on("incoming_call", async ({ partnerMobile, partnerId, partnerName: name, roomId }) => {
      setPartnerMobile(partnerMobile || "Unknown Number");
      setPartnerUserId(partnerId || "");
      setPartnerName(name || "Stranger");
      setRoomId(roomId);
      
      // Do NOT set status to "incoming" immediately. Check reputation first.
      if (partnerId) {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
          const res = await fetch(`${apiBase}/api/reputation/${partnerId}?t=${new Date().getTime()}`);
          if (res.ok) {
            const rep = await res.json();
            setReputationInfo(rep);
            if (rep.trustScore < 0 || rep.badge === "🔴 Risky") {
              setShowWarning(true);
            } else {
              // Safe user, proceed to incoming call screen
              setStatus("incoming");
            }
          } else {
            setStatus("incoming");
          }
        } catch (err) {
          console.error("Failed to check caller reputation:", err);
          setStatus("incoming");
        }
      } else {
        setStatus("incoming");
      }
    });

    socket.on("call_connected", ({ roomId }) => {
      setRoomId(roomId);
      setStatus("in-call");
    });

    socket.on("call_cancelled", ({ reason }) => {
      if (reason === 'timeout') {
         toast.info("Call timed out.");
      } else if (reason === 'rejected') {
         toast.error("Call was declined.");
      }
      setStatus("ideal");
      setRoomId("");
      setPartnerMobile("");
      setShowWarning(false);
    });
    
    socket.on("call_ended", ({ partnerId: pId, partnerName: pName } = {}) => {
      const wasInCall = status === "in-call";
      if (pId) setPartnerUserId(pId);
      if (pName) setPartnerName(pName);
      
      if (wasInCall) {
        setShowFeedback(true);
      }
      setStatus("ideal");
      setRoomId("");
      setPartnerMobile("");
    });

    return () => {
      socket?.off("searching_phone");
      socket?.off("incoming_call");
      socket?.off("call_connected");
      socket?.off("call_cancelled");
      socket?.off("call_ended");
    };
  }, [status]);

  const startPhoneMode = async () => {
    if (!socket || !userData) return;
    socket.emit("start_phone_mode", {
      userId: userData._id,
      mobileNumber: userData.mobileNumber || "Private Number",
      displayName: userData.displayName || "Stranger"
    });
    setStatus("searching");
  };

  const cancelSearch = () => {
    socket?.disconnect();
    socket?.connect();
    setStatus("ideal");
  };

  const acceptCall = () => {
    socket?.emit("accept_call");
    setStatus("accepted_waiting");
  };

  const rejectCall = () => {
    socket?.emit("reject_call");
    setStatus("ideal");
  };

  const endCall = () => {
    socket?.emit("end_phone_call");
    setStatus("ideal");
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === "incoming" && !showWarning) {
    return <IncomingCall callerNumber={partnerMobile} onAccept={acceptCall} onReject={rejectCall} />;
  }

  if (status === "accepted_waiting") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111] text-white">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-light tracking-widest">Connecting...</h2>
        <p className="text-gray-500 mt-2">Waiting for {partnerMobile} to accept</p>
      </div>
    );
  }

  if (status === "in-call" && roomId) {
    return <CallScreen roomId={roomId} partnerMobile={partnerMobile} onEndCall={endCall} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden">
        <div className="absolute inset-0 max-w-full overflow-hidden pointer-events-none flex justify-center items-center">
            <div className="w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[100px] absolute mix-blend-screen opacity-50"></div>
        </div>

        <div className="max-w-2xl text-center mb-12 z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-wide drop-shadow-md">
            Stranger<span className="text-yellow-500">Phone</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto">
            Experience realistic random mobile calls. Exclusive to verified premium members.
          </p>
        </div>

        <div className="z-10 w-full max-w-md">
          {errorMsg ? (
             <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center flex flex-col items-center gap-4">
                <h3 className="text-xl font-bold">{errorMsg.includes("verify") ? "Verification Required" : "Luxury Access Required"}</h3>
                <p className="text-sm text-gray-400">{errorMsg}</p>
                {errorMsg.includes("verify") && (
                   <button onClick={() => setShowVerifyModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase tracking-wider text-sm px-8 py-3 rounded-full mt-2 transition-transform">Verify Profile</button>
                )}
             </div>
          ) : status === "ideal" ? (
             <div className="flex flex-col items-center gap-6">
                <button onClick={startPhoneMode} className="w-40 h-40 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-400 flex flex-col items-center justify-center shadow-lg transform hover:scale-105 active:scale-95">
                   <span className="font-bold text-sm tracking-wide text-black">CONNECT</span>
                </button>
                <p className="text-gray-500 text-sm">Tap to ring a random stranger</p>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-yellow-500 font-medium tracking-widest uppercase text-sm">Dialing stranger...</p>
              <button onClick={cancelSearch} className="px-6 py-2 rounded-full border border-gray-600 text-gray-400 hover:text-white transition-colors text-sm">Cancel</button>
            </div>
          )}
        </div>
      </main>

      <FeedbackModal 
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        targetId={partnerUserId}
        raterId={userData?._id || ""}
        partnerName={partnerName}
      />

      <WarningModal
        isOpen={showWarning}
        reputation={reputationInfo}
        onAccept={() => {
          setShowWarning(false);
          setStatus("incoming");
        }}
        onReject={() => {
          setShowWarning(false);
          socket?.emit("reject_call");
          setStatus("ideal");
          startPhoneMode();
        }}
      />
      
      <MobileVerificationModal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} userId={userData?._id} onVerified={(user) => {setUserData(user); setErrorMsg("");}} />
    </div>
  );
}
