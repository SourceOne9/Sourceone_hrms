"use client"

import * as React from "react"
import { extractArray } from "@/lib/utils"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { StatCard } from "@/components/ui/StatCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Spinner } from "@/components/ui/Spinner"
import { DailyReviewForm } from "./DailyReviewForm"
import { MonthlyReviewForm } from "./MonthlyReviewForm"
import { ReviewDetailView } from "./ReviewDetailView"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/context/AuthContext"

type Employee = {
    id: string
    firstName: string
    lastName: string
    designation?: string
    department?: { name: string }
}

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
    employeeId: string
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

function getStatusBadge(status: string) {
    switch (status) {
        case "EXCELLENT": return <Badge variant="success">{status}</Badge>
        case "GOOD": return <Badge variant="default">{status}</Badge>
        case "NEEDS_IMPROVEMENT": return <Badge variant="warning">NEEDS IMPROVEMENT</Badge>
        case "COMPLETED": return <Badge variant="neutral">{status}</Badge>
        default: return <Badge variant="neutral">{status}</Badge>
    }
}

export function AdminPerformanceView() {
    const { user } = useAuth()
    const [reviews, setReviews] = React.useState<PerformanceReview[]>([])
    const [employees, setEmployees] = React.useState<Employee[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [dailyOpen, setDailyOpen] = React.useState(false)
    const [monthlyOpen, setMonthlyOpen] = React.useState(false)
    const [viewReview, setViewReview] = React.useState<PerformanceReview | null>(null)
    const [filterTab, setFilterTab] = React.useState("ALL")

    // Fetch reviews + employees (team-scoped for TEAM_LEAD)
    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const role = user?.role

            // Fetch reviews
            const revRes = await fetch("/api/performance")

            // Fetch employees — team lead gets their team members only
            let empPromise: Promise<Response>
            if (role === "TEAM_LEAD") {
                empPromise = fetch("/api/teams").then(async (res) => {
                    if (!res.ok) return new Response(JSON.stringify({ data: [] }))
                    const json = await res.json()
                    const teams = json.data || json || []
                    // Find team where this user is lead, fetch members
                    if (teams.length > 0) {
                        const teamId = teams[0].id
                        return fetch(`/api/teams/${teamId}/members`)
                    }
                    return new Response(JSON.stringify({ data: [] }))
                })
            } else {
                empPromise = fetch("/api/employees?limit=200")
            }

            const [revResult, empResult] = await Promise.all([revRes, empPromise])

            if (revResult.ok) {
                setReviews(extractArray<PerformanceReview>(await revResult.json()))
            }

            if (empResult.ok) {
                const empJson = await empResult.json()
                const empArr = extractArray<any>(empJson)
                // Team members come as { employee: {...} }, employees come directly
                const mapped: Employee[] = empArr.map((e: any) => {
                    if (e.employee) {
                        return {
                            id: e.employee.id,
                            firstName: e.employee.firstName,
                            lastName: e.employee.lastName,
                            designation: e.employee.designation,
                            department: e.employee.department,
                        }
                    }
                    return e
                })
                setEmployees(mapped)
            }
        } catch (_error) {
            toast.error("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }, [user?.role])

    React.useEffect(() => { fetchAll() }, [fetchAll])

    const handleSubmitReview = async (data: any) => {
        try {
            const res = await fetch("/api/performance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (res.ok) {
                toast.success("Review submitted successfully")
                setDailyOpen(false)
                setMonthlyOpen(false)
                fetchAll()
            } else {
                const err = await res.json().catch(() => null)
                toast.error(err?.message || "Failed to submit review")
            }
        } catch (error) {
            toast.error("An error occurred while submitting the review")
        }
    }

    // Stats
    const stats = React.useMemo(() => {
        if (reviews.length === 0) return { avg: "0.0", total: 0, pending: 0, thisMonth: 0 }
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        const pending = reviews.filter(r => r.status === "PENDING").length
        const now = new Date()
        const thisMonth = reviews.filter(r => {
            const d = new Date(r.reviewDate)
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length
        return { avg: avg.toFixed(1), total: reviews.length, pending, thisMonth }
    }, [reviews])

    // Filter reviews
    const filteredReviews = React.useMemo(() => {
        if (filterTab === "ALL") return reviews
        return reviews.filter(r => r.formType === filterTab)
    }, [reviews, filterTab])

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Performance Management"
                description="Track and evaluate employee performance with structured reviews"
                actions={
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setDailyOpen(true)}>
                            Daily Review
                        </Button>
                        <Button onClick={() => setMonthlyOpen(true)}>
                            Monthly Review
                        </Button>
                    </div>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Avg Score" value={stats.avg} icon={<span className="text-lg">⭐</span>} />
                <StatCard label="Total Reviews" value={stats.total} icon={<span className="text-lg">📋</span>} />
                <StatCard label="Pending" value={stats.pending} icon={<span className="text-lg">⏳</span>} />
                <StatCard label="This Month" value={stats.thisMonth} icon={<span className="text-lg">📅</span>} />
            </div>

            {/* Filter Tabs + Review Table */}
            <Card>
                <CardHeader className="border-b border-border">
                    <div className="flex items-center justify-between">
                        <CardTitle>Performance Reviews</CardTitle>
                        <Tabs value={filterTab} onValueChange={setFilterTab}>
                            <TabsList>
                                <TabsTrigger value="ALL">All</TabsTrigger>
                                <TabsTrigger value="DAILY">Daily</TabsTrigger>
                                <TabsTrigger value="MONTHLY">Monthly</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-2">
                                {["Employee", "Type", "Rating", "Period", "Date", "Reviewer", "Status", ""].map((h) => (
                                    <th key={h} className="px-4 py-3 text-xs font-bold text-text-3 text-left uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="p-10 text-center"><Spinner size="lg" className="mx-auto" /></td></tr>
                            ) : filteredReviews.length === 0 ? (
                                <tr><td colSpan={8} className="p-10 text-center text-text-3">No reviews found</td></tr>
                            ) : filteredReviews.map((rev) => (
                                <tr
                                    key={rev.id}
                                    className="group hover:bg-accent/[0.03] transition-colors border-b border-border/30 last:border-0 cursor-pointer"
                                    onClick={() => setViewReview(rev)}
                                >
                                    <td className="px-4 py-3.5">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${rev.employee.firstName} ${rev.employee.lastName}`} size="sm" />
                                            <div>
                                                <span className="font-semibold text-text block">{rev.employee.firstName} {rev.employee.lastName}</span>
                                                {rev.employee.department?.name && (
                                                    <span className="text-xs text-text-3">{rev.employee.department.name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3.5">
                                        {rev.formType ? (
                                            <Badge
                                                variant={rev.formType === "DAILY" ? "default" : "neutral"}
                                                size="sm"
                                            >
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
                                    <td className="px-4 py-3.5 text-sm text-text-3 font-mono">{format(new Date(rev.reviewDate), "MMM d, yyyy")}</td>
                                    <td className="px-4 py-3.5 text-sm text-text-3">
                                        {rev.reviewer ? `${rev.reviewer.firstName} ${rev.reviewer.lastName}` : "—"}
                                    </td>
                                    <td className="px-4 py-3.5">{getStatusBadge(rev.status)}</td>
                                    <td className="px-4 py-3.5">
                                        <Button variant="ghost" size="sm">View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Daily Review Dialog */}
            <Dialog open={dailyOpen} onClose={() => setDailyOpen(false)} size="full">
                <DialogHeader>
                    <DialogTitle>Daily Performance Review</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <DailyReviewForm
                        employees={employees}
                        onSubmit={handleSubmitReview}
                        onCancel={() => setDailyOpen(false)}
                    />
                </DialogBody>
            </Dialog>

            {/* Monthly Review Dialog */}
            <Dialog open={monthlyOpen} onClose={() => setMonthlyOpen(false)} size="full">
                <DialogHeader>
                    <DialogTitle>Monthly Performance Review</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <MonthlyReviewForm
                        employees={employees}
                        onSubmit={handleSubmitReview}
                        onCancel={() => setMonthlyOpen(false)}
                    />
                </DialogBody>
            </Dialog>

            {/* View Review Detail Dialog */}
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
