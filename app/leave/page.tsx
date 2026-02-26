"use client"

import React, { Suspense } from "react"
import { useAuth } from "@/context/AuthContext"
import { AdminLeaveView } from "@/components/leave/AdminLeaveView"
import { EmployeeLeaveView } from "@/components/leave/EmployeeLeaveView"

function LeaveContent() {
    const { user } = useAuth()

    if (user?.role === 'EMPLOYEE') {
        return <EmployeeLeaveView />
    }

    return <AdminLeaveView />
}

export default function Leave() {
    return (
        <Suspense fallback={<div>Loading leaves...</div>}>
            <LeaveContent />
        </Suspense>
    )
}
