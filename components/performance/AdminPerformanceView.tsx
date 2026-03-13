"use client"

import * as React from "react"
import { extractArray } from "@/lib/utils"
import { Dialog, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { PageHeader } from "@/components/ui/PageHeader"
import { Spinner } from "@/components/ui/Spinner"
import { DailyReviewForm } from "./DailyReviewForm"
import { MonthlyReviewForm } from "./MonthlyReviewForm"
import { ReviewDetailView } from "./ReviewDetailView"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { MagnifyingGlassIcon, FileTextIcon } from "@radix-ui/react-icons"

type Employee = {
    id: string
    firstName: string
    lastName: string
    designation?: string
    avatarUrl?: string | null
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

    // Master-detail state
    const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string | null>(null)
    const [empSearch, setEmpSearch] = React.useState("")

    const fetchAll = React.useCallback(async () => {
        try {
            setIsLoading(true)
            const role = user?.role

            const revRes = await fetch("/api/performance")

            let empPromise: Promise<Response>
            if (role === "TEAM_LEAD") {
                empPromise = fetch("/api/teams").then(async (res) => {
                    if (!res.ok) return new Response(JSON.stringify({ data: [] }))
                    const json = await res.json()
                    const teams = json.data || json || []
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
                const mapped: Employee[] = empArr.map((e: any) => {
                    if (e.employee) {
                        return {
                            id: e.employee.id,
                            firstName: e.employee.firstName,
                            lastName: e.employee.lastName,
                            designation: e.employee.designation,
                            avatarUrl: e.employee.avatarUrl,
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

    // Filter employees by search
    const filteredEmployees = React.useMemo(() => {
        if (!empSearch.trim()) return employees
        const q = empSearch.toLowerCase()
        return employees.filter(e =>
            `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
            (e.designation || "").toLowerCase().includes(q) ||
            (e.department?.name || "").toLowerCase().includes(q)
        )
    }, [employees, empSearch])

    // Reviews for selected employee
    const selectedReviews = React.useMemo(() => {
        if (!selectedEmployeeId) return []
        return reviews.filter(r => r.employeeId === selectedEmployeeId)
    }, [reviews, selectedEmployeeId])

    const selectedEmployee = React.useMemo(() => {
        return employees.find(e => e.id === selectedEmployeeId) || null
    }, [employees, selectedEmployeeId])

    return (
        <div className="space-y-6 animate-page-in">
            <PageHeader
                title="Performance Management"
                description="Browse employee and team lead performance"
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

            {/* Master-Detail Layout */}
            <div className="flex gap-4 min-h-[calc(100vh-220px)]">
                {/* Left Panel — Employee List */}
                <div className="w-[320px] shrink-0 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-border">
                        <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-text-2">
                            <FileTextIcon className="w-4 h-4 text-text-3" />
                            List of employee
                        </div>
                        <div className="relative mt-2">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-4" />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={empSearch}
                                onChange={(e) => setEmpSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-bg-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-text placeholder:text-text-4"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Spinner />
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="text-center py-12 text-sm text-text-3">No employees found</div>
                        ) : (
                            <div className="p-1.5">
                                {filteredEmployees.map((emp) => {
                                    const reviewCount = reviews.filter(r => r.employeeId === emp.id).length
                                    const isSelected = selectedEmployeeId === emp.id
                                    return (
                                        <button
                                            key={emp.id}
                                            onClick={() => setSelectedEmployeeId(emp.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                                                isSelected
                                                    ? "bg-accent/10 border border-accent/20"
                                                    : "hover:bg-bg-2 border border-transparent"
                                            )}
                                        >
                                            <Avatar
                                                name={`${emp.firstName} ${emp.lastName}`}
                                                src={emp.avatarUrl || undefined}
                                                size="sm"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className={cn(
                                                    "text-sm font-semibold truncate",
                                                    isSelected ? "text-accent" : "text-text"
                                                )}>
                                                    {emp.firstName} {emp.lastName}
                                                </div>
                                                <div className="text-[11px] text-text-3 truncate">
                                                    {emp.designation || emp.department?.name || "Employee"}
                                                </div>
                                            </div>
                                            {reviewCount > 0 && (
                                                <span className="text-[10px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                                                    {reviewCount}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel — Reviews for Selected Employee */}
                <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                        <div className="text-sm text-text-2">
                            {selectedEmployee
                                ? <>Reviews for <span className="font-bold text-text">{selectedEmployee.firstName} {selectedEmployee.lastName}</span></>
                                : "List of all performance reviews for the selected employee/team lead"
                            }
                        </div>
                        <span className="text-xs font-medium text-text-3">
                            {selectedEmployeeId ? selectedReviews.length : reviews.length} docs
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!selectedEmployeeId ? (
                            /* No employee selected */
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl">
                                    📁
                                </div>
                                <p className="text-sm text-text-3 font-medium">Select an employee to view their reviews</p>
                            </div>
                        ) : selectedReviews.length === 0 ? (
                            /* Selected but no reviews */
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-3xl">
                                    📁
                                </div>
                                <p className="text-sm text-text-3 font-medium">No reviews yet</p>
                            </div>
                        ) : (
                            /* Review cards */
                            <div className="p-4 space-y-3">
                                {selectedReviews.map((rev) => (
                                    <button
                                        key={rev.id}
                                        onClick={() => setViewReview(rev)}
                                        className="w-full text-left p-4 bg-bg-2/50 hover:bg-accent/[0.04] border border-border/60 rounded-xl transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={rev.formType === "DAILY" ? "default" : rev.formType === "MONTHLY" ? "neutral" : "warning"}
                                                    size="sm"
                                                >
                                                    {rev.formType || "Legacy"}
                                                </Badge>
                                                {rev.reviewPeriod && (
                                                    <span className="text-xs text-text-3">{rev.reviewPeriod}</span>
                                                )}
                                            </div>
                                            {getStatusBadge(rev.status)}
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-warning tracking-wider text-sm">{"★".repeat(Math.floor(rev.rating))}</span>
                                                    <span className="text-text-4 tracking-wider text-sm">{"★".repeat(5 - Math.floor(rev.rating))}</span>
                                                    <span className="text-xs text-text-3 font-mono ml-1">{rev.rating.toFixed(1)}</span>
                                                </div>
                                                <div className="text-xs text-text-3">
                                                    {format(new Date(rev.reviewDate), "MMM d, yyyy")}
                                                    {rev.reviewer && (
                                                        <span className="ml-2">by {rev.reviewer.firstName} {rev.reviewer.lastName}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                                View Details →
                                            </span>
                                        </div>

                                        {rev.comments && (
                                            <p className="text-xs text-text-3 mt-2 line-clamp-2">{rev.comments}</p>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
