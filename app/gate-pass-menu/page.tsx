"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Users,
  Settings,
  GraduationCap,
  Ticket,
  History,
  ArrowRightCircle,
  ChevronLeft,
  DoorOpen
} from "lucide-react"

export default function GatePassMenu() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<string[]>([])
  const [role, setRole] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    setIsAuthorized(true)
    setPermissions(perms)
    setRole(role || "")
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

  const menuItems = [
    {
      icon: GraduationCap,
      label: "Students",
      color: "text-green-600",
      href: "/admin/manage-students",
      visible: role === "admin" || permissions.includes("manage_students") || permissions.length === 0,
    },
    {
      icon: DoorOpen,
      label: "Gate Pass",
      color: "text-green-600",
      href: "/special-pass",
      visible: role === "admin" || permissions.includes("issue_gate_pass") || permissions.length === 0,
    },
    {
      icon: History,
      label: "History",
      color: "text-green-600",
      href: "/history",
      visible: role === "admin" || permissions.includes("view_phone_history"),
    },
    {
      icon: ArrowRightCircle,
      label: "Monthly Leave",
      color: "text-green-600",
      href: "/admin/monthly-leave",
      visible: role === "admin" || permissions.includes("manage_monthly_leave"),
    },
    {
      icon: Users,
      label: "Users",
      color: "text-green-600",
      href: "/admin/users",
      visible: role === "admin" || permissions.includes("manage_users"),
    },
    {
      icon: Settings,
      label: "Settings",
      color: "text-green-600",
      href: "/admin/settings",
      visible: role === "admin",
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2 text-green-600">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-green-900">Menu</h1>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-6 pb-20">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            if (!item.visible) return null
            const Icon = item.icon
            return (
              <Link key={item.label} href={item.href} className="block">
                <div className="bg-white rounded-3xl p-4 aspect-square flex flex-col items-center justify-center gap-3 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.1)] active:scale-95 transition-transform cursor-pointer border border-green-100 hover:border-green-300 h-full w-full">
                  <Icon className={`w-8 h-8 ${item.color}`} strokeWidth={1.5} />
                  <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
