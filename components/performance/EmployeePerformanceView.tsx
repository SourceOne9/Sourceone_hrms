"use client"

import * as React from "react"
import { cn, extractArray } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { ReviewDetailView } from "./ReviewDetailView"
import { toast } from "sonner"
import { format } from "date-fns"

type PerformanceReview = {
    id: string
    rating: number
    progress: number
    comments: string | null
    reviewDate: string
    status: string
    formType: string | null
    formData: any
    reviewPeriod: string | null
    employee: {
        id: string
        firstName: string
        lastName: string
        designation?: string
        department?: { name: string }
    }
    reviewer?: {
        id: string
        firstName: string
        lastName: string
    } | null
}

export function EmployeePerformanceView() {
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [viewReview, setViewReview] = React.useState<PerformanceReview | null>(null)

    React.useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await fetch("/api/performance")
                if (res.ok) {
                    setReviews(extractArray<PerformanceReview>(await res.json()))
                }
            } catch (_error) {
                toast.error("Failed to load performance reviews")
            } finally {
                setIsLoading(false)
            }
        }
        fetchReviews()
    }, [])

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : "0.0"

    const latest = reviews[0]

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader title="My Performance" description="Review your evaluations and feedback from your manager" />

            {/* Hero Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <Card className="p-8 bg-gradient-to-br from-accent to-purple text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="text-sm font-medium text-white/80 uppercase tracking-wider mb-2">Overall Rating</div>
                        <div className="flex items-end gap-3 mb-4">
                            <div className="text-[64px] font-extrabold leading-none">{avgRating}</div>
                            <div className="text-2xl font-bold mb-2">/ 5.0</div>
                        </div>
                        <div className="flex gap-1 mb-6">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={cn(i < Math.floor(Number(avgRating)) ? "text-white" : "text-white/30", "text-xl")}>★</span>
                            ))}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
                            <span>{Number(avgRating) >= 4 ? "🎉" : Number(avgRating) >= 3 ? "👍" : "📈"}</span>
                            {latest?.status || "No reviews yet"}
                        </div>
                    </div>
                    <div className="absolute right-[-20px] bottom-[-20px] text-[200px] opacity-10 rotate-12 select-none">⭐</div>
                </Card>

                <div className="flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-2xl mb-3">🏆</div>
                        <div className="text-2xl font-extrabold text-text">
                            {Number(avgRating) >= 4.5 ? "Top 5%" : Number(avgRating) >= 4.0 ? "Top 15%" : "Active"}
                        </div>
                        <div className="text-sm text-text-3">Performance Rank</div>
                    </Card>
                    <Card className="flex-1 flex flex-col justify-center items-center text-center p-6">
                        <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center text-2xl mb-3">💬</div>
                        <div className="text-2xl font-extrabold text-text">{reviews.length}</div>
                        <div className="text-sm text-text-3">Reviews Received</div>
                    </Card>
                </div>
            </div>

            {/* Review List */}
            <Card>
                <CardHeader className="border-b border-border">
                    <CardTitle>Review History</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2">
                                {["Date", "Type", "Rating", "Period", "Reviewer", "Status", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                            ) : reviews.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-text-3">No reviews yet. Your manager will submit reviews here.</td></tr>
                            ) : reviews.map((rev) => (
                                <tr
                                    key={rev.id}
                                    className="border-b border-border/30 last:border-0 hover:bg-accent/[0.03] transition-colors cursor-pointer"
                                    onClick={() => setViewReview(rev)}
                                >
                                    <td className="px-4 py-3.5 text-sm text-text font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="px-4 py-3.5">
                                        {rev.formType ? (
                                            <Badge variant={rev.formType === "DAILY" ? "default" : "neutral"} size="sm">
                                                {rev.formType}
                                            </Badge>
                                        ) : (
                                            <Badge variant="warning" size="sm">Legacy</Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-warning tracking-wider">{"★".repeat(Math.floor(rev.rating))}</span>
                                            <span className="text-text-4 tracking-wider">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                            <span className="text-sm text-text-3 ml-2 font-mono">{rev.rating.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">{rev.reviewPeriod || "—"}</td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">
                                        {rev.reviewer ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}` : "—"}
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Badge
                                            variant={rev.status === "EXCELLENT" ? "success" : rev.status === "GOOD" ? "default" : rev.status === "PENDING" ? "warning" : "neutral"}
                                            size="sm"
                                        >
                                            {rev.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* View Review Detail */}
            <Dialog open={!!viewReview} onClose={() => setViewReview(null)} size="full">
                <DialogHeader>
                    <DialogTitle>
                        Review Details — {viewReview?.formType || "Legacy"} Review
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    {viewReview && <ReviewDetailView review={viewReview} />}
                </DialogBody>
            </Dialog>
        </div>
    )
}
