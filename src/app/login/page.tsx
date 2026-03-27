'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!userId.trim()) return
    setLoading(true)
    await signIn('credentials', { userId: userId.trim(), callbackUrl: '/' })
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <Card className="w-[400px] border-zinc-800 bg-zinc-900">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">뇌동방지턱</span>
          </div>
          <p className="text-sm text-zinc-400">OKX 트레이딩 저널 & 대시보드</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="User ID를 입력하세요"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            className="bg-zinc-950 border-zinc-700 text-zinc-50"
          />
          <Button
            onClick={handleLogin}
            disabled={!userId.trim() || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
