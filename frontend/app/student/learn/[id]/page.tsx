'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import {
    BookOpen, CheckCircle, Lock, PlayCircle,
    ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react'

// Types
interface Question {
    _id: string
    question: string
    options: string[]
    correctAnswer: number
}

interface Module {
    _id: string
    title: string
    content: string
    quiz: Question[]
}

interface InternshipData {
    _id: string
    title: string
    modules: Module[]
}

interface Progress {
    completedModules: string[]
    quizResults: Array<{
        moduleId: string
        score: number
        passed: boolean
        attempts: number
    }>
}

export default function LearningPage() {
    const { id } = useParams()
    const router = useRouter()

    const [internship, setInternship] = useState<InternshipData | null>(null)
    const [progress, setProgress] = useState<Progress | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeModuleIndex, setActiveModuleIndex] = useState(0)
    const [viewState, setViewState] = useState<'content' | 'quiz' | 'result'>('content')

    // Quiz State
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({})
    const [quizScore, setQuizScore] = useState<{ score: number, passed: boolean } | null>(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            const res = await api.get(`/learning/${id}`)
            setInternship(res.data.data.internship)
            setProgress(res.data.data.progress)
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to load course')
            router.push('/student/dashboard')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkRead = async () => {
        if (!internship) return
        const currentModule = internship.modules[activeModuleIndex]

        try {
            const res = await api.post(`/learning/${id}/modules/${currentModule._id}/complete`)
            if (res.data.success) {
                setProgress(prev => prev ? { ...prev, completedModules: res.data.progress.completedModules } : null)

                // If has quiz, go to quiz, else unlock next
                if (currentModule.quiz && currentModule.quiz.length > 0) {
                    setViewState('quiz')
                } else {
                    toast.success('Module Completed!')
                    // Refresh to maybe unlock next? 
                    fetchData()
                }
            }
        } catch (error) {
            toast.error('Failed to update progress')
        }
    }

    const handleSubmitQuiz = async () => {
        if (!internship) return
        const currentModule = internship.modules[activeModuleIndex]
        setSubmitting(true)

        try {
            // Transform Record to Array
            const answersArray = currentModule.quiz.map((_, i) => userAnswers[i] ?? -1)

            const res = await api.post(`/learning/${id}/modules/${currentModule._id}/quiz`, {
                answers: answersArray
            })

            if (res.data.success) {
                setQuizScore(res.data.result)
                setViewState('result')
                await fetchData() // Refresh global progress
            }
        } catch (error) {
            toast.error('Quiz submission failed')
        } finally {
            setSubmitting(false)
        }
    }

    // --- Logic Helpers ---
    const isModuleLocked = (index: number) => {
        if (index === 0) return false
        if (!progress) return true

        const prevModuleId = internship?.modules[index - 1]._id
        if (!prevModuleId) return true

        // Check if previous module quiz passed OR (if no quiz) marked read
        // Simple logic: Check quizResults for previous module
        const prevResult = progress.quizResults.find(r => r.moduleId === prevModuleId)
        // If prev module has quiz, must pass it.
        const prevModuleHasQuiz = internship?.modules[index - 1].quiz.length > 0

        if (prevModuleHasQuiz) {
            return !prevResult?.passed
        } else {
            // If no quiz, just need to be in completedModules
            return !progress.completedModules.includes(prevModuleId)
        }
    }

    if (loading || !internship) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 rounded-full border-t-transparent"></div></div>
    }

    const currentModule = internship.modules[activeModuleIndex]

    return (
        <div className="flex h-screen bg-white overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
                <div className="p-5 border-b border-slate-200">
                    <h2 className="font-bold text-slate-800 line-clamp-1" title={internship.title}>{internship.title}</h2>
                    <p className="text-xs text-slate-500 mt-1">Course Content</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {internship.modules.map((module, index) => {
                        const locked = isModuleLocked(index)
                        const active = index === activeModuleIndex
                        const completed = progress?.completedModules.includes(module._id)
                        const quizPassed = progress?.quizResults.find(r => r.moduleId === module._id)?.passed

                        return (
                            <button
                                key={module._id}
                                disabled={locked}
                                onClick={() => { setActiveModuleIndex(index); setViewState('content'); setUserAnswers({}); setQuizScore(null); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left text-sm transition-all ${active ? 'bg-blue-600 text-white shadow-md' :
                                        locked ? 'opacity-50 cursor-not-allowed bg-transparent' :
                                            'hover:bg-slate-200 text-slate-700'
                                    }`}
                            >
                                {locked ? <Lock className="w-4 h-4 shrink-0" /> :
                                    (quizPassed || (completed && module.quiz.length === 0)) ? <CheckCircle className={`w-4 h-4 shrink-0 ${active ? 'text-blue-200' : 'text-emerald-500'}`} /> :
                                        <PlayCircle className="w-4 h-4 shrink-0" />
                                }
                                <span className="line-clamp-2">{index + 1}. {module.title}</span>
                            </button>
                        )
                    })}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Top Bar for Mobile/Context - Optional */}

                <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-3xl mx-auto">
                        <h1 className="text-3xl font-bold text-slate-900 mb-8">{currentModule.title}</h1>

                        {viewState === 'content' && (
                            <div className="prose prose-slate max-w-none">
                                <div className="whitespace-pre-wrap">{currentModule.content}</div>

                                <div className="mt-12 flex justify-end">
                                    <button
                                        onClick={handleMarkRead}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all"
                                    >
                                        {currentModule.quiz.length > 0 ? 'Proceed to Quiz' : 'Mark as Complete'} <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewState === 'quiz' && (
                            <div className="space-y-8">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-blue-800 font-medium">Quiz Instructions</p>
                                        <p className="text-sm text-blue-600 mt-1">Answer all questions. You need 50% score to pass and unlock the next module.</p>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {currentModule.quiz.map((q, qIdx) => (
                                        <div key={q._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                            <p className="text-lg font-medium text-slate-900 mb-4">{qIdx + 1}. {q.question}</p>
                                            <div className="space-y-3">
                                                {q.options.map((opt, optIdx) => (
                                                    <label key={optIdx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${userAnswers[qIdx] === optIdx ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                                                        }`}>
                                                        <input
                                                            type="radio"
                                                            name={`q-${q._id}`}
                                                            className="w-4 h-4 text-blue-600"
                                                            checked={userAnswers[qIdx] === optIdx}
                                                            onChange={() => setUserAnswers(prev => ({ ...prev, [qIdx]: optIdx }))}
                                                        />
                                                        <span className="text-slate-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSubmitQuiz}
                                        disabled={submitting || Object.keys(userAnswers).length < currentModule.quiz.length}
                                        className="px-8 py-3 bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all"
                                    >
                                        {submitting ? 'Submitting...' : 'Submit Answers'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewState === 'result' && quizScore && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${quizScore.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {quizScore.passed ? <CheckCircle className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
                                </div>

                                <h2 className="text-3xl font-bold text-slate-900 mb-2">{quizScore.passed ? 'Assessment Passed!' : 'Assessment Failed'}</h2>
                                <p className="text-slate-500 text-lg mb-8">You scored <span className="font-bold text-slate-900">{Math.round(quizScore.score)}%</span></p>

                                <div className="flex gap-4">
                                    {!quizScore.passed && (
                                        <button
                                            onClick={() => { setViewState('quiz'); setUserAnswers({}); setQuizScore(null); }}
                                            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2"
                                        >
                                            <RefreshCw className="w-4 h-4" /> Retry Quiz
                                        </button>
                                    )}
                                    {quizScore.passed && (
                                        <button
                                            onClick={() => {
                                                // Unlock Next
                                                const nextIndex = activeModuleIndex + 1
                                                if (nextIndex < internship.modules.length) {
                                                    setActiveModuleIndex(nextIndex)
                                                    setViewState('content')
                                                    setQuizScore(null)
                                                    setUserAnswers({})
                                                } else {
                                                    toast.success('Course Completed!')
                                                    router.push('/student/dashboard')
                                                }
                                            }}
                                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                                        >
                                            Continue Learning
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
