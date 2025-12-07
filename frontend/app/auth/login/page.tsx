'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [loading, setLoading] = useState(false)
  const { requestOTP, login, user } = useAuth()
  const router = useRouter()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') router.push('/admin/dashboard')
      else if (user.role === 'student') router.push('/student/dashboard')
      else router.push('/')
    }
  }, [user, router])

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      await requestOTP(email)
      setStep('otp')
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) return

    setLoading(true)
    try {
      const userData = await login(email, otp)

      if (userData) {
        if (userData.role === 'admin') router.push('/admin/dashboard')
        else if (userData.role === 'student') router.push('/student/dashboard')
        else router.push('/')
      }
    } catch (error) {
      // Error handled in context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-600">
            {step === 'email'
              ? 'Enter your email to receive an OTP'
              : 'Enter the OTP sent to your email'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 placeholder:text-slate-400"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base min-h-[44px]"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-slate-700 mb-2">
                OTP Code
              </label>
              <input
                id="otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest bg-white text-slate-900 placeholder:text-slate-400"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-sm text-slate-500 mt-2">
                OTP valid for 10 minutes
              </p>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setOtp('')
                }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-200 transition-colors font-medium text-base min-h-[44px]"
              >
                Change Email
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base min-h-[44px]"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/certificates/verify" className="text-blue-600 hover:text-blue-700 text-sm">
            Verify a Certificate
          </Link>
        </div>
      </div>
    </div>
  )
}
