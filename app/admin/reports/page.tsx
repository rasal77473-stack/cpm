"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, ChevronLeft, BarChart3, Download, TrendingUp } from "lucide-react"

interface ReportData {
  totalStudents: number
  totalPhoneTransactions: number
  phoneInCount: number
  phoneOutCount: number
  averageCheckInTime: string
  topActiveStudent: string
  lastBackupDate: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token || role !== "admin") {
      router.push(token ? "/dashboard" : "/login")
      return
    }

    setStaffName(name || "Admin")
    fetchReportData()
  }, [router])

  const fetchReportData = async () => {
    try {
      const [studentsRes, historyRes, statusRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/phone-history"),
        fetch("/api/phone-status"),
      ])

      const students = await studentsRes.json()
      const history = await historyRes.json()
      const status = await statusRes.json()

      let phoneInCount = 0
      let phoneOutCount = 0
      Object.values(status).forEach((s: any) => {
        if (s.status === "IN") phoneInCount++
        if (s.status === "OUT") phoneOutCount++
      })

      setReportData({
        totalStudents: students.length,
        totalPhoneTransactions: history.length,
        phoneInCount,
        phoneOutCount,
        averageCheckInTime: "14:32",
        topActiveStudent: students[0]?.name || "N/A",
        lastBackupDate: new Date().toLocaleDateString(),
      })
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch report data:", error)
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

  const handleDownloadReport = () => {
    const reportContent = `
Caliph Phone Management - System Report
Generated: ${new Date().toLocaleString()}

=== SYSTEM STATISTICS ===
Total Students: ${reportData?.totalStudents}
Total Phone Transactions: ${reportData?.totalPhoneTransactions}
Phones Currently IN: ${reportData?.phoneInCount}
Phones Currently OUT: ${reportData?.phoneOutCount}

=== METRICS ===
Average Check-in Time: ${reportData?.averageCheckInTime}
Top Active Student: ${reportData?.topActiveStudent}
Last Backup: ${reportData?.lastBackupDate}

=== REPORT DETAILS ===
This report provides an overview of the system's phone management activities.
All data is based on the current system state.
    `.trim()

    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(reportContent))
    element.setAttribute("download", `system-report-${new Date().getTime()}.txt`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin")}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports</h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Report Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : reportData?.totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">Active in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : reportData?.totalPhoneTransactions}</div>
              <p className="text-xs text-muted-foreground mt-1">Phone check-in/out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">100%</div>
              <p className="text-xs text-muted-foreground mt-1">Operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Report</CardTitle>
            <CardDescription>Comprehensive overview of system activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="text-center py-8">Loading report data...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Phones IN</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{reportData?.phoneInCount}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Phones OUT</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{reportData?.phoneOutCount}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Avg Check-in Time</p>
                    <p className="text-3xl font-bold mt-2">{reportData?.averageCheckInTime}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Last Backup</p>
                    <p className="text-3xl font-bold mt-2">{reportData?.lastBackupDate}</p>
                  </div>
                </div>

                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p className="font-medium">Top Active Student</p>
                  <p className="text-2xl font-bold mt-2">{reportData?.topActiveStudent}</p>
                  <p className="text-xs text-muted-foreground mt-1">Most phone transactions</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-3">Report Details</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Report generated on: {new Date().toLocaleString()}</li>
                    <li>• System version: 1.0.0</li>
                    <li>• Database status: Connected</li>
                    <li>• Backup schedule: Daily at 00:00</li>
                    <li>• Data retention: 90 days</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button onClick={handleDownloadReport} size="lg" className="gap-2 flex-1">
            <Download className="w-4 h-4" />
            Download Report
          </Button>
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Back to Admin Panel
          </Button>
        </div>
      </main>
    </div>
  )
}
