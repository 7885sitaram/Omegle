import { NextResponse } from "next/server"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.email || !body.otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      )
    }

    const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Verifying OTP failed" },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Verify OTP API error:", error)
    return NextResponse.json(
      { message: "Failed to verify code" },
      { status: 500 }
    )
  }
}
