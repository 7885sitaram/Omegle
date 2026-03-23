import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId:
        (process.env.GOOGLE_CLIENT_ID as string) ||
        (process.env.GITHUB_ID as string),
      clientSecret:
        (process.env.GOOGLE_CLIENT_SECRET as string) ||
        (process.env.GITHUB_SECRET as string),
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }


