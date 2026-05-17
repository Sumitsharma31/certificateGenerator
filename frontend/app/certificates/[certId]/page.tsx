'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import { Loader2, Download, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'

interface Certificate {
  certId: string
  userName: string
  internshipTitle: string
  mentorName: string
  issuedAt: string
  startDate: string
  endDate: string
}

export default function CertificatePage() {
  const { certId } = useParams()
  const [certificate, setCertificate] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (certId) fetchCertificate()
  }, [certId])

  const fetchCertificate = async () => {
    try {
      const res = await api.get(`/certificates/${certId}`)
      setCertificate(res.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Certificate not found')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/certificates/download/${certId}`,
      '_blank'
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!certificate || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
        <p>{error}</p>
        <Link href="/student/dashboard" className="text-blue-600 mt-4">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const verificationUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/certificates/verify/${certificate.certId}`
      : ''

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  return (
    <div className="min-h-screen bg-slate-100 pt-24">
      <Navbar />

      <div className="flex justify-center py-12 px-4">
        {/* CERTIFICATE CONTAINER */}
        <div className="relative w-[1123px] h-[794px] bg-white shadow-xl">

          {/* Canva PNG Template */}
          <img
            src="/certificates/internship-template.png"
            alt="Certificate"
            className="absolute inset-0 w-full h-full"
          />

          {/* STUDENT NAME */}
          <div
            className="absolute text-center font-bold text-[#d6b25e]"
            style={{
              top: '290px',
              width: '100%',
              fontSize: '68px',
              fontFamily: 'Cormorant Garamond',
            }}
          >
            {certificate.userName}
          </div>

          {/* INTERNSHIP DETAILS */}
          <div
            className="absolute text-center text-[#1e3a5f]"
            style={{
              top: '434px',
              left: '117px',
              width: '856px',
              fontSize: '20px',
              fontFamily: 'Glacial Indifference',
              lineHeight: '1.5',
            }}
          >
            In Recognition of The Successful Completion of The Internship,
            In{' '}
            <strong>{certificate.internshipTitle.toUpperCase()}</strong>,Utilizing SkillsBuild resources and the IBM Cloud Platform,  from{' '}
            <strong>{certificate.startDate}</strong> To{' '}
            <strong>{certificate.endDate}</strong>.
            This Program was Conducted by <strong>Certify-Now</strong> In
            Collaboration With The <strong>AICTE</strong>.

          </div>

          {/* CERTIFICATE ID */}
          <div
            className="absolute text-xs text-[#1e3a5f]"
            style={{ bottom: '70px', left: '470px' }}
          >
            Certificate-ID : {certificate.certId}
          </div>

          {/* DATE OF ISSUE */}
          <div
            className="absolute text-xs text-[#1e3a5f]"
            style={{ bottom: '80px', right: '165px' }}
          >
            {' '}
            {new Date(certificate.issuedAt).toLocaleDateString()}
          </div>

          {/* QR CODE (SECOND POSITION) */}
          <div
            className="absolute"
            style={{ bottom: '110px', left: '520px' }}
          >
            <div className="bg-white p-1 rounded">
              <QRCodeSVG
                value={verificationUrl}
                size={90}
                level="H"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-center gap-4 pb-10">
        <a
          href={`${API_URL}/certificates/download/${certId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow flex items-center hover:bg-blue-700 transition-colors"
        >
          <Download className="inline w-5 h-5 mr-2" />
          Download PDF
        </a>
      </div>
    </div>
  )
}
