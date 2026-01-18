"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Users, Phone, Settings, BarChart3, Eye } from "lucide-react"

export default function DashboardPage() {
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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Caliph Phone Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Navigation Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* See Phone Pass */}
          {(permissions.includes("manage_special_pass") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-green-500/20 bg-green-500/5" onClick={() => router.push("/special-pass")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-green-700 dark:text-green-400">See Phone Pass</CardTitle>
                  <CardDescription className="mt-1">View active phone passes</CardDescription>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  View Passes
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Students Management */}
          {(permissions.includes("manage_students") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-blue-500/20 bg-blue-500/5" onClick={() => router.push("/admin/manage-students")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-blue-700 dark:text-blue-400">Students Management</CardTitle>
                  <CardDescription className="mt-1">Manage student records</CardDescription>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Manage Students
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phone History */}
          {(permissions.includes("in_out_control") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-purple-500/20 bg-purple-500/5" onClick={() => router.push("/history")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-purple-700 dark:text-purple-400">Phone History</CardTitle>
                  <CardDescription className="mt-1">View phone status history</CardDescription>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                  View History
                </Button>
              </CardContent>
            </Card>
          )}

          {/* System Settings */}
          {(permissions.includes("manage_system") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-red-500/20 bg-red-500/5" onClick={() => router.push("/admin/settings")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-red-700 dark:text-red-400">System Settings</CardTitle>
                  <CardDescription className="mt-1">Configure system options</CardDescription>
                </div>
                <Settings className="w-8 h-8 text-red-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Settings
                </Button>
              </CardContent>
            </Card>
          )}

          {/* User Management */}
          {(permissions.includes("manage_users") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-orange-500/20 bg-orange-500/5" onClick={() => router.push("/admin/users")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-orange-700 dark:text-orange-400">User Management</CardTitle>
                  <CardDescription className="mt-1">Manage users and roles</CardDescription>
                </div>
                <Users className="w-8 h-8 text-orange-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Phone Pass */}
          {(permissions.includes("manage_special_pass") || permissions.length === 0) && (
            <Card className="cursor-pointer hover:shadow-lg transition-all border-yellow-500/20 bg-yellow-500/5" onClick={() => router.push("/special-pass")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="text-yellow-700 dark:text-yellow-400">Phone Pass</CardTitle>
                  <CardDescription className="mt-1">Grant phone passes</CardDescription>
                </div>
                <Phone className="w-8 h-8 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">
                  Manage Passes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
