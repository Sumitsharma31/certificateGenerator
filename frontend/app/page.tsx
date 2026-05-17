'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { CheckCircle } from 'lucide-react'

const courses = [
  {
    title: 'Full Stack Development',
    image: '/courses/fullstack.webp',
    desc: 'Java, Node, MongoDB, React',
  },
  {
    title: 'Data Analysis',
    image: '/courses/data-analysis.webp',
    desc: 'Python and R, power Bi, Tableau',
  },
  {
    title: 'Circuit Design',
    image: '/courses/cercuit design.webp',
    desc: 'AutoCAD, SpectreRF, LTspice',
  },
]

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // 🔐 KEEP YOUR AUTH LOGIC
  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') router.push('/admin/dashboard')
      else if (user.role === 'student') router.push('/student/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <main className="bg-white text-slate-900 overflow-hidden">
      {/* ================= HERO ================= */}
      <section className="py-28 px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-bold"
        >
          Build Skills.{' '}
          <span className="text-blue-600">Earn Certificates.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-slate-600"
        >
          Industry-grade internships with real projects, mentor support and
          verifiable certificates.
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push('/auth/login')}
          className="mt-10 rounded-xl bg-blue-600 px-8 py-4 font-medium text-white hover:bg-blue-700 transition"
        >
          Explore Internships
        </motion.button>
      </section>

      {/* ================= COURSES ================= */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center justify-between mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-semibold"
          >
            Popular Internship Programs
          </motion.h2>

          <button
            onClick={() => router.push('/auth/login')}
            className="text-sm text-blue-600 hover:underline"
          >
            See all →
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {courses.map((course, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
            >
              <Image
                src={course.image}
                alt={course.title}
                width={400}
                height={240}
                className="h-48 w-full object-cover"
                priority={i === 0}
              />

              <div className="p-6">
                <h3 className="text-lg font-semibold">
                  {course.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {course.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-10">
          {[
            'Real-world tasks & projects',
            'Mentor verified certificates',
            'Shareable & QR verifiable',
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex gap-4 items-start"
            >
              <CheckCircle className="text-blue-600 mt-1" />
              <p className="text-slate-700">{item}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-28 text-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-4xl font-bold"
        >
          Ready to Start Your Career?
        </motion.h2>

        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => router.push('/auth/login')}
          className="mt-8 rounded-xl bg-blue-600 px-10 py-4 font-medium text-white hover:bg-blue-700 transition"
        >
          Get Certified Now
        </motion.button>
      </section>
    </main>
  )
}
