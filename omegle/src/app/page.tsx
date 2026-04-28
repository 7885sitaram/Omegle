"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/LanguageContext";
import { LanguageSwitcher } from "@/Components/LanguageSwitcher";

import { toast } from "sonner";

type Mode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register" && !otpMode) {
        const sendRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const sendData = await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) throw new Error(sendData.message || "Failed to send verification code");
        
        toast.success("Verification code sent to your email!");
        setOtpMode(true);
        return;
      }

      if (mode === "register" && otpMode) {
        const verifyRes = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok) throw new Error(verifyData.message || "Invalid verification code");
      }

      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: mode === "register" ? name : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Authentication failed");
      }

      const data = await res.json().catch(() => ({}));

      if (mode === "register") {
        toast.success("Account created successfully! Please login.");
        setMode("login");
        setOtpMode(false);
        setOtp("");
        setPassword("");
        return;
      }

      if (data?.user?.id) {
        try {
          localStorage.setItem("userId", data.user.id);
          if (data.isProfileCompleted) {
            localStorage.setItem("profileCompleted", "true");
          }
        } catch {
          // ignore storage errors (e.g. SSR)
        }
      }

      toast.success(mode === "login" ? "Welcome back!" : "Registration successful!");

      // If profile is already completed, go to dashboard directly
      if (data.isProfileCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/dashboard?setup=1");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      toast.error("Google Sign-In failed");
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#020617] text-white px-4">
      {/* Top Right: Language Switcher */}
      <div className="absolute top-6 right-6 z-[100]">
        <LanguageSwitcher />
      </div>

      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-10 items-center">
        <div className="hidden md:flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-wide">
            Stranger<span className="text-blue-500">Chat</span>
          </h1>
          <p className="text-gray-400">
            Talk to strangers, make friends, and explore the world.
          </p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Anonymous & Secure</li>
            <li>• Quick Match</li>
            <li>• Verified Profiles</li>
          </ul>
        </div>

        <div className="bg-[#020617]/60 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setOtpMode(false);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-gray-400 hover:bg-white/5"
                }`}
              >
                Already have an account?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setOtpMode(false);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  mode === "register"
                    ? "bg-green-600 text-white"
                    : "bg-transparent text-gray-400 hover:bg-white/5"
                }`}
              >
                New here?
              </button>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-1">
            {mode === "login" ? "Login to continue" : "Create an account"}
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            {mode === "login"
              ? "Welcome back! Enter your details to start chatting."
              : otpMode
              ? "We've sent a 6-digit verification code to your email."
              : "Join millions of strangers and start making connections."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && otpMode ? (
              <div>
                <label className="block text-xs mb-1 text-gray-400">
                  {t("auth.verify_code") || "Verification Code"}
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-[#020617] border border-gray-700 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-blue-500 text-center tracking-[0.5em] font-mono"
                  placeholder="------"
                  maxLength={6}
                  required
                />
                <p className="text-[10px] text-gray-400 mt-2 text-center">
                  We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
                </p>
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:text-blue-400 mt-2 block mx-auto underline"
                  onClick={() => setOtpMode(false)}
                >
                  Change Email
                </button>
              </div>
            ) : (
              <>
                {mode === "register" && (
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">
                      Username
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#020617] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Username"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs mb-1 text-gray-400">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1 text-gray-400">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#020617] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:hover:bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : otpMode
                ? "Verify & Register"
                : "Send Verification Code"}
            </button>
          </form>

          <div className="flex items-center my-5">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="px-3 text-[10px] uppercase tracking-wide text-gray-500">
              or continue with
            </span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full border border-gray-700 hover:border-white/60 bg-white/5 hover:bg-white/10 text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.3-.2-2H12z"
              />
              <path
                fill="#34A853"
                d="M6.5 14.3l-.8.6-2.5 1.9C4.6 19.8 8.1 22 12 22c2.4 0 4.5-.8 6-2.2l-3.1-2.4C14 18.2 13.1 18.5 12 18.5c-2.3 0-4.2-1.5-4.9-3.5z"
              />
              <path
                fill="#4A90E2"
                d="M3.2 7.6C2.4 9 2 10.5 2 12s.4 3 1.2 4.4L6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2z"
              />
              <path
                fill="#FBBC05"
                d="M12 5.5c1.3 0 2.4.4 3.3 1.2l2.5-2.5C16.5 2.7 14.4 2 12 2 8.1 2 4.6 4.2 3.2 7.6L6.5 10c.7-2 2.6-3.5 4.9-3.5z"
              />
              <path fill="none" d="M2 2h20v20H2z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          <p className="mt-4 text-[10px] text-gray-500 text-center">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

