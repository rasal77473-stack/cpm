"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Settings,
  GraduationCap,
  Ticket,
  History,
  ArrowRightCircle
} from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

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
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6 pb-20">
        {/* Welcome Section */}
        <div className="mb-8 mt-2">
          <h1 className="text-3xl font-bold text-gray-900">Hello,</h1>
          <p className="text-xl text-gray-400 font-medium">{staffName}</p>
        </div>

        {/* Grid Menu */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

          <MenuCard
            icon={GraduationCap}
            label="Students"
            color="text-blue-500"
            href="/admin/manage-students"
            visible={role === "admin" || permissions.includes("manage_students") || permissions.length === 0}
          />

          <MenuCard
            icon={Ticket}
            label="Gate Pass"
            color="text-orange-500"
            href="/special-pass"
            visible={role === "admin" || permissions.includes("issue_phone_pass") || permissions.includes("access_phone_pass") || permissions.includes("manage_phone_status") || permissions.length === 0}
          />

          <MenuCard
            icon={History}
            label="History"
            color="text-indigo-500"
            href="/history"
            visible={role === "admin" || permissions.includes("view_phone_history")}
          />

          <MenuCard
            icon={ArrowRightCircle}
            label="Monthly Leave"
            color="text-purple-600"
            href="/admin/monthly-leave"
            visible={role === "admin"}
          />

          <MenuCard
            icon={Users}
            label="Users"
            color="text-red-500"
            href="/admin/users"
            visible={role === "admin" || permissions.includes("manage_users")}
          />

          <MenuCard
            icon={Settings}
            label="Settings"
            color="text-gray-600"
            href="/admin/settings"
            visible={role === "admin"}
          />

        </div>
      </main>
    </div>
  )
}

import Link from "next/link"

// ... (Dashboard component remains the same)

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
