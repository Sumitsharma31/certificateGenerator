'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

export interface Internship {
  _id: string
  title: string
  description: string
  priceInINR: number
  image?: string
  skills?: string[]
  level?: 'beginner' | 'intermediate' | 'advanced'
}

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase ${className}`}>
    {children}
  </span>
)

export const InternshipCard = ({ internship }: { internship: Internship }) => {
  const [imageError, setImageError] = useState(false)

  return (
    <Link
      href={`/internships/${internship._id}`}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden h-full"
    >
      <div className="h-48 relative bg-slate-100 overflow-hidden">
        {internship.image && !imageError ? (
          <img
            src={internship.image}
            alt={internship.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
            <span className="text-white/20 text-4xl font-bold uppercase tracking-widest select-none">
              {internship.title.slice(0, 2)}
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4">
          <Badge className="bg-white/90 text-slate-900 backdrop-blur-sm shadow-sm">
            {internship.level || 'Internship'}
          </Badge>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
            {internship.title}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
            {internship.description}
          </p>

          {internship.skills && internship.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {internship.skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg border border-blue-100">
                  {skill}
                </span>
              ))}
              {internship.skills.length > 3 && (
                <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-xs font-semibold rounded-lg border border-slate-100">
                  +{internship.skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
            <p className="text-xl font-bold text-slate-900">
              {internship.priceInINR === 0 ? 'Free' : `₹${internship.priceInINR.toLocaleString()}`}
            </p>
          </div>
          <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <ArrowRight className="w-5 h-5" />
          </span>
        </div>
      </div>
    </Link>
  )
}
