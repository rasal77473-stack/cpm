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
  LogOut
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
          {/* Phone Pass Button - Links to Menu Page */}
          <Link href="/phone-pass-menu">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-2xl flex items-center justify-center px-6 active:scale-95 transition-transform gap-3">
              <Ticket className="w-6 h-6" />
              <span>Phone Pass</span>
            </Button>
          </Link>
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
