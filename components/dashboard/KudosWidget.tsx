import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { PaperPlaneIcon, HeartFilledIcon, ReloadIcon } from "@radix-ui/react-icons"
import { toast } from "sonner"

interface KudosData {
    id: string
    from: string
    to: string
    message: string
    time: string
    color: string
}

export function KudosWidget() {
    const [kudos, setKudos] = useState<KudosData[]>([])
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState("")
    const [selectedRecipient, setSelectedRecipient] = useState("")
    const [colleagues, setColleagues] = useState<{ id: string, name: string }[]>([])

    const fetchKudos = async () => {
        try {
            const res = await fetch("/api/kudos")
            if (res.ok) {
                const data = await res.json()
                setKudos(data)
            }
        } catch (error) {
            console.error("Failed to fetch kudos:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchColleagues = async () => {
        try {
            const res = await fetch("/api/employees?limit=100")
            if (res.ok) {
                const data = await res.json()
                setColleagues(data.data.map((e: any) => ({
                    id: e.id,
                    name: `${e.firstName} ${e.lastName}`
                })))
            }
        } catch (error) {
            console.error("Failed to fetch colleagues:", error)
        }
    }

    useEffect(() => {
        fetchKudos()
        fetchColleagues()
        const interval = setInterval(fetchKudos, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [])

    const handleSendKudos = async () => {
        if (!selectedRecipient || !message.trim()) return

        setSending(true)
        try {
            const res = await fetch("/api/kudos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toId: selectedRecipient, message })
            })

            if (res.ok) {
                toast.success("Shoutout sent! 🎉")
                setMessage("")
                setSelectedRecipient("")
                fetchKudos()
            } else {
                const err = await res.json()
                toast.error(err.error || "Failed to send shoutout")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="glass p-6 relative overflow-hidden group min-h-[400px]">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                    <span className="text-[20px]">🎉</span>
                    <h3 className="text-[14px] font-bold text-[var(--text)]">Peer Kudos</h3>
                </div>
                {loading && <ReloadIcon className="w-3 h-3 animate-spin text-[var(--text3)]" />}
            </div>

            <div className="relative z-10 mb-5">
                <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-wider font-semibold">Send Appreciation</div>
                <div className="space-y-2">
                    <select
                        value={selectedRecipient}
                        onChange={(e) => setSelectedRecipient(e.target.value)}
                        className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                    >
                        <option value="">Select colleague...</option>
                        {colleagues.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendKudos()}
                            placeholder="Type a nice message..."
                            className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        <button
                            onClick={handleSendKudos}
                            disabled={sending || !selectedRecipient || !message.trim()}
                            className="w-9 h-9 flex items-center justify-center bg-[var(--accent)] text-white rounded-lg shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {sending ? <ReloadIcon className="w-4 h-4 animate-spin" /> : <PaperPlaneIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative z-10 space-y-3">
                <div className="text-[12px] text-[var(--text3)] mb-2 uppercase tracking-wider font-semibold">Recent Shoutouts</div>
                {loading ? (
                    Array(2).fill(0).map((_, i) => (
                        <div key={i} className="h-16 w-full bg-[var(--bg2)] rounded-xl animate-pulse" />
                    ))
                ) : kudos.length > 0 ? (
                    kudos.map((k, i) => (
                        <div key={k.id} className="flex gap-3 items-start animate-[fadeRow_0.3s_both]" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br shadow-sm", k.color)}>
                                {k.from.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 bg-[var(--surface2)] p-3 rounded-r-xl rounded-bl-xl text-[13px] border border-[var(--border)] relative">
                                <span className="font-bold text-[var(--text)]">{k.from} → {k.to}</span>
                                <p className="text-[var(--text2)] mt-0.5 leading-snug">{k.message}</p>
                                <span className="text-[10px] text-[var(--text3)] absolute right-2 top-2">{k.time}</span>
                                <div className="absolute -left-2 top-0 w-2 h-2 bg-[var(--surface2)] [clip-path:polygon(100%_0,0_0,100%_100%)]"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-[12px] text-[var(--text3)] py-4 text-center italic">
                        No shoutouts yet. Be the first! 🌟
                    </div>
                )}
            </div>

            <div className="absolute -right-6 -bottom-6 text-[100px] opacity-[0.03] rotate-[-15deg] pointer-events-none">
                <HeartFilledIcon />
            </div>
        </div>
    )
}
