"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Alert {
    id: string
    employeeName: string
    avatarUrl: string | null
    designation: string
    department: string
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    reason: string
    createdAt: string
}

interface Score {
    id: string
    employeeName: string
    avatarUrl: string | null
    designation: string
    department?: string
    baseScore: number
    aiAdjustment: number
    finalScore: number
    burnoutRisk: boolean
    behavioralAnomaly: boolean
    weekStartDate: string
}

const SEVERITY_COLORS = {
    LOW: { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20" },
    MEDIUM: { bg: "bg-yellow-500/10", text: "text-yellow-500", border: "border-yellow-500/20" },
    HIGH: { bg: "bg-orange-500/10", text: "text-orange-500", border: "border-orange-500/20" },
    CRITICAL: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
}

export default function PerformanceAdminDashboard() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [scores, setScores] = useState<Score[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/admin/performance")
            .then(res => res.json())
            .then(data => {
                setAlerts(data.alerts)
                setScores(data.scores)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            </div>
        )
    }

    const burnoutCount = alerts.filter(a => a.reason.includes("Burnout")).length
    const avgScore = scores.length ? (scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length).toFixed(1) : 0

    return (
        <div className="max-w-[1200px] mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">AI Performance Matrix</h1>
                    <p className="text-sm text-[var(--text3)] mt-1">Autonomous oversight of organization productivity and health.</p>
                </div>

                {/* Manual Trigger (Mocked for Demo) */}
                <button
                    onClick={() => alert("Dispatching AI Agent Evaluation Matrix... Please wait.")}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                >
                    <span className="text-lg">✨</span> Run AI Evaluation
                </button>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-emerald-500/30 transition-colors">
                    <div className="text-3xl font-black text-emerald-500">{avgScore}</div>
                    <div className="text-[13px] font-medium text-[var(--text3)] mt-1">Org Avg Score (Last 7 Days)</div>
                </div>
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-red-500/30 transition-colors">
                    <div className="text-3xl font-black text-red-500">{alerts.length}</div>
                    <div className="text-[13px] font-medium text-[var(--text3)] mt-1">Active AI Alerts</div>
                </div>
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-orange-500/30 transition-colors">
                    <div className="text-3xl font-black text-orange-500">{burnoutCount}</div>
                    <div className="text-[13px] font-medium text-[var(--text3)] mt-1">Burnout Risks Detected</div>
                </div>
                <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-blue-500/30 transition-colors">
                    <div className="text-3xl font-black text-blue-500">{scores.filter(s => s.finalScore >= 90).length}</div>
                    <div className="text-[13px] font-medium text-[var(--text3)] mt-1">Top Performers ({'>'}{`90`})</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Alerts */}
                <div className="space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2 text-red-500 font-bold tracking-tight text-sm uppercase">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        Critical AI Escalations
                    </div>

                    {alerts.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text3)] text-sm border border-dashed border-[var(--border)] rounded-2xl">
                            All clear! No employee anomalies detected this week.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alerts.map(alert => {
                                const sc = SEVERITY_COLORS[alert.severity]
                                return (
                                    <div key={alert.id} className={cn("p-4 rounded-xl border flex flex-col gap-3", sc.bg, sc.border)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-[var(--border)]">
                                                {alert.avatarUrl ? <img src={alert.avatarUrl} className="w-full h-full object-cover" /> : alert.employeeName.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-[var(--text)] truncate">{alert.employeeName}</div>
                                                <div className="text-xs text-[var(--text3)] truncate">{alert.designation}</div>
                                            </div>
                                            <div className={cn("text-[10px] font-bold px-2 py-0.5 rounded-sm", sc.text, "bg-[var(--bg)]")}>
                                                {alert.severity}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-[var(--text2)] leading-relaxed">
                                            {alert.reason}
                                        </div>
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button className="text-[10px] font-bold text-[var(--text3)] hover:text-[var(--text)] transition-colors">Dismiss</button>
                                            <button className={cn("text-[10px] font-bold", sc.text)}>Intervene</button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Right Col: Performance Scores */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="text-sm font-bold text-[var(--text2)] uppercase tracking-tight">Recent Weekly Scores</div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--bg2)] text-[var(--text3)] text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-5 py-3">Employee</th>
                                    <th className="px-5 py-3 text-right">Base</th>
                                    <th className="px-5 py-3 text-right">AI Adj</th>
                                    <th className="px-5 py-3 text-right">Final</th>
                                    <th className="px-5 py-3">Flags</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                                {scores.map(score => (
                                    <tr key={score.id} className="hover:bg-[var(--bg2)]/50 transition-colors">
                                        <td className="px-5 py-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                                {score.avatarUrl ? <img src={score.avatarUrl} className="w-full h-full object-cover" /> : score.employeeName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-[var(--text)]">{score.employeeName}</div>
                                                <div className="text-[11px] text-[var(--text3)]">{score.department}</div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right font-medium text-[var(--text2)]">{score.baseScore}</td>
                                        <td className={cn("px-5 py-4 text-right font-bold", score.aiAdjustment > 0 ? "text-emerald-500" : score.aiAdjustment < 0 ? "text-red-500" : "text-[var(--text3)]")}>
                                            {score.aiAdjustment > 0 ? "+" : ""}{score.aiAdjustment}
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-bold text-[var(--text)] shadow-sm">
                                                {score.finalScore}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-2">
                                                {score.burnoutRisk && <span title="Burnout Risk" className="text-orange-500 cursor-help">🔥</span>}
                                                {score.behavioralAnomaly && <span title="Behavioral Anomaly" className="text-red-500 cursor-help">⚠️</span>}
                                                {!score.burnoutRisk && !score.behavioralAnomaly && <span className="text-[var(--text3)]">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {scores.length === 0 && (
                            <div className="p-12 text-center text-[var(--text3)] text-sm">
                                No evaluations generated for this week yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
