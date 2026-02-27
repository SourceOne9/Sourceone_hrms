"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
    DownloadIcon,
    DoubleArrowRightIcon,
    ReloadIcon,
    PlusIcon,
    TrashIcon,
    FileTextIcon,
    ArchiveIcon,
    CalendarIcon,
    PersonIcon,
    TokensIcon
} from "@radix-ui/react-icons"
import { format } from "date-fns"

type EntityType = "EMPLOYEE" | "PAYROLL" | "ATTENDANCE"

interface ColumnDef {
    id: string
    label: string
    entity: EntityType
}

const ENTITY_COLUMNS: ColumnDef[] = [
    // Employee
    { id: "employeeCode", label: "Emp Code", entity: "EMPLOYEE" },
    { id: "firstName", label: "First Name", entity: "EMPLOYEE" },
    { id: "lastName", label: "Last Name", entity: "EMPLOYEE" },
    { id: "email", label: "Email", entity: "EMPLOYEE" },
    { id: "designation", label: "Designation", entity: "EMPLOYEE" },
    { id: "salary", label: "Salary", entity: "EMPLOYEE" },

    // Payroll
    { id: "month", label: "Month", entity: "PAYROLL" },
    { id: "employee.employeeCode", label: "Emp Code", entity: "PAYROLL" },
    { id: "employee.firstName", label: "First Name", entity: "PAYROLL" },
    { id: "netSalary", label: "Net Salary", entity: "PAYROLL" },
    { id: "tax", label: "Tax", entity: "PAYROLL" },

    // Attendance
    { id: "date", label: "Date", entity: "ATTENDANCE" },
    { id: "employee.firstName", label: "Employee", entity: "ATTENDANCE" },
    { id: "checkIn", label: "Check In", entity: "ATTENDANCE" },
    { id: "checkOut", label: "Check Out", entity: "ATTENDANCE" },
    { id: "workHours", label: "Work Hours", entity: "ATTENDANCE" },
]

export function ReportBuilder() {
    const [entityType, setEntityType] = useState<EntityType>("EMPLOYEE")
    const [selectedColumns, setSelectedColumns] = useState<string[]>([])
    const [filters, setFilters] = useState<Record<string, string>>({})
    const [reportName, setReportName] = useState("")
    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    // Reset columns when entity changes
    useEffect(() => {
        const defaults = ENTITY_COLUMNS.filter(c => c.entity === entityType).slice(0, 4).map(c => c.id)
        setSelectedColumns(defaults)
    }, [entityType])

    const handlePreview = async () => {
        if (selectedColumns.length === 0) {
            toast.error("Please select at least one column")
            return
        }

        setLoading(true)
        try {
            const res = await fetch("/api/reports/query", {
                method: "POST",
                body: JSON.stringify({
                    entityType,
                    columns: selectedColumns,
                    filters,
                    limit: 10
                })
            })
            if (res.ok) {
                const result = await res.json()
                setPreviewData(result.data.data)
            }
        } catch (error) {
            toast.error("Failed to fetch preview")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!reportName) return toast.error("Please enter a report name")
        setSaving(true)
        try {
            const res = await fetch("/api/reports/saved", {
                method: "POST",
                body: JSON.stringify({
                    name: reportName,
                    entityType,
                    config: { columns: selectedColumns, filters }
                })
            })
            if (res.ok) {
                toast.success("Report saved successfully")
            }
        } catch (error) {
            toast.error("Failed to save report")
        } finally {
            setSaving(false)
        }
    }

    const handleExport = async () => {
        try {
            const res = await fetch("/api/reports/export", {
                method: "POST",
                body: JSON.stringify({
                    config: { entityType, columns: selectedColumns, filters },
                    format: "CSV"
                })
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `Report_${format(new Date(), "yyyyMMdd")}.csv`
                a.click()
            }
        } catch (error) {
            toast.error("Export failed")
        }
    }

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_ease-out]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass p-6 space-y-6">
                        <div>
                            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-tight block mb-2">Report Name</label>
                            <input
                                type="text"
                                value={reportName}
                                onChange={(e) => setReportName(e.target.value)}
                                placeholder="e.g., Monthly Payroll Summary"
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-2.5 text-[14px] focus:outline-none focus:border-[var(--accent)]"
                            />
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-tight block mb-2">Entity Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(["EMPLOYEE", "PAYROLL", "ATTENDANCE"] as EntityType[]).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setEntityType(type)}
                                        className={`p-2 rounded-lg border text-[11px] font-bold transition-all ${entityType === type
                                                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                                                : "bg-[var(--surface)] text-[var(--text2)] border-[var(--border)] hover:border-[var(--accent)]/30"
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-[12px] font-bold text-[var(--text3)] uppercase tracking-tight block mb-2">Select Columns</label>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {ENTITY_COLUMNS.filter(c => c.entity === entityType).map((col) => (
                                    <label key={col.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--surface)] cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(col.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedColumns([...selectedColumns, col.id])
                                                else setSelectedColumns(selectedColumns.filter(id => id !== col.id))
                                            }}
                                            className="accent-[var(--accent)]"
                                        />
                                        <span className="text-[13px] text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border)]">
                            <button
                                onClick={handlePreview}
                                disabled={loading}
                                className="w-full py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[13px] font-bold text-[var(--text)] hover:bg-[var(--bg2)] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <ReloadIcon className="animate-spin" /> : <ReloadIcon />}
                                Preview Data
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass p-6 min-h-[400px] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[16px] font-bold">Preview (Top 10)</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[12px] font-bold hover:border-[var(--accent)]/50 transition-all flex items-center gap-2"
                                >
                                    {saving ? <ReloadIcon className="animate-spin" /> : <PlusIcon />}
                                    Save Report
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-[12px] font-bold hover:scale-[1.02] transition-transform flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                >
                                    <DownloadIcon />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                            {previewData.length > 0 ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg2)]">
                                            {selectedColumns.map(col => {
                                                const def = ENTITY_COLUMNS.find(c => c.id === col)
                                                return (
                                                    <th key={col} className="p-3 text-[11px] font-bold text-[var(--text3)] uppercase tracking-tight border-b border-[var(--border)] whitespace-nowrap">
                                                        {def?.label || col}
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="hover:bg-[var(--surface2)]/50 transition-colors">
                                                {selectedColumns.map(col => {
                                                    let val = row
                                                    if (col.includes(".")) {
                                                        col.split(".").forEach(p => val = val?.[p])
                                                    } else {
                                                        val = row[col]
                                                    }
                                                    return (
                                                        <td key={col} className="p-3 text-[13px] text-[var(--text2)] border-b border-[var(--border)]">
                                                            {typeof val === "object" ? "..." : String(val ?? "-")}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-[var(--text3)] space-y-2 py-20">
                                    <ArchiveIcon className="w-8 h-8 opacity-20" />
                                    <p className="text-[13px] italic">Configure columns and click Preview to see data</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
