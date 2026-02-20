"use client"

import * as React from "react"
import { Asset, AssetStatus, AssetType } from "@/types"
import { mockAssets } from "@/lib/mockData"
import { DataTable } from "@/components/ui/DataTable"
import { ColumnDef } from "@tanstack/react-table"
import { Modal } from "@/components/ui/Modal"
import { PlusIcon, LaptopIcon, CubeIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

// --- Components ---

const StatusBadge = ({ status }: { status: AssetStatus }) => {
    const styles = {
        'Available': "bg-[var(--green-dim)] text-[#1a9140] border-[rgba(52,199,89,0.25)]",
        'Assigned': "bg-[var(--blue-dim)] text-[#007aff] border-[rgba(0,122,255,0.25)]",
        'Maintenance': "bg-[var(--amber-dim)] text-[#b86c00] border-[rgba(255,149,0,0.25)]",
        'Retired': "bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)]",
    }
    return (
        <span className={cn("inline-flex items-center gap-[4px] px-[11px] py-[4px] rounded-[20px] text-[12px] font-semibold border", styles[status])}>
            ● {status}
        </span>
    )
}

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="glass p-5 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white text-[20px]", color)}>
            {icon}
        </div>
        <div>
            <div className="text-[24px] font-extrabold text-[var(--text)]">{value}</div>
            <div className="text-[12px] text-[var(--text3)] uppercase tracking-wider font-semibold">{label}</div>
        </div>
    </div>
)

// --- Page ---

export default function AssetManagement() {
    const [assets, setAssets] = React.useState<Asset[]>(mockAssets)
    const [isModalOpen, setIsModalOpen] = React.useState(false)
    const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null)

    // Stats
    const totalValue = assets.reduce((sum, a) => sum + a.value, 0)
    const assignedCount = assets.filter(a => a.status === 'Assigned').length
    const maintenanceCount = assets.filter(a => a.status === 'Maintenance').length

    const columns: ColumnDef<Asset>[] = [
        {
            accessorKey: "name",
            header: "Asset Name",
            cell: ({ row }) => (
                <div className="font-semibold text-[var(--text)]">{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => <div className="text-[var(--text2)]">{row.getValue("type")}</div>,
        },
        {
            accessorKey: "serialNumber",
            header: "Serial No.",
            cell: ({ row }) => <div className="font-mono text-[12px] text-[var(--text3)]">{row.getValue("serialNumber")}</div>,
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
        },
        {
            accessorKey: "assignedTo",
            header: "Assigned To",
            cell: ({ row }) => {
                const assigned = row.getValue("assignedTo")
                // In real app, look up employee name
                return <div className="text-[var(--text2)]">{assigned ? `Employee #${assigned}` : "-"}</div>
            },
        },
        {
            accessorKey: "value",
            header: "Value",
            cell: ({ row }) => <div className="text-[var(--text2)]">${row.getValue<number>("value").toLocaleString()}</div>,
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <button
                    onClick={() => { setEditingAsset(row.original); setIsModalOpen(true) }}
                    className="text-[12px] text-[var(--accent)] hover:underline"
                >
                    Edit
                </button>
            )
        }
    ]

    return (
        <div className="space-y-6 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)]">Asset Management</h1>
                    <p className="text-[13.5px] text-[var(--text3)] mt-[4px]">Track and manage company hardware and licenses</p>
                </div>
                <button
                    onClick={() => { setEditingAsset(null); setIsModalOpen(true) }}
                    className="flex items-center gap-2 p-[9px_14px] bg-[var(--accent)] text-white rounded-[9px] text-[13px] font-semibold hover:opacity-90 transition-opacity shadow-[0_2px_8px_rgba(0,122,255,0.25)]"
                >
                    <PlusIcon className="w-4 h-4" /> Add Asset
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Total Assets" value={assets.length} icon={<CubeIcon />} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <StatCard label="Assigned" value={assignedCount} icon={<LaptopIcon />} color="bg-gradient-to-br from-green-500 to-emerald-600" />
                <StatCard label="In Repair" value={maintenanceCount} icon={<ExclamationTriangleIcon />} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                <StatCard label="Total Value" value={`$${totalValue.toLocaleString()}`} icon="$" color="bg-gradient-to-br from-purple-500 to-indigo-600" />
            </div>

            <DataTable
                columns={columns}
                data={assets}
                searchKey="name"
                filterFields={[
                    { id: "type", label: "Type", options: ["Hardware", "Software", "Accessory"] },
                    { id: "status", label: "Status", options: ["Available", "Assigned", "Maintenance"] }
                ]}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAsset ? "Edit Asset" : "Add New Asset"}
            >
                <div className="p-4 text-[var(--text3)] text-sm">
                    {/* Placeholder Form */}
                    <p>Form to add/edit assets will go here.</p>
                    <p>Fields: Name, Type, Serial, Status, Assigned Employee, Value.</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 border rounded-md">Cancel</button>
                        <button onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-md">Save</button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
