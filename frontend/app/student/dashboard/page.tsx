'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  BookOpen,
  Award,
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react'

// --- Interfaces ---
interface Internship {
  _id: string
  title: string
  description: string
  priceInINR: number
  image?: string
  skills?: string[]
  level?: 'beginner' | 'intermediate' | 'advanced'
}

interface Enrollment {
  _id: string
  internshipId: Internship | null
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  progress: {
    percentage: number
  }
  certificateId?: {
    certId: string
  }
}

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    active: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200"
  }
  const statusKey = status.toLowerCase() as keyof typeof styles

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${styles[statusKey] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  )
}

// Reusable Image Component with Fallback Logic
const InternshipImage = ({ src, title, className }: { src?: string, title: string, className?: string }) => {
  const [error, setError] = useState(false)

  if (src && !error) {
    return (
      <img
        src={src}
        alt={title}
        onError={() => setError(true)}
        className={`object-cover w-full h-full ${className}`}
      />
    )
  }

  // Fallback Gradient
  return (
    <div className={`w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center ${className}`}>
      <span className="text-white/20 text-3xl font-bold uppercase tracking-widest select-none">
        {title.slice(0, 2)}
      </span>
    </div>
  )
}

// Recommended Internship Card Component
const DashboardInternshipCard = ({ internship }: { internship: Internship }) => {
  return (
    <Link
      href={`/internships/${internship._id}`}
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden h-full"
    >
      <div className="h-40 relative bg-slate-100 overflow-hidden">
        <InternshipImage src={internship.image} title={internship.title} className="group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wide">
            {internship.level || 'Course'}
          </span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
            {internship.title}
          </h3>
          <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
            {internship.description}
          </p>

          {/* Skills Tags */}
          {internship.skills && internship.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {internship.skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium rounded">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</p>
            <p className="text-lg font-bold text-slate-900">₹{internship.priceInINR.toLocaleString()}</p>
          </div>
          <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [internships, setInternships] = useState<Internship[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  // Certificate Name Confirmation State
  const [showNameModal, setShowNameModal] = useState(false)
  const [tempName, setTempName] = useState('')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null)

  // Auth guard — redirect unauthenticated or wrong-role users
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/auth/login')
    } else if (user.role !== 'student') {
      router.replace('/')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!authLoading && user?.role === 'student') {
      fetchData()
    }
  }, [authLoading, user])

  const fetchData = async () => {
    try {
      const [internshipsRes, enrollmentsRes] = await Promise.all([
        api.get('/internships?status=published&limit=10'), // Fetch more to allow for filtering enrolled ones
        api.get('/enrollments'),
      ])

      setInternships(internshipsRes.data.data || [])
      setEnrollments(enrollmentsRes.data.data || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }


  const handleGenerateCertificate = (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    setTempName(user?.name || '');
    setShowNameModal(true);
  };

  const proceedWithGeneration = async () => {
    if (!selectedEnrollmentId) return;

    let toastId;
    try {
      setShowNameModal(false);
      toastId = toast.loading('Generating certificate...');

      const response = await api.post('/certificates/generate', {
        enrollmentId: selectedEnrollmentId,
        studentName: tempName
      });

      if (response.data.success) {
        toast.success('Certificate generated successfully! Check your mail for the certificate.', { id: toastId });
        fetchData(); // Refresh data to show View Certificate button
      }
    } catch (error: any) {
      console.error('Certificate generation error:', error);
      toast.dismiss(toastId);
      toast.error(error.response?.data?.error || 'Failed to generate certificate');
    }
  };

  // Filter valid enrollments
  const activeEnrollments = enrollments.filter(enrollment =>
    enrollment.internshipId !== null &&
    (enrollment.status === 'active' || enrollment.status === 'completed')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Added pt-24 (padding-top: 6rem) to create gap between fixed Navbar and content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24 space-y-10">

        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              You are doing great! Keep learning and growing.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><BookOpen className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Enrolled</p>
                <p className="text-xl font-bold text-slate-900">{activeEnrollments.length}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg"><Award className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase">Completed</p>
                <p className="text-xl font-bold text-slate-900">
                  {activeEnrollments.filter(e => e.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* --- Recommended Section --- */}

        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
              Recommended for You
            </h2>
            <Link href="/internships" className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internships
              .filter(internship => !enrollments.some(e => e.internshipId?._id === internship._id && (e.status === 'active' || e.status === 'completed')))
              .slice(0, 3)
              .map((internship) => (
                <DashboardInternshipCard key={internship._id} internship={internship} />
              ))}
          </div>
        </section>
        {/* --- My Enrollments Section --- */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
              My Learning
            </h2>
          </div>

          {activeEnrollments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">Start your learning journey</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                You haven't enrolled in any internships yet. Browse our catalog to find your next skill.
              </p>
              <Link
                href="/internships"
                className="inline-flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm shadow-blue-200"
              >
                Browse Catalog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEnrollments.map((enrollment) => {
                if (!enrollment.internshipId) return null;

                return (
                  <div
                    key={enrollment._id}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden h-full"
                  >
                    <div className="h-40 relative bg-slate-100 overflow-hidden">
                      <InternshipImage src={enrollment.internshipId.image} title={enrollment.internshipId.title} className="group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={enrollment.status} />
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
                          {enrollment.internshipId.title}
                        </h3>
                        {/* Skills Tags */}
                        {enrollment.internshipId.skills && enrollment.internshipId.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {enrollment.internshipId.skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 mt-auto pt-3 border-t border-slate-100">
                        {enrollment.certificateId ? (
                          <Link
                            href={`/certificates/${enrollment.certificateId.certId}`}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-2 rounded-xl text-sm font-bold transition-colors"
                          >
                            <Award className="w-4 h-4" /> View Certificate
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleGenerateCertificate(enrollment._id)}
                            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-xl text-sm font-bold transition-colors"
                          >
                            <Sparkles className="w-4 h-4" /> Generate Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* CONFIRM NAME MODAL */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Confirm Name for Certificate
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              This name will be permanently displayed on your certificate. Please ensure it is correct and matches your official documents.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter your full name"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithGeneration}
                disabled={!tempName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}