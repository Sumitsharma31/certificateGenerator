'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import {
    Loader2, Calendar, Clock, Award, CheckCircle2,
    BookOpen, ChevronDown, ChevronUp, Lock, Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// --- Types ---
interface Module {
    _id: string
    title: string
    content: string
}

interface InternshipDetails {
    _id: string
    title: string
    description: string
    priceInINR: number
    image?: string
    skills: string[]
    level: string
    duration?: string
    modules: Module[]
    mentorId: {
        name: string
        email: string
    }
}

// Add Razorpay type definition to global window object
declare global {
    interface Window {
        Razorpay: any;
    }
}

// --- Helper Components ---

// 1. Image Component with Fallback
const ImageFallback = ({ src, alt }: { src?: string, alt: string }) => {
    const [error, setError] = useState(false)

    if (src && !error) {
        return (
            <img
                src={src}
                alt={alt}
                onError={() => setError(true)}
                className="w-full h-full object-cover"
            />
        )
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <span className="text-white/20 text-6xl font-bold uppercase tracking-widest select-none">
                {alt.slice(0, 2)}
            </span>
        </div>
    )
}

// 2. Accordion Component for Syllabus Modules
const ModuleItem = ({ module, index }: { module: Module, index: number }) => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left group"
            >
                <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {index + 1}
                    </span>
                    <h4 className="font-semibold text-slate-800">{module.title}</h4>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
            </button>

            {isOpen && (
                <div className="p-4 bg-white border-t border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                    {module.content}
                </div>
            )}
        </div>
    )
}

