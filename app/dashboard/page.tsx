"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Ticket,
  AlertCircle,
  UserCheck,
  Star,
  LogOut
} from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"

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
      console.log("⚠️ No local token found, forcing logout to clear invalid session state")
      handleLogout()
      return
    }

    setIsAuthorized(true)
    setPermissions(perms)
    setRole(role || "")
    setStaffName(name || "Staff")
  }, [router])

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen relative bg-[#fafafa] overflow-x-hidden font-sans pb-24 flex flex-col items-center justify-center">
      {/* Subtle background element - Very clean and minimal */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-100/30 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-teal-50/40 blur-[100px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-6 py-8 pb-20">
        {/* Welcome Section */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Hello,</h1>
            <p className="text-lg text-emerald-600 font-semibold tracking-tight">{staffName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full w-10 h-10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Grid Menu */}
        <div className="grid grid-cols-2 gap-4">
          {/* Phone Pass Button */}
          <Link href="/phone-pass-menu" className="block group">
            <div className="bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-emerald-100 hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.1)] active:scale-95 transition-all duration-300 h-full w-full">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-300">
                <Ticket className="w-6 h-6 text-emerald-600" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Phone Pass</span>
            </div>
          </Link>

          {/* Student Button */}
          <Link href="/student-lookup" className="block group">
            <div className="bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-teal-100 hover:shadow-[0_8px_30px_-4px_rgba(20,184,166,0.1)] active:scale-95 transition-all duration-300 h-full w-full">
              <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors duration-300">
                <UserCheck className="w-6 h-6 text-teal-600" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Student</span>
            </div>
          </Link>

          {/* Punishments Button */}
          <Link href="/admin/punishments" className="block group">
            <div className="bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-red-100 hover:shadow-[0_8px_30px_-4px_rgba(239,68,68,0.1)] active:scale-95 transition-all duration-300 h-full w-full">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors duration-300">
                <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Punishments</span>
            </div>
          </Link>

          {/* Rewards Button */}
          <Link href="/admin/rewards" className="block group">
            <div className="bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-amber-100 hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.1)] active:scale-95 transition-all duration-300 h-full w-full">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors duration-300">
                <Star className="w-6 h-6 text-amber-500" strokeWidth={2} />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center">Rewards</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
