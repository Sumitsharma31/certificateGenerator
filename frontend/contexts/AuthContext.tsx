'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '@/lib/api'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'mentor' | 'admin'
  avatarUrl?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, otp: string) => Promise<{ user: User; isNewUser?: boolean } | void>
  requestOTP: (email: string) => Promise<void>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = Cookies.get('token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await api.get('/auth/me')
      setUser(response.data.user)
    } catch (error) {
      Cookies.remove('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const requestOTP = async (email: string) => {
    try {
      await api.post('/auth/request-otp', { email })
      toast.success('OTP sent to your email')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send OTP')
      throw error
    }
  }

  const login = async (email: string, otp: string) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp })
      const { token, user: userData, isNewUser } = response.data

      Cookies.set('token', token, { expires: 7 })
      setUser(userData)
      toast.success('Login successful')
      return { user: userData, isNewUser } // Return user data & isNewUser flag
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid OTP')
      throw error
    }
  }

  const logout = () => {
    Cookies.remove('token')
    setUser(null)
    toast.success('Logged out successfully')
    router.push('/')
  }

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...userData } : null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        requestOTP,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

