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
  Loader2,
  PhoneOff
} from "lucide-react"
import { BackToDashboard } from "@/components/back-to-dashboard"

export default function PhonePassMenu() {
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
      visible: role === "admin" || permissions.includes("manage_students"),
    },
    {
      icon: Ticket,
      label: "Phone Pass",
      color: "text-green-600",
      href: "/special-pass",
      visible: role === "admin" || permissions.includes("issue_phone_pass") || permissions.includes("access_phone_pass") || permissions.includes("manage_phone_status") || permissions.length === 0,
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
    {
      icon: PhoneOff,
      label: "Non Active",
      color: "text-green-600",
      href: "/special-pass?tab=nill",
      visible: role === "admin" || permissions.includes("issue_phone_pass") || permissions.includes("access_phone_pass"),
    }
  ]

  return (
    <div className="min-h-screen relative bg-[#fafafa] overflow-x-hidden font-sans pb-24 flex flex-col items-center">
      {/* Subtle background element */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-100/30 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-teal-50/40 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="w-full sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 sm:py-4">
        <div onClick={() => router.push("/dashboard")} className="max-w-md mx-auto flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity w-fit">
          <Button variant="ghost" size="icon" asChild className="-ml-2 text-gray-800 rounded-xl pointer-events-none">
            <div><ChevronLeft className="h-6 w-6" /></div>
          </Button>
          <BackToDashboard />
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 pointer-events-none">Phone Pass Menu</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-6 py-8 pb-20">
        <div className="grid grid-cols-2 gap-4">
          {menuItems.map((item) => {
            if (!item.visible) return null
            const Icon = item.icon
            return (
              <Link
                key={item.label}
                href={item.href}
                className="block group"
              >
                <div className="bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-emerald-100 hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.1)] active:scale-95 transition-all duration-300 h-full w-full">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-emerald-600" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
