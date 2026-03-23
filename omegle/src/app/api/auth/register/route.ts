import { NextResponse } from "next/server"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      )
    }

    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message || "Registration failed" },
        { status: res.status }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Register API error:", error)
    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    )
  }
}

// export async function POST(req: Request) {
//   try {
//     const { email, password, name } = await req.json()

//     if (!email || !password) {
//       return NextResponse.json(
//         { message: "Email and password are required" },
//         { status: 400 }
//       )
//     }

//     // Simple placeholder – in real app you'd save to DB here.
//     return NextResponse.json(
//       {
//         message: "Registered successfully",
//         user: { email, name },
//       },
//       { status: 201 }
//     )
//   } catch (error) {
//     console.error("Register API error:", error)
//     return NextResponse.json(
//       { message: "Registration failed" },
//       { status: 500 }
//     )
//   }
// }

