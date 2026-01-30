"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Settings,
  GraduationCap,
  Ticket,
  History,
  ArrowRightCircle,
  LogOut,
  ChevronDown,
  X
} from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")
    const role = localStorage.getItem("role")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    setIsAuthorized(true)
    setPermissions(perms)
    setRole(role || "")
    setStaffName(name || "Staff")
  }, [router])

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Verifying credentials...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
    localStorage.removeItem("permissions")
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6 pb-20">
        {/* Welcome Section */}
        <div className="mb-8 mt-2 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-green-900">Hello,</h1>
            <p className="text-xl text-green-600 font-medium">{staffName}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-green-600 hover:text-green-800">
            <LogOut className="w-6 h-6" />
          </Button>
        </div>

        {/* Grid Menu */}
        <div className="space-y-4">
          {/* Phone Pass Button with Dropdown Menu */}
          <div className="relative">
            <Button
              onClick={() => setShowMenu(!showMenu)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-2xl flex items-center justify-between px-6 active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6" />
                <span>Phone Pass</span>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${showMenu ? "rotate-180" : ""}`} />
            </Button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-10 overflow-hidden">
                <div className="space-y-1 p-2">
                  {/* Students */}
                  {(role === "admin" || permissions.includes("manage_students") || permissions.length === 0) && (
                    <Link href="/admin/manage-students" onClick={() => setShowMenu(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <GraduationCap className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                        <span className="font-medium text-gray-900">Students</span>
                      </div>
                    </Link>
                  )}

                  {/* Phone Pass */}
                  {(role === "admin" || permissions.includes("issue_phone_pass") || permissions.includes("access_phone_pass") || permissions.includes("manage_phone_status") || permissions.length === 0) && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 cursor-pointer">
                      <Ticket className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                      <span className="font-medium text-gray-900">Phone Pass</span>
                    </div>
                  )}

                  {/* History */}
                  {(role === "admin" || permissions.includes("view_phone_history")) && (
                    <Link href="/history" onClick={() => setShowMenu(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <History className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                        <span className="font-medium text-gray-900">History</span>
                      </div>
                    </Link>
                  )}

                  {/* Monthly Leave */}
                  {(role === "admin" || permissions.includes("manage_monthly_leave")) && (
                    <Link href="/admin/monthly-leave" onClick={() => setShowMenu(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <ArrowRightCircle className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                        <span className="font-medium text-gray-900">Monthly Leave</span>
                      </div>
                    </Link>
                  )}

                  {/* Users */}
                  {(role === "admin" || permissions.includes("manage_users")) && (
                    <Link href="/admin/users" onClick={() => setShowMenu(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <Users className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                        <span className="font-medium text-gray-900">Users</span>
                      </div>
                    </Link>
                  )}

                  {/* Settings */}
                  {role === "admin" && (
                    <Link href="/admin/settings" onClick={() => setShowMenu(false)}>
                      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                        <Settings className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
                        <span className="font-medium text-gray-900">Settings</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function MenuCard({ icon: Icon, label, color, href, visible }: { icon: any, label: string, color: string, href: string, visible: boolean }) {
  if (!visible) return null
  return (
    <Link href={href} className="block">
      <div
        className="bg-white rounded-3xl p-4 aspect-square flex flex-col items-center justify-center gap-3 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.1)] active:scale-95 transition-transform cursor-pointer border border-gray-50 h-full w-full"
      >
        <Icon className={`w-8 h-8 ${color}`} strokeWidth={1.5} />
        <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
      </div>
    </Link>
  )
}
