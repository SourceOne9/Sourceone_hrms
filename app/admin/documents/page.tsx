"use client"

import * as React from "react"
import { Document, DocCategory } from "@/types"
import { mockDocuments } from "@/lib/mockData"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, FileTextIcon, DownloadIcon, TrashIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

export default function DocumentManagement() {
    const [documents, setDocuments] = React.useState<Document[]>(mockDocuments)
    const [activeTab, setActiveTab] = React.useState<'policies' | 'employee_files'>('policies')
    const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false)

    const filteredDocs = activeTab === 'policies'
        ? documents.filter(d => d.isPublic)
        : documents.filter(d => !d.isPublic)

    const columns: ColumnDef<Document>[] = [
        {
            accessorKey: "title",
            header: "Document Name",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)]">
                        <FileTextIcon />
                    </div>
                    <div>
                        <div className="font-semibold text-[var(--text)]">{row.getValue("title")}</div>
                        <div className="text-[11px] text-[var(--text3)]">{row.original.size} • {row.original.category}</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "uploadDate",
            header: "Date Uploaded",
            cell: ({ row }) => <div className="text-[var(--text2)]">{row.getValue("uploadDate")}</div>,
        },
        {
            accessorKey: "employeeId",
            header: "Employee",
            cell: ({ row }) => {
                const empId = row.getValue("employeeId")
                return <div className="text-[var(--text2)]">{empId ? `ID: ${empId}` : "All Employees"}</div>
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-[var(--bg2)] rounded-md text-[var(--text2)] transition-colors">
                        <DownloadIcon />
                    </button>
                    <button className="p-2 hover:bg-[var(--red-dim)] rounded-md text-[var(--red)] transition-colors">
                        <TrashIcon />
                    </button>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Document Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Securely store and manage company policies and employee records</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                >
                    <PlusIcon className="w-4 h-4" /> Upload Document
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('policies')}
                    className={cn(
                        "px-4 py-1.5 text-[13px] font-medium rounded-md transition-all",
                        activeTab === 'policies' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                    )}
                >
                    Company Policies
                </button>
                <button
                    onClick={() => setActiveTab('employee_files')}
                    className={cn(
                        "px-4 py-1.5 text-[13px] font-medium rounded-md transition-all",
                        activeTab === 'employee_files' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text3)] hover:text-[var(--text2)]"
                    )}
                >
                    Employee Files
                </button>
            </div>

            <DataTable
                columns={columns}
                data={filteredDocs}
                searchKey="title"
            />

            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                title="Upload Document"
            >
                <div className="p-8 border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--text3)] hover:bg-[var(--bg2)] transition-colors cursor-pointer">
                    <FileTextIcon className="w-8 h-8 mb-2" />
                    <span className="font-semibold">Click to upload</span>
                    <span className="text-[12px]">or drag and drop PDF, DOCX, PNG</span>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setIsUploadModalOpen(false)} className="px-3 py-1.5 border rounded-md text-sm">Cancel</button>
                </div>
            </Modal>
        </div>
    )
}
