"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, LogOut, Banknote, CheckCircle, Zap, ShieldAlert, ChevronRight } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { BackToDashboard } from "@/components/back-to-dashboard"

export default function PunishmentsPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")
    const storedRole = localStorage.getItem("role")
    const perms: string[] = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      document.cookie="auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;"; window.location.href="/login"
      return
    }

    const isAdmin = storedRole === "admin"
    const hasPerm = ["manage_punishments", "manage_tallies", "view_tally_reports"].some(p => perms.includes(p))

    if (!isAdmin && !hasPerm) {
      router.replace("/dashboard")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
  }, [router])

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen relative bg-[#f8fafc] overflow-x-hidden font-sans pb-24">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-slate-300/30 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-200/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-200/20 blur-[120px]" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/70 border-b border-gray-200/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 w-full sm:w-auto mb-2 sm:mb-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl hover:bg-white/60 bg-white/40 shadow-sm border border-gray-100 transition-transform active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </Button>
              <BackToDashboard />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight truncate">
                  Punishments
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                  {staffName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="rounded-xl bg-white/50 border-gray-200 hover:bg-red-50 hover:text-red-600 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">

        <div className="mb-6 flex items-center gap-3 w-max mx-auto md:w-full md:mx-0">
          <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/60 shadow-inner">
            <ShieldAlert className="w-7 h-7 text-slate-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Select a Category</h2>
            <p className="text-sm text-gray-500 font-medium">Manage and review disciplinary actions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">

          {/* Fines Card */}
          <Link href="/admin/fine">
            <div className="group h-full rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100/50 transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden cursor-pointer">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border border-indigo-200/50 mb-5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <Banknote className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Fines Management</h3>
              </div>
              <div className="mt-8 flex items-center justify-between text-indigo-600 font-semibold text-sm group-hover:text-indigo-700 transition-colors z-10">
                <span>Open Management</span>
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Tally Card */}
          <Link href="/admin/tally">
            <div className="group h-full rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-100/50 transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden cursor-pointer">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-cyan-50 rounded-full blur-2xl group-hover:bg-cyan-100 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-50 flex items-center justify-center border border-cyan-200/50 mb-5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <CheckCircle className="w-7 h-7 text-cyan-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tally Management</h3>
              </div>
              <div className="mt-8 flex items-center justify-between text-cyan-600 font-semibold text-sm group-hover:text-cyan-700 transition-colors z-10">
                <span>Open Management</span>
                <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

          {/* Other Tally Card */}
          <Link href="/admin/other-tally">
            <div className="group h-full rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-100/50 transition-all duration-300 p-6 flex flex-col justify-between relative overflow-hidden cursor-pointer">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-50 rounded-full blur-2xl group-hover:bg-orange-100 transition-colors"></div>
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center border border-orange-200/50 mb-5 shadow-sm group-hover:scale-105 transition-transform duration-300">
                  <Zap className="w-7 h-7 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Other Tally System</h3>
              </div>
              <div className="mt-8 flex items-center justify-between text-orange-600 font-semibold text-sm group-hover:text-orange-700 transition-colors z-10">
                <span>Open Management</span>
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Link>

        </div>
      </main>
    </div>
  )
}
