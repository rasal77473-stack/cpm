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
  LogOut,
  DoorOpen,
  GraduationCap,
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
    const storedRole = localStorage.getItem("role")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      console.log("⚠️ No local token found, forcing logout to clear invalid session state")
      handleLogout()
      return
    }

    setIsAuthorized(true)
    setPermissions(perms)
    setRole(storedRole || "")
    setStaffName(name || "Staff")
  }, [router])

  if (!isAuthorized) {
    return null
  }

  const isAdmin = role === "admin"
  const has = (...perms: string[]) => perms.some((p) => permissions.includes(p))

  // Each item is only shown when the user has at least one relevant permission
  const menuItems = [
    {
      href: "/phone-pass-menu",
      label: "Phone Pass",
      Icon: Ticket,
      bg: "bg-emerald-50",
      hoverBg: "group-hover:bg-emerald-100",
      iconColor: "text-emerald-600",
      borderHover: "hover:border-emerald-100",
      shadowHover: "hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.1)]",
      visible:
        isAdmin ||
        has(
          "issue_phone_pass",
          "access_phone_pass",
          "manage_phone_status",
          "view_phone_logs",
          "view_phone_history"
        ),
    },
    {
      href: "/gate-pass-menu",
      label: "Gate Pass",
      Icon: DoorOpen,
      bg: "bg-blue-50",
      hoverBg: "group-hover:bg-blue-100",
      iconColor: "text-blue-600",
      borderHover: "hover:border-blue-100",
      shadowHover: "hover:shadow-[0_8px_30px_-4px_rgba(59,130,246,0.1)]",
      visible: false, // Temporarily hidden as requested
      /*
        isAdmin ||
        has(
          "issue_gate_pass",
          "access_gate_pass",
          "manage_gate_status",
          "view_gate_logs"
        ),
      */
    },
    {
      href: "/student-lookup",
      label: "Student",
      Icon: GraduationCap,
      bg: "bg-teal-50",
      hoverBg: "group-hover:bg-teal-100",
      iconColor: "text-teal-600",
      borderHover: "hover:border-teal-100",
      shadowHover: "hover:shadow-[0_8px_30px_-4px_rgba(20,184,166,0.1)]",
      visible: isAdmin || has("manage_students"),
    },
    {
      href: "/admin/punishments",
      label: "Punishments",
      Icon: AlertCircle,
      bg: "bg-red-50",
      hoverBg: "group-hover:bg-red-100",
      iconColor: "text-red-600",
      borderHover: "hover:border-red-100",
      shadowHover: "hover:shadow-[0_8px_30px_-4px_rgba(239,68,68,0.1)]",
      visible: isAdmin || has("manage_punishments", "manage_tallies", "view_tally_reports"),
    },
    {
      href: "/admin/rewards",
      label: "Rewards",
      Icon: Star,
      bg: "bg-amber-50",
      hoverBg: "group-hover:bg-amber-100",
      iconColor: "text-amber-500",
      borderHover: "hover:border-amber-100",
      shadowHover: "hover:shadow-[0_8px_30px_-4px_rgba(245,158,11,0.1)]",
      visible: isAdmin || has("manage_rewards", "manage_stars"),
    },
  ].filter((item) => item.visible)

  return (
    <div className="min-h-screen relative bg-[#fafafa] overflow-x-hidden font-sans pb-24 flex flex-col items-center justify-center">
      {/* Subtle background element */}
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
        {menuItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {menuItems.map(({ href, label, Icon, bg, hoverBg, iconColor, borderHover, shadowHover }) => (
              <Link key={label} href={href} className="block group">
                <div
                  className={`bg-white rounded-3xl p-6 aspect-square flex flex-col items-center justify-center gap-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 ${borderHover} ${shadowHover} active:scale-95 transition-all duration-300 h-full w-full`}
                >
                  <div className={`w-14 h-14 rounded-full ${bg} flex items-center justify-center ${hoverBg} transition-colors duration-300`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 text-center">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base font-medium">No menu items available.</p>
            <p className="text-sm mt-1">Contact your administrator to grant you access.</p>
          </div>
        )}
      </main>
    </div>
  )
}
