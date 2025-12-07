'use client'

import { useState } from 'react'
import api from '@/lib/api'
import Navbar from '@/components/Navbar'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, Search, Download, ShieldCheck } from 'lucide-react'

export default function VerifyCertificatePage() {
  const [certId, setCertId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!certId.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await api.get(`/certificates/verify/${certId.trim()}`)
      setResult(response.data)

      if (response.data.valid) {
        toast.success('Certificate is valid!')
      } else {
        toast.error(response.data.message || 'Certificate is invalid')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify certificate')
      setResult({ valid: false, message: 'Certificate not found or invalid' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Main Content with Top Padding for Fixed Navbar */}
      <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">

          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-full mb-4">
              <ShieldCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Verify Certificate
            </h1>
            <p className="mt-2 text-slate-600">
              Enter the unique certificate ID to verify its authenticity.
            </p>
          </div>

          {/* Verification Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8">
              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <label htmlFor="certId" className="block text-sm font-semibold text-slate-900 mb-2">
                    Certificate ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="certId"
                      type="text"
                      value={certId}
                      onChange={(e) => setCertId(e.target.value.toUpperCase())}
                      placeholder="e.g., CERT-1234-5678"
                      className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none font-mono uppercase tracking-wide text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !certId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Authenticity</span>
                  )}
                </button>
              </form>
            </div>

            {/* Result Section */}
            {result && (
              <div className={`border-t ${result.valid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className="p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 mt-1 ${result.valid ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {result.valid ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                    </div>

                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${result.valid ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {result.valid ? 'Valid Certificate' : 'Invalid Certificate'}
                      </h3>
                      <p className={`mt-1 text-sm ${result.valid ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {result.message}
                      </p>

                      {/* Certificate Details (Only show if valid/found) */}
                      {result.certificate && (
                        <div className="mt-6 bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</p>
                              <p className="text-slate-900 font-medium">{result.certificate.userName}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued Date</p>
                              <p className="text-slate-900 font-medium">{new Date(result.certificate.issuedAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Internship Program</p>
                            <p className="text-slate-900 font-bold text-lg">{result.certificate.internshipTitle}</p>
                            {result.certificate.mentorName && (
                              <p className="text-sm text-slate-500 mt-1">Mentored by {result.certificate.mentorName}</p>
                            )}
                          </div>

                          {/* Download Button */}
                          {result.valid && (
                            <div className="pt-4 mt-2">
                              <a
                                href={result.certificate.pdfUrl || `/api/certificates/download/${result.certificate.certId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <Download className="w-4 h-4" /> Download Original PDF
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}