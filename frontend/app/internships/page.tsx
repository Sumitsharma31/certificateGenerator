'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { InternshipCard, Internship } from '@/components/InternshipCard'

export default function InternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInternships()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [search])

  const fetchInternships = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: 'published',
        limit: '50',
      })
      if (search) params.append('search', search)

      const response = await api.get(`/internships?${params.toString()}`)
      setInternships(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load internships')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero Section */}
      {/* Added pt-28 to push content below the fixed navbar */}
      <div className="bg-white border-b border-slate-200 pt-28 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Find Your Perfect <span className="text-blue-600">Internship</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Launch your career with industry-standard projects. Learn by doing and get certified.
            </p>
          </div>

          <div className="max-w-xl mx-auto relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by title, skill, or technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-sm text-base placeholder:text-slate-400 text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading opportunities...</p>
          </div>
        ) : (
          <>
            {internships.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {internships.map((internship) => (
                  <InternshipCard key={internship._id} internship={internship} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No internships found</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-6">
                  We couldn't find any internships matching "{search}".
                </p>
                <button
                  onClick={() => setSearch('')}
                  className="px-6 py-2 bg-blue-50 text-blue-600 font-semibold rounded-xl hover:bg-blue-100 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}