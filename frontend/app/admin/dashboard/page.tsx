'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, BookOpen, Users, GraduationCap,
  CreditCard, Award, Plus, Search,
  X, Loader2, Menu, ChevronRight
} from 'lucide-react'

// --- Types ---
interface User {
  _id: string
  name: string
  email: string
  role: 'student' | 'mentor' | 'admin'
  createdAt: string
  updatedAt: string
  lastLogin?: string
  isEmailVerified: boolean
  isBanned?: boolean
  enrollmentCount?: number
}

interface Internship {
  _id: string
  title: string
  description: string
  priceInINR: number
  duration?: string
  level?: 'beginner' | 'intermediate' | 'advanced'
  image?: string
  isPublished: boolean
  modules?: Array<{
    title: string;
    content: string;
    quiz?: Array<{ question: string; options: string[]; correctAnswer: number }>
  }>
  startDate: string
  endDate: string
  status: 'draft' | 'published' | 'archived'
  skills: string[]
}

interface Enrollment {
  _id: string
  userId: { _id: string; name: string; email: string }
  internshipId: { _id: string; title: string; description: string }
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  progress: { percentage: number }
  payment: { amount: number; status: string; capturedAt?: string }
  createdAt: string
  completedAt?: string
}

interface Payment {
  _id: string
  orderId: string
  userId: { _id: string; name: string; email: string }
  internshipId: { _id: string; title: string }
  amount: number
  status: 'pending' | 'success' | 'failed' | 'refunded'
  paymentMethod: string
  transactionId?: string
  createdAt: string
}

type TabType = 'stats' | 'internships' | 'students' | 'enrollments' | 'payments' | 'certificates'

// --- UI Components ---
const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
)

const Badge = ({ children, color }: { children: React.ReactNode, color: 'green' | 'blue' | 'yellow' | 'red' | 'gray' }) => {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      {children}
    </span>
  )
}

const Button = ({ children, variant = 'primary', className = "", ...props }: any) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200',
    ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
  }
  return (
    <button
      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <input
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900"
      {...props}
    />
  </div>
)

