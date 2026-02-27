"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { ReloadIcon, LockClosedIcon, PersonIcon, DesktopIcon, DiscIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"

interface Session {
    id: string
    userName: string
    email: string
    avatar: string | null
    ipAddress: string
    userAgent: string
    lastActive: string
    isRevoked: boolean
    isActive: boolean
}

export function SessionManager() {
    const [sessions, setSessions] = useState<Session[]>([])
    const [loading, setLoading] = useState(true)
    const [revoking, setRevoking] = useState<string | null>(null)

    const fetchSessions = async () => {
        try {
            const res = await fetch("/api/admin/sessions")
            if (res.ok) {
                const data = await res.json()
                setSessions(data.data || (Array.isArray(data) ? data : []))
            }
        } catch (error) {
            toast.error("Failed to fetch sessions")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSessions()
        const interval = setInterval(fetchSessions, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleRevoke = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to revoke the session for ${name}? User will be logged out immediately.`)) return

        setRevoking(id)
        try {
            const res = await fetch(`/api/admin/sessions/${id}/revoke`, {
                method: "POST"
            })

            if (res.ok) {
                toast.success(`Session for ${name} revoked`)
                fetchSessions()
            } else {
                toast.error("Failed to revoke session")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setRevoking(null)
        }
    }

    return (
        <div className="glass p-6 animate-[pageIn_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-[18px] font-bold text-[var(--text)]">Active Sessions</h2>
                    <p className="text-[12px] text-[var(--text3)]">Monitor and manage connected devices/sessions across the organization</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchSessions() }}
                    className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                    <ReloadIcon className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="space-y-3">
                {loading && sessions.length === 0 ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-16 w-full bg-[var(--surface)] rounded-xl animate-pulse" />
                    ))
                ) : sessions.length > 0 ? (
                    sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-[var(--surface2)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--surface)] to-[var(--bg2)] flex items-center justify-center border border-[var(--border)] overflow-hidden">
                                    {session.avatar ? (
                                        <img src={session.avatar} alt={session.userName} className="w-full h-full object-cover" />
                                    ) : (
                                        <PersonIcon className="w-5 h-5 text-[var(--text3)]" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[14px] font-bold text-[var(--text)]">{session.userName}</span>
                                        {session.isActive ? (
                                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                        ) : (
                                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Revoked</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <div className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
                                            <DesktopIcon className="w-3 h-3" />
                                            <span className="max-w-[150px] truncate">{session.userAgent}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
                                            <DiscIcon className="w-3 h-3" />
                                            <span>{session.ipAddress}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[11px] font-bold text-[var(--text2)] uppercase tracking-tight">Last Active</div>
                                    <div className="text-[12px] text-[var(--text3)]">{format(new Date(session.lastActive), "MMM d, HH:mm")}</div>
                                </div>
                                <button
                                    onClick={() => handleRevoke(session.id, session.userName)}
                                    disabled={session.isRevoked || revoking === session.id}
                                    className="p-2.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-red-500/10 disabled:hover:text-red-500"
                                    title="Revoke Session"
                                >
                                    {revoking === session.id ? <ReloadIcon className="animate-spin w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-[var(--text3)] italic">
                        No active sessions found.
                    </div>
                )}
            </div>
        </div>
    )
}
