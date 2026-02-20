"use client"

import * as React from "react"
import { mockDocuments } from "@/lib/mockData"
import { useAuth } from "@/context/AuthContext"
import { FileTextIcon, DownloadIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

export default function MyDocuments() {
    const { user } = useAuth()

    // In real app, filter by user.id
    const policies = mockDocuments.filter(d => d.isPublic)
    const myDocs = mockDocuments.filter(d => !d.isPublic && d.employeeId === "1") // Mock ID check

    const DocCard = ({ doc }: { doc: any }) => (
        <div className="glass p-4 flex items-center gap-4 hover:border-[var(--accent)] transition-colors group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                <FileTextIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-[var(--text)] truncate">{doc.title}</h4>
                <p className="text-[11px] text-[var(--text3)] mt-0.5">{doc.category} • {doc.uploadDate}</p>
            </div>
            <button className="p-2 text-[var(--text3)] hover:text-[var(--accent)] hover:bg-[var(--bg2)] rounded-full transition-all">
                <DownloadIcon />
            </button>
        </div>
    )

    return (
        <div className="space-y-8 animate-[pageIn_0.3s_cubic-bezier(0.4,0,0.2,1)]">
            <div>
                <h1 className="text-[26px] font-extrabold tracking-[-0.5px] text-[var(--text)] mb-[4px]">Documents</h1>
                <p className="text-[13.5px] text-[var(--text3)]">Access company policies and your personal records</p>
            </div>

            <section>
                <h3 className="text-[14px] font-bold text-[var(--text2)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    🏢 Company Policies
                    <span className="bg-[var(--surface-2)] text-[var(--text3)] text-[10px] px-2 py-0.5 rounded-full">{policies.length}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {policies.map(doc => <DocCard key={doc.id} doc={doc} />)}
                </div>
            </section>

            <section>
                <h3 className="text-[14px] font-bold text-[var(--text2)] uppercase tracking-wider mb-4 flex items-center gap-2">
                    🔒 Personal Files
                    <span className="bg-[var(--surface-2)] text-[var(--text3)] text-[10px] px-2 py-0.5 rounded-full">{myDocs.length}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myDocs.map(doc => <DocCard key={doc.id} doc={doc} />)}
                    {myDocs.length === 0 && (
                        <div className="col-span-full py-8 text-center text-[var(--text3)] bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-xl">
                            No personal documents found.
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