const Select = ({ label, children, ...props }: any) => (
  <div className="space-y-1.5">
    {label && <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">{label}</label>}
    <div className="relative">
      <select
        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm appearance-none text-slate-900"
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronRight className="w-4 h-4 rotate-90" />
      </div>
    </div>
  </div>
)

// Helper to handle view state image errors in Admin Panel
const InternshipImagePreview = ({ src, title }: { src?: string, title: string }) => {
  const [error, setError] = useState(false)

  // Only show image if src exists AND no error
  if (src && !error) {
    return (
      <img
        src={src}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    )
  }

  // Fallback if no image or error
  return (
    <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
      <span className="text-white text-3xl font-bold uppercase tracking-widest">{title.slice(0, 2)}</span>
    </div>
  )
}

// --- Main Dashboard Component ---

export default function AdminDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('stats')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // State
  const [stats, setStats] = useState({ totalStudents: 0, totalEnrollments: 0, totalRevenue: 0, certificatesIssued: 0, recentPayments: [] as any[], recentUsers: [] as User[] })
  const [loading, setLoading] = useState(true)

  // Internships State
  const [internships, setInternships] = useState<Internship[]>([])
  const [internshipsLoading, setInternshipsLoading] = useState(false)
  const [showInternshipForm, setShowInternshipForm] = useState(false)
  const [editingInternship, setEditingInternship] = useState<Internship | null>(null)
  const [viewingInternship, setViewingInternship] = useState<Internship | null>(null)
  const [internshipSearch, setInternshipSearch] = useState('')
  const [internshipFilter, setInternshipFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  const [internshipForm, setInternshipForm] = useState({
    title: '', description: '', priceInINR: 0, duration: '', level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    image: '', isPublished: false,
    modules: [] as Array<{ title: string; content: string; quiz?: Array<{ question: string; options: string[]; correctAnswer: number }> }>,
    skills: '', status: 'published' as 'draft' | 'published' | 'archived'
  })
  const [submitting, setSubmitting] = useState(false)

  // Students, Enrollments, Payments State
  const [students, setStudents] = useState<User[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [editingStudent, setEditingStudent] = useState<User | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false)
  const [showManualEnrollment, setShowManualEnrollment] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [showOfflinePayment, setShowOfflinePayment] = useState(false)
  const [certificateEnrollmentId, setCertificateEnrollmentId] = useState('')
  const [certificateResendId, setCertificateResendId] = useState('')

  // --- API Functions ---
  useEffect(() => { fetchDashboard() }, [])

  useEffect(() => {
    if (activeTab === 'internships') {
      const timeoutId = setTimeout(() => fetchInternships(), internshipSearch ? 500 : 0)
      return () => clearTimeout(timeoutId)
    } else if (activeTab === 'students') fetchStudents()
    else if (activeTab === 'enrollments') fetchEnrollments()
    else if (activeTab === 'payments') fetchPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, internshipSearch, internshipFilter])

  useEffect(() => { if (paymentFilter !== 'all') fetchPayments() }, [paymentFilter])

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/admin/dashboard')
      if (res.data.success && res.data.data) setStats(res.data.data)
    } catch (error: any) { console.error(error); toast.error('Failed to load dashboard') } finally { setLoading(false) }
  }

  const fetchInternships = async () => {
    setInternshipsLoading(true)
    try {
      const params = new URLSearchParams()
      if (internshipSearch) params.append('search', internshipSearch)
      if (internshipFilter !== 'all') params.append('status', internshipFilter)
      const res = await api.get(`/admin/internships?${params.toString()}`)
      setInternships(res.data.data || [])
    } catch (error: any) { toast.error('Failed to load internships') } finally { setInternshipsLoading(false) }
  }

  const fetchStudents = async () => {
    setStudentsLoading(true)
    try {
      const res = await api.get('/admin/students')
      setStudents(res.data.data || [])
    } catch (error: any) { toast.error('Failed to load students') } finally { setStudentsLoading(false) }
  }

  const fetchEnrollments = async () => {
    setEnrollmentsLoading(true)
    try {
      const res = await api.get('/admin/enrollments')
      setEnrollments(res.data.data || [])
    } catch (error: any) { toast.error('Failed to load enrollments') } finally { setEnrollmentsLoading(false) }
  }

  const fetchPayments = async () => {
    setPaymentsLoading(true)
    try {
      const url = paymentFilter !== 'all' ? `/admin/payments?status=${paymentFilter}` : '/admin/payments'
      const res = await api.get(url)
      setPayments(res.data.data || [])
    } catch (error: any) { toast.error('Failed to load payments') } finally { setPaymentsLoading(false) }
  }

  // --- Handlers ---
  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      const skillsArray = internshipForm.skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
      const validModules = internshipForm.modules.filter(m => m.title && m.content)
      const payload: any = { ...internshipForm, priceInINR: parseFloat(internshipForm.priceInINR.toString()), skills: skillsArray, modules: validModules }
      delete payload.seats; delete payload.startDate; delete payload.endDate
      if (editingInternship) {
        await api.patch(`/admin/internships/${editingInternship._id}`, payload)
        toast.success('Updated successfully!')
      } else {
        await api.post('/admin/internships', payload)
        toast.success('Created successfully!')
      }
      setShowInternshipForm(false); setEditingInternship(null); resetInternshipForm(); fetchInternships(); fetchDashboard()
    } catch (error: any) { toast.error('Failed to save') } finally { setSubmitting(false) }
  }

  const handleDeleteInternship = async (id: string) => {
    if (!confirm('Delete this internship?')) return
    try { await api.delete(`/admin/internships/${id}`); toast.success('Deleted!'); fetchInternships() } catch (error) { toast.error('Failed delete') }
  }

  const resetInternshipForm = () => {
    setInternshipForm({ title: '', description: '', priceInINR: 0, duration: '', level: 'beginner', image: '', isPublished: false, modules: [], skills: '', status: 'published' })
  }

  // --- Helper to handle view state image errors in Admin Panel
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // --- Module Handlers ---
  const addModule = () => {
    setInternshipForm(prev => ({
      ...prev,
      modules: [...prev.modules, { title: '', content: '', quiz: [] }]
    }))
  }

  const updateModule = (index: number, field: 'title' | 'content' | 'quiz', value: any) => {
    setInternshipForm(prev => ({
      ...prev,
      modules: prev.modules.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }))
  }

  const removeModule = (index: number) => {
    setInternshipForm(prev => ({ ...prev, modules: prev.modules.filter((_, i) => i !== index) }))
  }

  // --- Render Helpers ---

  const tabs = [
    { id: 'stats', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'internships', label: 'Internships', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'enrollments', label: 'Enrollments', icon: GraduationCap },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0`}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mr-3">A</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">AdminPanel</span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Admin'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@example.com'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Mobile */}
        <div className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <span className="font-bold text-slate-900">Admin Panel</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h1>
                <p className="text-slate-500 text-sm mt-1">Manage your platform efficiently.</p>
              </div>
              {/* Dynamic Action Buttons */}
              {activeTab === 'internships' && (
                <Button onClick={() => { resetInternshipForm(); setEditingInternship(null); setShowInternshipForm(true); }}>
                  <Plus className="w-4 h-4" /> New Internship
                </Button>
              )}
              {activeTab === 'enrollments' && (
                <Button onClick={() => setShowManualEnrollment(true)}>
                  <Plus className="w-4 h-4" /> Enroll Student
                </Button>
              )}
              {activeTab === 'payments' && (
                <Button onClick={() => setShowOfflinePayment(true)}>
                  <Plus className="w-4 h-4" /> Record Payment
                </Button>
              )}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* --- STATS VIEW --- */}
                {activeTab === 'stats' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'blue' },
                        { label: 'Enrollments', value: stats.totalEnrollments, icon: BookOpen, color: 'indigo' },
                        { label: 'Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: CreditCard, color: 'emerald' },
                        { label: 'Certificates', value: stats.certificatesIssued, icon: Award, color: 'amber' },
                      ].map((stat, idx) => (
                        <Card key={idx} className="p-6 flex items-start justify-between hover:shadow-md transition-shadow">
                          <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
                          </div>
                          <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                            <stat.icon className="w-6 h-6" />
                          </div>
                        </Card>
                      ))}
                    </div>
                    {/* Simplified Stats Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h3 className="text-lg font-bold mb-4 text-slate-900">Recent Payments</h3>
                        <div className="space-y-4">
                          {stats.recentPayments.length === 0 ? <p className="text-slate-500 text-sm">No data available</p> :
                            stats.recentPayments.map((p, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{p.user?.name?.[0]}</div>
                                  <div><p className="text-sm font-medium text-slate-900">{p.user?.name}</p><p className="text-xs text-slate-500">{p.internship?.title}</p></div>
                                </div>
                                <div className="text-right"><p className="text-sm font-bold text-slate-900">₹{p.amount}</p></div>
                              </div>
                            ))
                          }
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {/* --- INTERNSHIPS VIEW --- */}
                {activeTab === 'internships' && (
                  <div className="space-y-6">
                    {/* Filters & Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">Internships</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {internships.length}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            placeholder="Search internships..."
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 w-full sm:w-64"
                            value={internshipSearch}
                            onChange={(e) => setInternshipSearch(e.target.value)}
                          />
                        </div>
                        <select
                          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                          value={internshipFilter}
                          onChange={(e: any) => setInternshipFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    {/* Internships Table */}
                    {internshipsLoading ? (
                      <div className="p-12 text-center flex justify-center">
                        <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                      </div>
                    ) : internships.length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                          <BookOpen className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">No internships found</h3>
                        <p className="text-slate-500">Get started by creating your first internship program.</p>
                      </div>
                    ) : (
                      <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-500">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                              <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {internships.map((internship) => (
                                <tr key={internship._id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                        {internship.image ? (
                                          <img src={internship.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold text-xs">
                                            {internship.title.slice(0, 2).toUpperCase()}
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900 line-clamp-1 max-w-[200px]" title={internship.title}>
                                          {internship.title}
                                        </p>
                                        <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">
                                          {internship.skills.slice(0, 2).join(', ')}
                                          {internship.skills.length > 2 && ' +'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${internship.level === 'beginner' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      internship.level === 'intermediate' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-purple-50 text-purple-700 border-purple-200'
                                      }`}>
                                      {internship.level}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 font-medium text-slate-900">
                                    ₹{internship.priceInINR.toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4">
                                    {internship.duration || '-'}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge color={internship.isPublished ? 'green' : 'yellow'}>
                                      {internship.isPublished ? 'Live' : 'Draft'}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => setViewingInternship(internship)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View Details"
                                      >
                                        <BookOpen className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingInternship(internship)
                                          setInternshipForm({
                                            title: internship.title,
                                            description: internship.description,
                                            priceInINR: internship.priceInINR,
                                            duration: internship.duration || '',
                                            level: internship.level || 'beginner',
                                            image: internship.image || '',
                                            isPublished: internship.isPublished,
                                            modules: internship.modules || [],
                                            skills: internship.skills.join(', '),
                                            status: internship.status
                                          })
                                          setShowInternshipForm(true)
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                      >
                                        <LayoutDashboard className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteInternship(internship._id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
                {activeTab === 'enrollments' && (
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-slate-900">Enrollments</h2>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {stats.totalEnrollments}
                        </span>
                      </div>

                      <div className="flex gap-4">
                        <select
                          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                          onChange={(e) => {
                            // Triggers fetchEnrollments with this status
                            // You need to update your fetchEnrollments function to use this state
                            // See the "Logic Update" below
                            const status = e.target.value;
                            api.get(`/admin/enrollments${status !== 'all' ? `?status=${status}` : ''}`)
                              .then(res => setEnrollments(res.data.data))
                              .catch(() => toast.error('Filter failed'));
                          }}
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active (Paid)</option>
                          <option value="pending">Pending (Failed/Unpaid)</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>

                    {/* Table Card */}
                    <Card className="overflow-hidden">
                      {enrollmentsLoading ? (
                        <div className="p-12 text-center flex justify-center">
                          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm text-slate-500">
                            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                              <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Internship</th>
                                <th className="px-6 py-4">Payment</th>
                                <th className="px-6 py-4">Progress</th>
                                <th className="px-6 py-4">Joined Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {enrollments.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No enrollments found.
                                  </td>
                                </tr>
                              ) : (
                                enrollments.map((enroll) => (
                                  <tr key={enroll._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs uppercase">
                                          {enroll.userId?.name?.[0] || 'U'}
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-900">{enroll.userId?.name || 'Unknown User'}</p>
                                          <p className="text-xs text-slate-500">{enroll.userId?.email}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <p className="font-medium text-slate-900 truncate max-w-[150px]">
                                        {enroll.internshipId?.title || 'Unknown Internship'}
                                      </p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col items-start gap-1">
                                        {/* STATUS BADGE LOGIC */}
                                        {enroll.status === 'pending' ? (
                                          <Badge color="yellow">Pending Payment</Badge>
                                        ) : enroll.status === 'active' ? (
                                          <Badge color="green">Paid & Active</Badge>
                                        ) : enroll.status === 'completed' ? (
                                          <Badge color="blue">Completed</Badge>
                                        ) : (
                                          <Badge color="red">Cancelled</Badge>
                                        )}

                                        {/* Price Display */}
                                        <span className="text-xs font-medium text-slate-500">
                                          {enroll.payment?.amount > 0
                                            ? `₹${enroll.payment.amount.toLocaleString()}`
                                            : 'Free'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="w-24">
                                        <div className="flex justify-between text-xs mb-1">
                                          <span className="text-slate-900">{enroll.progress?.percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${enroll.status === 'pending' ? 'bg-yellow-400' : 'bg-blue-600'}`}
                                            style={{ width: `${enroll.progress?.percentage || 0}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                      {new Date(enroll.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={async () => {
                                          if (!confirm('Delete this enrollment record? This cannot be undone.')) return;
                                          try {
                                            await api.delete(`/admin/enrollments/${enroll._id}`);
                                            toast.success('Enrollment deleted');
                                            fetchEnrollments(); // Refresh list
                                          } catch (e) {
                                            toast.error('Failed to delete');
                                          }
                                        }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete Enrollment"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* --- STUDENTS VIEW --- */}
                {activeTab === 'students' && (
                  <Card className="overflow-hidden">
                    {studentsLoading ? <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
                            <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {students.map((student) => (
                              <tr key={student._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{student.name}</td>
                                <td className="px-6 py-4 text-slate-500">{student.email}</td>
                                <td className="px-6 py-4"><Badge color={student.isBanned ? 'red' : student.isEmailVerified ? 'green' : 'yellow'}>{student.isBanned ? 'Banned' : student.isEmailVerified ? 'Verified' : 'Pending'}</Badge></td>
                                <td className="px-6 py-4 text-right"><button onClick={() => setEditingStudent(student)} className="text-blue-600 hover:underline">Manage</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                )}
                {/* Other tabs simplified for space */}
                {activeTab === 'enrollments' && <Card className="p-6"><p>Enrollment Table...</p></Card>}
                {activeTab === 'payments' && <Card className="p-6"><p>Payments Table...</p></Card>}
                {activeTab === 'certificates' && <Card className="p-6"><p>Certificates Tools...</p></Card>}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {/* CREATE/EDIT MODAL */}
        {showInternshipForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-slate-900">{editingInternship ? 'Edit Internship' : 'Create Internship'}</h2>
                <button onClick={() => setShowInternshipForm(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreateInternship} className="p-6 space-y-4">
                <Input label="Title" value={internshipForm.title} onChange={(e: any) => setInternshipForm({ ...internshipForm, title: e.target.value })} required />
                <Input label="Image URL" value={internshipForm.image} onChange={(e: any) => setInternshipForm({ ...internshipForm, image: e.target.value })} placeholder="https://example.com/image.jpg" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input label="Price (INR)" type="number" value={internshipForm.priceInINR} onChange={(e: any) => setInternshipForm({ ...internshipForm, priceInINR: e.target.value })} required />
                  <Input label="Duration" placeholder="e.g. 1 months" value={internshipForm.duration} onChange={(e: any) => setInternshipForm({ ...internshipForm, duration: e.target.value })} required />
                  <Select label="Level" value={internshipForm.level} onChange={(e: any) => setInternshipForm({ ...internshipForm, level: e.target.value })}>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Description</label>
                  <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900" rows={4} value={internshipForm.description} onChange={(e) => setInternshipForm({ ...internshipForm, description: e.target.value })} />
                </div>
                <Input label="Skills (comma separated)" value={internshipForm.skills} onChange={(e: any) => setInternshipForm({ ...internshipForm, skills: e.target.value })} />

                {/* Course Curriculum Section */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-900">Course Curriculum</label>
                    <button type="button" onClick={addModule} className="text-xs text-blue-600 font-bold hover:underline">+ Add Module</button>
                  </div>
                  <div className="space-y-3">
                    {internshipForm.modules.map((module, index) => (
                      <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                        <button
                          type="button"
                          onClick={() => removeModule(index)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 w-6 h-6 rounded flex items-center justify-center">
                            {index + 1}
                          </span>
                          <input
                            placeholder="Module Title (e.g. Introduction to React)"
                            className="flex-1 bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-medium pb-1"
                            value={module.title}
                            onChange={(e) => updateModule(index, 'title', e.target.value)}
                          />
                        </div>
                        <textarea
                          placeholder="Brief description of what will be covered..."
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                          rows={2}
                          value={module.content}
                          onChange={(e) => updateModule(index, 'content', e.target.value)}
                        />

                        {/* Quiz Builder for this Module */}
                        <div className="mt-2 bg-white border border-slate-100 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Quiz ({module.quiz?.length || 0} Questions)</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newQuiz = [...(module.quiz || []), { question: '', options: ['', '', '', ''], correctAnswer: 0 }];
                                updateModule(index, 'quiz', newQuiz);
                              }}
                              className="text-xs text-blue-600 font-bold hover:underline"
                            >
                              + Add Question
                            </button>
                          </div>

                          {module.quiz && module.quiz.map((q: any, qIndex: number) => (
                            <div key={qIndex} className="p-3 bg-slate-50 rounded-lg mb-2 border border-slate-200">
                              <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold text-slate-400">Q{qIndex + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQuiz = (module.quiz || []).filter((_: any, i: number) => i !== qIndex);
                                    updateModule(index, 'quiz', newQuiz);
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                              <input
                                placeholder="Question Text"
                                className="w-full mb-2 bg-white border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                                value={q.question}
                                onChange={(e) => {
                                  const newQuiz = [...(module.quiz || [])];
                                  newQuiz[qIndex].question = e.target.value;
                                  updateModule(index, 'quiz', newQuiz);
                                }}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt: string, optIndex: number) => (
                                  <div key={optIndex} className="flex items-center gap-1">
                                    <input
                                      type="radio"
                                      name={`correct-${index}-${qIndex}`}
                                      checked={q.correctAnswer === optIndex}
                                      onChange={() => {
                                        const newQuiz = [...(module.quiz || [])];
                                        newQuiz[qIndex].correctAnswer = optIndex;
                                        updateModule(index, 'quiz', newQuiz);
                                      }}
                                      title="Select as correct answer"
                                      className="cursor-pointer"
                                    />
                                    <input
                                      placeholder={`Option ${optIndex + 1}`}
                                      className={`w-full bg-white border rounded px-2 py-1 text-xs outline-none focus:border-blue-500 ${q.correctAnswer === optIndex ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                                      value={opt}
                                      onChange={(e) => {
                                        const newQuiz = [...(module.quiz || [])];
                                        newQuiz[qIndex].options[optIndex] = e.target.value;
                                        updateModule(index, 'quiz', newQuiz);
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {internshipForm.modules.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                        No curriculum modules added.
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="pub" checked={internshipForm.isPublished} onChange={(e) => setInternshipForm({ ...internshipForm, isPublished: e.target.checked })} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="pub" className="text-sm font-medium text-slate-900">Publish immediately</label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button type="button" variant="ghost" onClick={() => setShowInternshipForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Internship'}</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* VIEW DETAILS MODAL */}
        {viewingInternship && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Internship Details</h2>
                <button onClick={() => setViewingInternship(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                {/* THIS COMPONENT HANDLES THE IMAGE FALLBACK */}
                <InternshipImagePreview src={viewingInternship.image} title={viewingInternship.title} />

                <h3 className="text-2xl font-bold mb-2 text-slate-900">{viewingInternship.title}</h3>
                <div className="flex gap-2 mb-4">
                  <Badge color="blue">{viewingInternship.level}</Badge>
                  <Badge color="green">₹{viewingInternship.priceInINR.toLocaleString()}</Badge>
                </div>
                <p className="text-slate-500 mb-6">{viewingInternship.description}</p>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-sm text-slate-500 uppercase mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingInternship.skills.map((s, i) => (
                      <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-900">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Enrollment Modal */}
      {
        showManualEnrollment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <h2 className="text-xl font-bold mb-4 text-slate-900">Enroll Student</h2>
              <p className="text-slate-500 mb-6">Enter User ID and Internship ID to manually enroll.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowManualEnrollment(false)}>Cancel</Button>
                <Button>Enroll</Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  )
}