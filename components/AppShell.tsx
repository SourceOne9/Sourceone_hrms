"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { MobileSidebar } from "@/components/MobileSidebar"
import { Topbar } from "@/components/Topbar"
import { AuthProvider } from "@/context/AuthContext"
import { AIChatbot } from "@/components/AIChatbot"
import { TooltipProvider } from "@/components/ui/Tooltip"

// When embedded in HiringNow Platform, the parent app owns the primary sidebar.
// Set NEXT_PUBLIC_EMBEDDED=true to hide local sidebar/topbar and render content only.
const isEmbedded = process.env.NEXT_PUBLIC_EMBEDDED === "true"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/login" || pathname === "/signup"
  const isGatedPage = pathname === "/change-password" || pathname === "/onboarding"
  const hideChrome = isLoginPage || isGatedPage

  if (isEmbedded && !hideChrome) {
    return (
      <AuthProvider>
        <TooltipProvider>
          <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
            <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-3 scrollbar-track-transparent p-3 sm:p-6 lg:p-7">
              <div className="animate-page-in">{children}</div>
            </main>
          </div>
        </TooltipProvider>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        {!hideChrome && (
          <>
            <Sidebar />
            <MobileSidebar />
          </>
        )}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full">
          {!hideChrome && <Topbar />}
          <main className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-bg-3 scrollbar-track-transparent ${!hideChrome ? "p-3 sm:p-6 lg:p-7" : ""}`}>
            {!hideChrome ? (
              <div className="animate-page-in">{children}</div>
            ) : (
              children
            )}
          </main>
        </div>
        {!hideChrome && <AIChatbot />}
      </TooltipProvider>
    </AuthProvider>
  )
}
