import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function getAuthUser() {
  const session = await auth()
  if (!session?.user?.id) {
    return null
  }
  return { id: session.user.id, name: session.user.name, email: session.user.email, image: session.user.image }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
