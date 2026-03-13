"use client"

import { useAuth } from "@/context/AuthContext"
import { AdminReimbursementView } from "@/components/reimbursement/AdminReimbursementView"
import { EmployeeReimbursementView } from "@/components/reimbursement/EmployeeReimbursementView"
import { hasAdminScope, Module } from "@/lib/permissions"

export default function Reimbursement() {
    const { user } = useAuth()

    if (!hasAdminScope(user?.role ?? '', Module.REIMBURSEMENT)) {
        return <EmployeeReimbursementView />
    }

    return <AdminReimbursementView />
}
