'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'admin') {
          router.push('/admin/dashboard')
        } else if (user.role === 'student') {
          router.push('/student/dashboard')
        } else {
          // Fallback or other roles
          router.push('/auth/login')
        }
      } else {
        // Not authenticated - redirect to login
        router.push('/auth/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )
}
