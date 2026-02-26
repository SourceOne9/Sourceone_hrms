"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Score {
    id: string
    weekStartDate: string
    baseScore: number
    aiAdjustment: number
    finalScore: number
    aiFeedback: string | null
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

export default function EmployeePerformancePage() {
    const [scores, setScores] = useState<Score[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/employee/performance")
            .then(res => res.json())
            .then(data => setScores(data.scores || []))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 rounded-full border-4 border-[var(--accent)]/20 border-t-[var(--accent)] animate-spin" />
            </div>
        )
    }

    const currentScore = scores[0]

    return (
        <div className="max-w-[1000px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">My Performance</h1>
                <p className="text-sm text-[var(--text3)] mt-1">Your weekly evaluations and personalized AI coaching.</p>
            </div>

            {scores.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-[var(--border)] rounded-3xl bg-[var(--surface)]">
                    <div className="text-4xl mb-4">🌱</div>
                    <h3 className="text-lg font-bold text-[var(--text)] mb-2">No Evaluations Yet</h3>
                    <p className="text-sm text-[var(--text3)] max-w-sm mx-auto">
                        Your first AI performance evaluation will be generated at the end of the week based on your activity and output.
                    </p>
                </div>
            ) : (
                <>
                    {/* Hero Section - Latest Score */}
                    {currentScore && (
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden shadow-sm">
                            <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">

                                {/* Score Circle */}
                                <div className="shrink-0 relative flex items-center justify-center w-40 h-40 rounded-full bg-[var(--surface)] border-[8px] border-[var(--bg2)] shadow-inner">
                                    <div className="absolute inset-[-8px] rounded-full border-[8px] border-transparent border-t-[var(--accent)] border-r-[var(--accent)] rotate-45"
                                        style={{
                                            borderColor: currentScore.finalScore >= 80 ? '#34c759' : currentScore.finalScore >= 60 ? '#ff9500' : '#ff3b30'
                                        }}
                                    />
                                    <div className="text-center">
                                        <div className="text-5xl font-black text-[var(--text)] tracking-tighter">{currentScore.finalScore}</div>
                                        <div className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-widest mt-1">Out of 100</div>
                                    </div>
                                </div>

                                {/* Feedback */}
                                <div className="flex-1 space-y-4 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-bold uppercase tracking-wider">
                                        ✨ AI Evaluation for Week of {formatDate(currentScore.weekStartDate)}
                                    </div>

                                    <p className="text-base text-[var(--text2)] leading-relaxed font-medium">
                                        {currentScore.aiFeedback || "You had a solid week. Keep focusing on core deliverables and maintaining consistent activity."}
                                    </p>

                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4 border-t border-[var(--border)]">
                                        <div className="text-sm">
                                            <span className="text-[var(--text3)]">Metrics Score:</span> <span className="font-bold">{currentScore.baseScore}</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-[var(--text3)]">AI Modifier:</span>
                                            <span className={cn("font-bold ml-1", currentScore.aiAdjustment > 0 ? "text-emerald-500" : currentScore.aiAdjustment < 0 ? "text-red-500" : "")}>
                                                {currentScore.aiAdjustment > 0 ? "+" : ""}{currentScore.aiAdjustment}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}

                    {/* Matrix History */}
                    <div className="space-y-4">
                        <div className="text-sm font-bold text-[var(--text2)] uppercase tracking-tight">Historical Evaluations</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {scores.slice(1).map(score => (
                                <div key={score.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg2)] transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-bold text-[var(--text)]">{formatDate(score.weekStartDate)}</div>
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                            score.finalScore >= 80 ? "bg-emerald-500/10 text-emerald-500" :
                                                score.finalScore >= 60 ? "bg-orange-500/10 text-orange-500" :
                                                    "bg-red-500/10 text-red-500"
                                        )}>
                                            {score.finalScore}
                                        </div>
                                    </div>
                                    <p className="text-xs text-[var(--text3)] line-clamp-3 leading-relaxed">
                                        {score.aiFeedback || "Standard weekly evaluation processed."}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