// 3. Date Selection Modal
const DateSelectionModal = ({
    isOpen,
    onClose,
    onConfirm,
    duration,
    loading
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: (startDate: string, endDate: string) => void,
    duration: string, // e.g., "2 Months", "6 Weeks"
    loading: boolean
}) => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        if (startDate && duration) {
            calculateEndDate(startDate, duration)
        }
    }, [startDate, duration])

    const calculateEndDate = (start: string, durationStr: string) => {
        const date = new Date(start)
        const parts = durationStr.toLowerCase().split(' ')
        const amount = parseInt(parts[0])
        const unit = parts[1] || 'months' // Default to months if unit is missing

        if (isNaN(amount)) return

        if (unit.includes('month')) {
            date.setMonth(date.getMonth() + amount)
        } else if (unit.includes('week')) {
            date.setDate(date.getDate() + (amount * 7))
        }

        setEndDate(date.toISOString().split('T')[0])
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Select Internship Dates</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            min={new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date (Calculated from Duration)</label>
                        <input
                            type="date"
                            value={endDate}
                            readOnly
                            disabled
                            className="w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 mt-1">Based on duration: {duration}</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(startDate, endDate)}
                            disabled={!startDate || !endDate || loading}
                            className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proceed to Payment'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Main Page Component ---

export default function InternshipDetailsPage() {
    const { id } = useParams()
    const router = useRouter()
    const { user } = useAuth()

    const [internship, setInternship] = useState<InternshipDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState(false)
    const [showDateModal, setShowDateModal] = useState(false)

    useEffect(() => {
        if (id) fetchInternship()
    }, [id])

    const fetchInternship = async () => {
        try {
            const res = await api.get(`/internships/${id}`)
            setInternship(res.data.data)
        } catch (error) {
            toast.error('Failed to load internship details')
            router.push('/internships')
        } finally {
            setLoading(false)
        }
    }

    // Helper to load Razorpay SDK dynamically
    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script')
            script.src = 'https://checkout.razorpay.com/v1/checkout.js'
            script.onload = () => resolve(true)
            script.onerror = () => resolve(false)
            document.body.appendChild(script)
        })
    }

    const handleEnrollClick = () => {
        if (!user) {
            toast.error('Please login to enroll')
            router.push('/auth/login')
            return
        }
        setShowDateModal(true)
    }

    const handleDateConfirm = async (startDate: string, endDate: string) => {
        setEnrolling(true) // Start Loading
        try {
            // 1. Call Backend to Create Enrollment & Order
            const res = await api.post(`/internships/${id}/enroll`, {
                startDate,
                endDate
            })

            // 2. Check if Payment is required
            if (res.data.razorpayOrder) {
                const isLoaded = await loadRazorpay()
                if (!isLoaded) {
                    toast.error('Failed to load payment gateway')
                    setEnrolling(false)
                    return
                }

                const currentEnrollmentId = res.data.enrollment._id;

                const options = {
                    key: res.data.razorpayOrder.key,
                    amount: res.data.razorpayOrder.amount,
                    currency: res.data.razorpayOrder.currency,
                    name: "CertifyNow",
                    description: internship?.title,
                    order_id: res.data.razorpayOrder.id,
                    image: "/logo.png",

                    // 3. Handle Payment Success
                    handler: async function (response: any) {
                        try {
                            toast.loading('Verifying payment...')
                            await api.post('/payments/verify', {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                enrollmentId: currentEnrollmentId
                            })

                            toast.dismiss()
                            toast.success('Enrollment Successful!')
                            router.push('/student/dashboard')
                        } catch (error: any) {
                            toast.dismiss()
                            toast.error(error.response?.data?.error || 'Payment verification failed')
                            setEnrolling(false) // Stop loading on verification fail
                        }
                    },

                    // 4. IMPORTANT: Handle User Closing the Popup (The Fix)
                    modal: {
                        ondismiss: function () {
                            toast('Payment cancelled');
                            setEnrolling(false);
                        }
                    },

                    prefill: {
                        name: user?.name || '',
                        email: user?.email || '',
                    },
                    theme: {
                        color: "#4f46e5",
                    },
                };

                const paymentObject = new window.Razorpay(options);
                paymentObject.open();

                // Handle technical failures
                paymentObject.on('payment.failed', function (response: any) {
                    toast.error(response.error.description);
                    setEnrolling(false); // Stop loading on failure
                });

            } else {
                // Free course logic
                toast.success('Enrolled successfully!')
                router.push('/student/dashboard')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to enroll')
            setEnrolling(false) // Stop loading on API error
        }
        // Don't close modal yet if error, allow retry? checking flows. 
        // Actually if successful we redirect. If error we stay.
        // We should ensure modal closes or stays based on logic.
        // For now, let's keep modal open on error so they can retry or cancel.
        // On success redirect happens.
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (!internship) return null

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            <Navbar />

            <DateSelectionModal
                isOpen={showDateModal}
                onClose={() => setShowDateModal(false)}
                onConfirm={handleDateConfirm}
                duration={internship.duration || '1 Month'}
                loading={enrolling}
            />

            {/* Hero Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="flex gap-2">
                                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider">
                                    {internship.level}
                                </span>
                                {internship.duration && (
                                    <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {internship.duration}
                                    </span>
                                )}
                            </div>

                            <h1 className="text-3xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
                                {internship.title}
                            </h1>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                {internship.description}
                            </p>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span>Certificate of completion</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    <span>{internship.modules?.length || 0} Modules</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 bg-slate-100">
                            <ImageFallback src={internship.image} alt={internship.title} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* Main Content: Skills & Syllabus */}
                <div className="lg:col-span-2 space-y-10">

                    {/* Skills */}
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" /> What you'll learn
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {internship.skills.map((skill, i) => (
                                <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* Syllabus / Modules */}
                    <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-600" /> Course Curriculum
                        </h3>
                        {internship.modules && internship.modules.length > 0 ? (
                            <div className="space-y-3">
                                {internship.modules.map((module, index) => (
                                    <ModuleItem key={module._id} module={module} index={index} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                No curriculum details available yet.
                            </div>
                        )}
                    </section>
                </div>

                {/* Sidebar: Sticky Enroll Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                        <div className="mb-6">
                            <p className="text-sm text-slate-500 font-medium mb-1">Total Price</p>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-extrabold text-slate-900">
                                    {internship.priceInINR === 0 ? 'Free' : `₹${internship.priceInINR.toLocaleString()}`}
                                </span>
                                {internship.priceInINR > 0 && (
                                    <span className="text-sm text-slate-500 mb-1 line-through">₹{(internship.priceInINR * 1.2).toLocaleString()}</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleEnrollClick}
                            disabled={enrolling}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {enrolling ? <Loader2 className="animate-spin w-5 h-5" /> : <Lock className="w-4 h-4" />}
                            {internship.priceInINR === 0 ? 'Enroll for Free' : 'Enroll Now'}
                        </button>

                        <p className="text-xs text-center text-slate-500 mt-4">
                            Secure payment via Razorpay. 30-Day Money-Back Guarantee.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}