"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, LogOut, Settings, Banknote, ListChecks } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"

export default function FineHubPage() {
    const router = useRouter()
    const [staffName, setStaffName] = useState("")
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem("token")
        const role = localStorage.getItem("role")
        const name = localStorage.getItem("staffName")

        if (!token) {
            router.replace("/login")
            return
        }

        setIsAuthorized(true)
        setStaffName(name || "Staff")
    }, [router])

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Checking permissions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/dashboard")}
                            className="rounded-full"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Fine Management</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Logged in as: {staffName}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
                <p className="text-muted-foreground text-sm mb-6">
                    Choose an action below to manage fine types or view student fine records.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Manage Fine Types */}
                    <Link href="/admin/fine/manage" className="block">
                        <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-xl">
                                        <Settings className="w-6 h-6 text-green-700" />
                                    </div>
                                    <CardTitle className="text-lg">Fine Types</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Add, edit, or delete fine types and set their default amounts.
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </Link>

                    {/* Issue Fines (placeholder) */}
                    <Link href="/student-lookup?mode=fine" className="block">
                        <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-xl">
                                        <Banknote className="w-6 h-6 text-orange-700" />
                                    </div>
                                    <CardTitle className="text-lg">Issue Fine</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    Search for a student and issue a fine directly to their record.
                                </CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </main>
        </div>
    )
}
