import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function getAuthUser() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }

  // Ensure user exists in DB (handles DB reset while JWT session persists)
  const existing = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!existing) {
    await prisma.user.create({
      data: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        updatedAt: new Date(),
      },
    })
  }

  return { id: session.user.id, name: session.user.name, email: session.user.email, image: session.user.image }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
