"use client"

import * as React from "react"
import { DashboardStatCard } from "./DashboardComponents"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Avatar } from "@/components/ui/Avatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { CalendarIcon, ClockIcon, BackpackIcon, PersonIcon } from "@radix-ui/react-icons"
import { KudosWidget } from "./KudosWidget"
import { TimeTracker } from "./TimeTracker"
import { OnboardingCompanion } from "./OnboardingCompanion"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

interface TeamMember {
    id: string
    name: string
    designation: string
    avatarUrl: string | null
    attendanceStatus: "PRESENT" | "ABSENT"
}

interface TeamData {
    id: string
    name: string
    description: string | null
    memberCount: number
    members: TeamMember[]
}

interface DashboardData {
    stats: {
        attendanceCount: number
        leavesUsed: number
        pendingTrainingCount: number
        reviewStatus: string
    } | null
    teamStatus: any[]
    team: TeamData | null
}

export function TeamLeadDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = React.useState(true)
    const [data, setData] = React.useState<DashboardData | null>(null)
    const isFirstLoad = React.useRef(true)

    const fetchDashboardData = React.useCallback(async () => {
        try {
            if (isFirstLoad.current) setLoading(true)
            const res = await fetch("/api/dashboard", { cache: "no-store" })
            if (res.ok) {
                const json = await res.json()
                setData(json.data || json)
            } else {
                console.error("Dashboard API error:", res.status)
            }
        } catch (error) {
            console.error("Dashboard fetch error:", error)
        } finally {
            isFirstLoad.current = false
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchDashboardData()
        let interval: NodeJS.Timeout | null = null
        const startPolling = () => {
            if (interval) clearInterval(interval)
            interval = setInterval(fetchDashboardData, 30000)
        }
        const handleVisibility = () => {
            if (document.hidden) {
                if (interval) clearInterval(interval)
                interval = null
            } else {
                fetchDashboardData()
                startPolling()
            }
        }
        startPolling()
        document.addEventListener("visibilitychange", handleVisibility)
        return () => {
            if (interval) clearInterval(interval)
            document.removeEventListener("visibilitychange", handleVisibility)
        }
    }, [fetchDashboardData])

    const team = data?.team

    return (
        <div className="relative min-h-screen overflow-hidden p-1">
            {/* Background */}
            <div className="fixed inset-0 mesh-bg opacity-40 dark:opacity-20 pointer-events-none" />
            <div className="orb w-[400px] h-[400px] bg-accent/15 top-[-100px] right-[-100px]" />
            <div className="orb w-[300px] h-[300px] bg-purple/10 bottom-[100px] left-[-50px]" style={{ animationDelay: "-5s" }} />

            <div className="relative z-10 space-y-8 animate-page-in">
                {/* Hero Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-accent to-purple p-8 md:p-10 rounded-2xl text-white shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full translate-x-32 -translate-y-32 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10">
                        <h1 className="text-[32px] md:text-[40px] font-black tracking-tight leading-tight">
                            Welcome back,<br />
                            <span className="text-white/70">{user?.name?.split(" ")[0] || "Team Lead"}</span>
                        </h1>
                        <p className="text-md text-white/80 mt-4 max-w-[450px] font-medium leading-relaxed">
                            {team
                                ? `Leading team "${team.name}" with ${team.memberCount} member${team.memberCount !== 1 ? "s" : ""}. Keep your team performing at their best!`
                                : data?.stats?.attendanceCount
                                    ? `You've been present for ${data.stats.attendanceCount} days this month. Keep up the great work!`
                                    : "Check-in to start your day and track your progress."
                            }
                        </p>
                        <div className="flex gap-3 mt-8">
                            <Link href="/profile" className="px-6 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-md font-bold transition-all border border-white/10">
                                View Profile
                            </Link>
                            <Link href="/calendar" className="px-6 py-2.5 bg-white text-accent rounded-xl text-md font-bold transition-all hover:shadow-lg">
                                Calendar
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="bg-surface border border-border rounded-xl p-5 h-[140px] animate-pulse" />
                        ))
                    ) : (
                        <>
                            <DashboardStatCard label="Attendance" value={String(data?.stats?.attendanceCount || 0)} sub="Days present this month" badge="Live" badgeType="up" icon={<ClockIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Leave Balance" value={String(data?.stats?.leavesUsed || 0)} sub="Leaves used" badge="Yearly" badgeType="neutral" icon={<CalendarIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Pending Training" value={String(data?.stats?.pendingTrainingCount || 0)} sub="Assigned modules"
                                badge={(data?.stats?.pendingTrainingCount || 0) > 0 ? "Priority" : "Done"}
                                badgeType={(data?.stats?.pendingTrainingCount || 0) > 0 ? "down" : "up"}
                                icon={<BackpackIcon className="w-5 h-5" />} />
                            <DashboardStatCard label="Review Status" value={data?.stats?.reviewStatus || "Upcoming"} sub="Next evaluation" badge="Q1" badgeType="neutral" icon={<span className="text-lg">📊</span>} />
                        </>
                    )}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                    <div className="space-y-6">
                        <OnboardingCompanion />

                        {/* Team Overview Card */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                            <PersonIcon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg">
                                            {team ? `My Team — ${team.name}` : "My Team"}
                                        </CardTitle>
                                    </div>
                                    {team && (
                                        <Badge variant="neutral" size="sm">
                                            {team.memberCount} member{team.memberCount !== 1 ? "s" : ""}
                                        </Badge>
                                    )}
                                </div>
                                {team?.description && (
                                    <p className="text-sm text-text-3 mt-2">{team.description}</p>
                                )}
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="space-y-4">
                                        {Array(3).fill(0).map((_, i) => <div key={i} className="h-14 w-full bg-bg-2 rounded-xl animate-pulse" />)}
                                    </div>
                                ) : !team ? (
                                    <EmptyState
                                        title="No team assigned"
                                        description="Contact your administrator to get assigned to a team."
                                        icon={<PersonIcon className="w-8 h-8" />}
                                    />
                                ) : team.members.length === 0 ? (
                                    <EmptyState
                                        title="No members yet"
                                        description="Your team doesn't have any members assigned yet."
                                        icon={<PersonIcon className="w-8 h-8" />}
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {team.members.map((member) => (
                                            <div key={member.id} className="flex items-center justify-between p-3 hover:bg-bg/50 rounded-xl transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={member.name} size="default" />
                                                    <div>
                                                        <span className="text-md font-bold text-text-2 block group-hover:text-text transition-colors">
                                                            {member.name}
                                                        </span>
                                                        <span className="text-xs text-text-3 font-medium">
                                                            {member.designation}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2.5 h-2.5 rounded-full ring-4 transition-all duration-300",
                                                        member.attendanceStatus === "PRESENT"
                                                            ? "bg-success ring-success/10"
                                                            : "bg-text-4 ring-text-4/10"
                                                    )} />
                                                    <span className={cn(
                                                        "text-xs font-semibold",
                                                        member.attendanceStatus === "PRESENT" ? "text-success" : "text-text-4"
                                                    )}>
                                                        {member.attendanceStatus === "PRESENT" ? "Active" : "Away"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Today's Schedule */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                        <CalendarIcon className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-md text-text-3 py-12 text-center bg-bg-2/30 rounded-xl border-2 border-dashed border-border font-medium">
                                    No events scheduled for today.
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-6">
                        <TimeTracker />
                        <KudosWidget />

                        {/* Quick Actions */}
                        <Card variant="glass-premium" className="rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-lg">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Link href="/performance" className="block">
                                        <Button variant="primary" className="w-full justify-start gap-3">
                                            <span className="text-lg">⭐</span>
                                            Review Team Member
                                        </Button>
                                    </Link>
                                    <Link href="/leave" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">🏖️</span>
                                            Approve Leaves
                                        </Button>
                                    </Link>
                                    <Link href="/help-desk" className="block">
                                        <Button variant="secondary" className="w-full justify-start gap-3">
                                            <span className="text-lg">🎫</span>
                                            Raise Ticket
                                        </Button>
                                    </Link>
                                    <Link href="/attendance" className="block">
                                        <Button variant="ghost" className="w-full justify-start gap-3">
                                            <span className="text-lg">📅</span>
                                            View Attendance
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
