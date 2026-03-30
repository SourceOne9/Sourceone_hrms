"use client"

import Link from "next/link"

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 max-w-md px-6">
                <div className="text-8xl font-bold text-accent/20">404</div>
                <h1 className="text-3xl font-bold text-foreground">
                    Page Not Found
                </h1>
                <p className="text-muted-foreground text-lg">
                    The page you are looking for does not exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center pt-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    )
}
