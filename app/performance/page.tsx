"use client"

import * as React from "react"

import { useAuth } from "@/context/AuthContext"
import { AdminPerformanceView } from "@/components/performance/AdminPerformanceView"
import { EmployeePerformanceView } from "@/components/performance/EmployeePerformanceView"
import { Module, Roles, canAccessModule } from "@/lib/permissions"
import { useRouter } from "next/navigation"

export default function PerformancePage() {
    const { user, isLoading } = useAuth()
    const router = useRouter()
    React.useEffect(() => { if (!isLoading && user && !canAccessModule(user.role, Module.PERFORMANCE)) router.push("/") }, [user, isLoading, router])

    if (isLoading || !user) {
        return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>
    }

    const role = user.role

    if (role === Roles.CEO || role === Roles.HR || role === Roles.TEAM_LEAD) {
        return <AdminPerformanceView />
    }

    return <EmployeePerformanceView />
}
