"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, Users, Phone, Settings, BarChart3 } from "lucide-react"

interface AdminStats {
  totalStudents: number
  totalPhoneCheckins: number
  activeLogins: number
}

export default function AdminPanel() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    totalPhoneCheckins: 0,
    activeLogins: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token || role !== "admin") {
      router.push("/login")
      return
    }

    setStaffName(name || "Admin")
    fetchAdminStats()
  }, [router])

  const fetchAdminStats = async () => {
    try {
      const [studentsRes, statusRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/phone-status"),
      ])

      const studentsData = await studentsRes.json()
      const statusData = await statusRes.json()

      const totalPhoneCheckins = Object.values(statusData).length

      setStats({
        totalStudents: studentsData.length,
        totalPhoneCheckins: totalPhoneCheckins,
        activeLogins: 1,
      })
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch stats:", error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Registered in system</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone Check-ins</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.totalPhoneCheckins}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total status updates</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground mt-1">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Manage Students
              </CardTitle>
              <CardDescription>View, add, or update student records</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push("/dashboard")} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Phone History
              </CardTitle>
              <CardDescription>View phone check-in and check-out history</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push("/history")} 
                className="w-full"
              >
                View History
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system preferences and security</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Reports
              </CardTitle>
              <CardDescription>Generate and view system reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Welcome Message */}
        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">Welcome to Admin Panel</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200">
            <p>
              You have full access to the Hostel Phone Management System. Use the options above to manage 
              students, view phone history, and configure system settings. All actions are logged for security purposes.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
