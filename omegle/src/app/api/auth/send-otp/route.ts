import { NextResponse } from "next/server"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    if (!body.email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      )
    }

    const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Sending OTP failed", reason: data.reason },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Send OTP API error:", error)
    return NextResponse.json(
      { message: "Failed to send code" },
      { status: 500 }
    )
  }
}
