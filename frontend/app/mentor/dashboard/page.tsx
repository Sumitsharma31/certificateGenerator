'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Internship {
  _id: string
  title: string
  description: string
  status: string
  seats: number
  priceInINR: number
}

export default function MentorDashboard() {
  const { user } = useAuth()
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInternships()
  }, [])

  const fetchInternships = async () => {
    try {
      const response = await api.get(`/internships?mentorId=${user?.id}`)
      setInternships(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load internships')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen py-8 pt-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Mentor Dashboard
            </h1>
            <Link
              href="/mentor/internships/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Internship
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">
              My Internships
            </h2>
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : internships.length === 0 ? (
              <div className="bg-white rounded-lg shadow border border-slate-200 p-6 text-center">
                <p className="text-slate-500 mb-4">You haven't created any internships yet.</p>
                <Link
                  href="/mentor/internships/create"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Internship
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map((internship) => (
                  <div key={internship._id} className="bg-white rounded-lg shadow border border-slate-200 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">{internship.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${internship.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {internship.status}
                      </span>
                    </div>
                    <p className="text-slate-500 mb-4 line-clamp-2">
                      {internship.description}
                    </p>
                    <p className="text-xl font-bold text-blue-600 mb-4">
                      ₹{internship.priceInINR}
                    </p>
                    <Link
                      href={`/mentor/internships/${internship._id}`}
                      className="block text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Manage
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
