import { cn } from "@/lib/utils"

export function StatCard({ label, value, sub, badge, badgeType, icon, iconClass, glowClass, isMoney }: any) {
    return (
        <div className={cn(
            "glass-premium rounded-[24px] p-6 flex flex-col gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300",
            glowClass
        )}>
            {/* Visual Flare */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--accent)] to-transparent opacity-[0.03] rounded-bl-full pointer-events-none group-hover:opacity-[0.08] transition-opacity" />

            {/* Icon + label row */}
            <div className="flex items-center gap-3">
                <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center text-[20px] shrink-0 shadow-sm transition-transform group-hover:scale-110",
                    iconClass || "bg-[var(--bg2)] text-[var(--accent)]"
                )}>
                    {icon}
                </div>
                <div>
                    <span className="text-[13px] font-bold text-[var(--text2)] tracking-tight block">{label}</span>
                    <span className="text-[11px] text-[var(--text3)] font-medium">{sub}</span>
                </div>
            </div>

            {/* Value + badge row */}
            <div className="flex items-end justify-between mt-auto">
                <div className={cn(
                    "font-extrabold tracking-[-1.5px] text-[var(--text)] leading-none animate-[countUp_0.6s_0.1s_both]",
                    isMoney ? "text-[24px]" : "text-[34px]"
                )}>
                    {isMoney ? `₹${value}` : value}
                </div>

                {badge && (
                    <span className={cn(
                        "inline-flex items-center gap-[4px] text-[11px] font-bold px-[10px] py-[4px] rounded-full shadow-sm",
                        badgeType === 'up' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                            badgeType === 'down' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                                "bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]"
                    )}>
                        {badgeType === 'up' && "↑"}{badgeType === 'down' && "↓"}{badge}
                    </span>
                )}
            </div>
        </div>
    )
}

export function LegendItem({ color, label, pct }: any) {
    return (
        <div className="flex items-center gap-[7px] text-[12px] text-[var(--text2)]">
            <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />
            {label}
            <span className="ml-auto font-mono text-[11px] text-[var(--text3)]">{pct}</span>
        </div>
    )
}

export function DeptRow({ name, count, pct, color, delay }: any) {
    return (
        <div className="flex items-center gap-[12px] animate-[fadeSlide_0.4s_both]" style={{ animationDelay: delay }}>
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: color }}>
                {count}
            </div>
            <span className="text-[13px] font-medium flex-1 text-[var(--text2)]">{name}</span>
            <div className="flex-[2] h-[5px] bg-[var(--bg3)] rounded-[3px] overflow-hidden">
                <div className="h-full rounded-[3px] animate-[growBar_0.8s_0.3s_both] origin-left scale-x-0"
                    style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-[11.5px] text-[var(--text3)] font-mono w-[30px] text-right">{pct}%</span>
        </div>
    )
}

export function HireRow({ initials, name, role, date, color }: any) {
    return (
        <div className="flex items-center gap-[12px] py-[10px] border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg2)] px-2 rounded-lg transition-colors cursor-default">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shrink-0", color)}>
                {initials}
            </div>
            <div className="flex flex-col">
                <div className="text-[13.5px] font-semibold text-[var(--text)]">{name}</div>
                <div className="text-[12px] text-[var(--text3)] mt-[1px]">{role}</div>
            </div>
            <div className="ml-auto text-[11.5px] text-[var(--text4)] font-mono whitespace-nowrap">
                {date}
            </div>
        </div>
    )
}
