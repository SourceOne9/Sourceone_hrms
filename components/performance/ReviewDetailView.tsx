"use client"

import * as React from "react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface ReviewDetailViewProps {
    review: any
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
    up: { icon: "↑", color: "text-success" },
    down: { icon: "↓", color: "text-danger" },
    same: { icon: "→", color: "text-text-3" },
}

const OVERALL_LABELS: Record<number, string> = {
    1: "Needs Improvement",
    2: "Below Expectations",
    3: "Meets Expectations",
    4: "Exceeds Expectations",
    5: "Outstanding",
}

function RatingDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: max }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        i < rating ? "bg-accent text-white" : "bg-bg-2 text-text-4"
                    )}
                >
                    {i + 1}
                </div>
            ))}
            <span className="ml-2 text-sm font-bold text-text">{rating} / {max}</span>
        </div>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-bold text-text-3 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="shrink-0">{children}</span>
            <div className="h-px flex-1 bg-border" />
        </h3>
    )
}

function DailyDetail({ formData }: { formData: any }) {
    return (
        <div className="space-y-6">
            {/* Activity Metrics */}
            {formData.activityMetrics?.length > 0 && (
                <div>
                    <SectionTitle>Activity Metrics</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Metric</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Target</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Actual</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.activityMetrics.map((m: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{m.metric}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3 text-center font-mono">{m.target || "—"}</td>
                                        <td className="px-4 py-2.5 text-sm text-center font-mono font-bold text-text">{m.actual || "—"}</td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{m.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Behavioral Ratings */}
            {formData.behavioralRatings?.length > 0 && (
                <div>
                    <SectionTitle>Behavioral Ratings</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Competency</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Rating</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.behavioralRatings.map((r: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{r.competency}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <RatingDisplay rating={r.rating} />
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{r.comments || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Priorities */}
            {formData.priorities?.length > 0 && (
                <div>
                    <SectionTitle>Priorities</SectionTitle>
                    <div className="space-y-2">
                        {formData.priorities.map((p: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-xs font-bold text-accent w-5">{i + 1}.</span>
                                <span className="text-sm text-text">{p}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Blockers */}
            {formData.blockers && (
                <div>
                    <SectionTitle>Blockers / Challenges</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{formData.blockers}</p>
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.keyWins && (
                    <div>
                        <SectionTitle>Key Wins</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{formData.keyWins}</p>
                    </div>
                )}
                {formData.actionItems && (
                    <div>
                        <SectionTitle>Action Items</SectionTitle>
                        <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{formData.actionItems}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function MonthlyDetail({ formData }: { formData: any }) {
    return (
        <div className="space-y-6">
            {/* KPI Scorecard */}
            {formData.kpiScorecard?.length > 0 && (
                <div>
                    <SectionTitle>KPI Scorecard</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-surface-2 border-b border-border">
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">KPI</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Target</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Actual</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Achievement</th>
                                        <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.kpiScorecard.map((k: any, i: number) => (
                                        <tr key={i} className="border-b border-border/50 last:border-0">
                                            <td className="px-4 py-2.5 text-sm font-medium text-text">{k.kpi}</td>
                                            <td className="px-4 py-2.5 text-sm text-text-3 text-center font-mono">{k.target || "—"}</td>
                                            <td className="px-4 py-2.5 text-sm text-center font-mono font-bold text-text">{k.actual || "—"}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn(
                                                    "text-sm font-bold",
                                                    k.achievement >= 100 ? "text-success" :
                                                        k.achievement >= 75 ? "text-accent" :
                                                            k.achievement > 0 ? "text-warning" : "text-text-4"
                                                )}>
                                                    {k.achievement > 0 ? `${k.achievement}%` : "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn("font-bold", TREND_ICONS[k.trend]?.color)}>
                                                    {TREND_ICONS[k.trend]?.icon || "—"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Competency Ratings */}
            {formData.competencyRatings?.length > 0 && (
                <div>
                    <SectionTitle>Competency Ratings</SectionTitle>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-2 border-b border-border">
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Area</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-center uppercase">Rating</th>
                                    <th className="px-4 py-2 text-xs font-bold text-text-3 text-left uppercase">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.competencyRatings.map((c: any, i: number) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-2.5 text-sm font-medium text-text">{c.area}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <RatingDisplay rating={c.rating} />
                                        </td>
                                        <td className="px-4 py-2.5 text-sm text-text-3">{c.comments || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Overall Rating */}
            {formData.overallRating && (
                <div>
                    <SectionTitle>Overall Rating</SectionTitle>
                    <div className="flex items-center gap-4 p-6 bg-surface border border-border rounded-xl">
                        <div className={cn(
                            "text-4xl font-extrabold",
                            formData.overallRating >= 4 ? "text-success" :
                                formData.overallRating >= 3 ? "text-accent" : "text-warning"
                        )}>
                            {formData.overallRating}
                        </div>
                        <div>
                            <div className="text-lg font-bold text-text">/ 5.0</div>
                            <div className="text-sm text-text-3">
                                {OVERALL_LABELS[formData.overallRating] || ""}
                            </div>
                        </div>
                        <div className="ml-auto flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(
                                    "text-xl",
                                    i < formData.overallRating ? "text-warning" : "text-text-4"
                                )}>
                                    ★
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Goals & Development */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.accomplishments && (
                    <div>
                        <SectionTitle>Key Accomplishments</SectionTitle>
                        <p className="text-sm text-text bg-success/5 border border-success/10 rounded-lg p-4">{formData.accomplishments}</p>
                    </div>
                )}
                {formData.areasForImprovement && (
                    <div>
                        <SectionTitle>Areas for Improvement</SectionTitle>
                        <p className="text-sm text-text bg-warning/5 border border-warning/10 rounded-lg p-4">{formData.areasForImprovement}</p>
                    </div>
                )}
            </div>

            {/* Goals for Next Month */}
            {formData.goalsForNextMonth?.length > 0 && (
                <div>
                    <SectionTitle>Goals for Next Month</SectionTitle>
                    <div className="space-y-2">
                        {formData.goalsForNextMonth.map((g: string, i: number) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-bg-2/50 rounded-lg">
                                <span className="text-xs font-bold text-purple w-5">{i + 1}.</span>
                                <span className="text-sm text-text">{g}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Training Plan */}
            {formData.trainingPlan && (
                <div>
                    <SectionTitle>Training / Development Plan</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{formData.trainingPlan}</p>
                </div>
            )}

            {/* Manager Comments */}
            {formData.managerComments && (
                <div>
                    <SectionTitle>Manager&apos;s Comments</SectionTitle>
                    <p className="text-sm text-text bg-accent/5 border border-accent/10 rounded-lg p-4">{formData.managerComments}</p>
                </div>
            )}
        </div>
    )
}

export function ReviewDetailView({ review }: ReviewDetailViewProps) {
    const formData = review.formData
    const isDaily = review.formType === "DAILY"
    const isMonthly = review.formType === "MONTHLY"

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between bg-gradient-to-r from-accent/5 to-purple/5 border border-accent/10 rounded-xl p-5">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-text">
                            {review.employee?.firstName} {review.employee?.lastName}
                        </h3>
                        <Badge variant={isDaily ? "default" : isMonthly ? "neutral" : "warning"} size="sm">
                            {review.formType || "Legacy"}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-text-3">
                        {review.employee?.designation && <span>{review.employee.designation}</span>}
                        {review.employee?.department?.name && (
                            <Badge variant="neutral" size="sm">{review.employee.department.name}</Badge>
                        )}
                        <span>Reviewed: {format(new Date(review.reviewDate), "MMM d, yyyy")}</span>
                        {review.reviewPeriod && <span>Period: {review.reviewPeriod}</span>}
                    </div>
                    {review.reviewer && (
                        <div className="text-sm text-text-3 mt-1">
                            Reviewed by: <span className="font-medium text-text">{review.reviewer.firstName} {review.reviewer.lastName}</span>
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <div className={cn(
                        "text-3xl font-extrabold",
                        review.rating >= 4 ? "text-success" : review.rating >= 3 ? "text-accent" : "text-warning"
                    )}>
                        {review.rating.toFixed(1)}
                    </div>
                    <div className="text-sm text-text-3">/ 5.0</div>
                </div>
            </div>

            {/* Form-specific content */}
            {isDaily && formData && <DailyDetail formData={formData} />}
            {isMonthly && formData && <MonthlyDetail formData={formData} />}

            {/* Legacy/generic fallback */}
            {!isDaily && !isMonthly && review.comments && (
                <div>
                    <SectionTitle>Comments</SectionTitle>
                    <p className="text-sm text-text bg-bg-2/50 rounded-lg p-4">{review.comments}</p>
                </div>
            )}
        </div>
    )
}
