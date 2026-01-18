"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Users, Phone, Settings, BarChart3, ChevronRight, Eye } from "lucide-react"

export default function AdminPanel() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [permissions, setPermissions] = useState<string[]>([])
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    setIsAuthorized(true)
    setPermissions(perms)
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome, {staffName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
              <ChevronRight className="w-4 h-4 rotate-180" />
              Detailed View
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* See Phone Pass / Check Phone Status */}
          <Card className="group hover:shadow-lg transition-all hover:border-blue-500 cursor-pointer" onClick={() => router.push("/dashboard")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="w-5 h-5 text-blue-600" />
                See Phone Pass
              </CardTitle>
              <CardDescription>View student phone check-in/out status</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <div>View Phone Status</div>
              </Button>
            </CardContent>
          </Card>

          {/* Students Management */}
          {(permissions.includes("manage_students") || permissions.length === 0) && (
            <Card className="group hover:shadow-lg transition-all hover:border-green-500 cursor-pointer" onClick={() => router.push("/admin/manage-students")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-green-600" />
                  Students Management
                </CardTitle>
                <CardDescription>Manage and view student records</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" asChild>
                  <div>Manage Students</div>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card className="group hover:shadow-lg transition-all hover:border-purple-500 cursor-pointer" onClick={() => router.push("/history")}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Phone History
              </CardTitle>
              <CardDescription>View phone transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <div>View History</div>
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          {permissions.includes("manage_system") && (
            <Card className="group hover:shadow-lg transition-all hover:border-orange-500 cursor-pointer" onClick={() => router.push("/admin/settings")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="w-5 h-5 text-orange-600" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure system preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" asChild>
                  <div>System Settings</div>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* User Management */}
          {permissions.includes("manage_users") && (
            <Card className="group hover:shadow-lg transition-all hover:border-red-500 cursor-pointer" onClick={() => router.push("/admin/users")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-red-600" />
                  User Management
                </CardTitle>
                <CardDescription>Manage mentors and assign permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" asChild>
                  <div>Manage Users</div>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phone Pass / Grant Pass */}
          {(permissions.includes("manage_special_pass") || permissions.length === 0) && (
            <Card className="group hover:shadow-lg transition-all hover:border-yellow-500 cursor-pointer" onClick={() => router.push("/special-pass")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="w-5 h-5 text-yellow-600" />
                  Phone Pass
                </CardTitle>
                <CardDescription>Grant phone access to students</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white" asChild>
                  <div>Grant Phone Pass</div>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
