import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'User ID',
      credentials: {
        userId: { label: 'User ID', type: 'text' },
      },
      async authorize(credentials) {
        const userId = (credentials?.userId as string)?.trim()
        if (!userId) return null

        let user = await prisma.user.findFirst({
          where: { email: userId },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: userId,
              name: userId,
              updatedAt: new Date(),
            },
          })
        }

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
