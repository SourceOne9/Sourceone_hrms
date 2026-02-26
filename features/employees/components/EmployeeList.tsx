"use client"

import * as React from "react"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { CaretSortIcon, DownloadIcon, PlusIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { TableEmployee, Department } from "@/features/employees/types"

interface EmployeeListProps {
    employees: TableEmployee[]
    departments: Department[]
    isLoading: boolean
    pageCount: number
    pageIndex: number
    totalRows: number
    onPageChange: (newPageIndex: number) => void
    onOpenCreateModal: () => void
    onOpenEditModal: (emp: any) => void
    onOpenViewModal: (emp: any) => void
    onResetCredentials: (emp: any) => void
    onDelete: (id: string, name: string) => void
    onImportClick: () => void
    onExportCSV: () => void
    onExportPDF: () => void
    isResettingCreds: string | null
}

export const EmployeeList = React.memo(function EmployeeList({
    employees,
    departments,
    isLoading,
    pageCount,
    pageIndex,
    totalRows,
    onPageChange,
    onOpenCreateModal,
    onOpenEditModal,
    onOpenViewModal,
    onResetCredentials,
    onDelete,
    onImportClick,
    onExportCSV,
    onExportPDF,
    isResettingCreds
}: EmployeeListProps) {
    const columns = React.useMemo<ColumnDef<TableEmployee>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <button
                        className="flex items-center gap-1 hover:text-[var(--text)] transition-colors"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Name
                        <CaretSortIcon className="w-3 h-3" />
                    </button>
                )
            },
            cell: ({ row }) => (
                <div className="flex items-center gap-[11px] text-[13.5px] text-[var(--text)]">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0 overflow-hidden",
                        !row.original.avatarUrl && (row.original.color || "bg-gray-400"))}>
                        {row.original.avatarUrl ? (
                            <img src={row.original.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            row.original.initials
                        )}
                    </div>
                    <span className="font-semibold">{row.getValue("name")}</span>
                </div>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => <div className="text-[13px] text-[var(--text3)]">{row.getValue("email")}</div>,
        },
        {
            accessorKey: "dept",
            header: "Department",
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold bg-[rgba(0,122,255,0.08)] text-[var(--accent)] border border-[rgba(0,122,255,0.18)]">
                    {row.getValue("dept")}
                </span>
            ),
        },
        {
            accessorKey: "role",
            header: "Position",
            cell: ({ row }) => <div className="text-[13.5px] text-[var(--text)]">{row.getValue("role")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                return (
                    <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border",
                        status === 'Active'
                            ? "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]"
                            : status === 'On Leave'
                                ? "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]"
                                : status === 'Resigned'
                                    ? "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]"
                                    : "bg-[var(--red-dim)] text-[var(--red)] border-[rgba(255,59,48,0.25)]"
                    )}>
                        ● {status}
                    </span>
                )
            },
        },
        {
            accessorKey: "start",
            header: "Start Date",
            cell: ({ row }) => <div className="text-[13px] text-[var(--text3)] font-mono">{row.getValue("start")}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const emp = row.original.raw
                return (
                    <div className="flex items-center gap-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            title="View"
                            onClick={() => onOpenViewModal(emp)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">👁</button>
                        <button
                            title="Edit"
                            onClick={() => onOpenEditModal(emp)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(0,122,255,0.08)] hover:border-[rgba(0,122,255,0.25)] hover:text-[var(--accent)] hover:scale-110">✏</button>
                        <button
                            title="Reset Login Credentials"
                            onClick={() => onResetCredentials(emp)}
                            disabled={isResettingCreds === emp.id}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(255,149,0,0.08)] hover:border-[rgba(255,149,0,0.3)] hover:text-amber-500 hover:scale-110 disabled:opacity-40">🔑</button>
                        <button
                            title="Delete"
                            onClick={() => onDelete(emp.id, `${emp.firstName} ${emp.lastName}`)}
                            className="w-[30px] h-[30px] rounded-[8px] border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center text-[13px] text-[var(--text3)] transition-all duration-200 hover:bg-[rgba(255,59,48,0.08)] hover:border-[rgba(255,59,48,0.25)] hover:text-[var(--red)] hover:scale-110">🗑</button>
                    </div>
                )
            },
        },
    ], [departments, isResettingCreds, onOpenEditModal, onOpenViewModal, onResetCredentials, onDelete]) // Re-memoize if passed functions change

    if (isLoading) {
        return (
            <div className="h-[400px] w-full flex items-center justify-center text-[var(--text3)]">
                Loading Data...
            </div>
        )
    }

    return (
        <DataTable
            columns={columns}
            data={employees}
            searchKey="name"
            pageCount={pageCount}
            pageIndex={pageIndex}
            totalRows={totalRows}
            onPageChange={onPageChange}
            filterFields={[
                { id: "dept", label: "Departments", options: departments.map(d => d.name) },
                { id: "status", label: "Status", options: ["Active", "On Leave", "Resigned", "Terminated"] }
            ]}
            actions={
                <>
                    <button
                        onClick={onImportClick}
                        className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                    >
                        <DownloadIcon className="w-3.5 h-3.5 rotate-180" /> Import
                    </button>
                    <button
                        onClick={onExportCSV}
                        className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" /> CSV
                    </button>
                    <button
                        onClick={onExportPDF}
                        className="flex items-center gap-2 p-[9px_14px] bg-[var(--surface)] border border-[var(--border)] rounded-[9px] text-[13px] text-[var(--text2)] hover:bg-[var(--bg2)] transition-colors"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                        onClick={onOpenCreateModal}
                        className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]">
                        <PlusIcon className="w-4 h-4" /> Add Employee
                    </button>
                </>
            }
        />
    )
})
