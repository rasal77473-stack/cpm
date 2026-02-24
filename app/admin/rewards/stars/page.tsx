"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, LogOut, Plus, Search, Star, X } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

interface StudentStar {
  id: number
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  stars: number
  awardedBy: number
  awardedByName: string
  reason: string | null
  awardedAt: string
}

interface Student {
  id: number
  name: string
  admission_number: string
  class_name: string | null
}

interface StarLog {
  id: number
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  action: "award" | "remove"
  stars: number
  awardedBy: number
  awardedByName: string
  timestamp: string
  reason: string | null
  currentStars: number
}

export default function StarsManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stars, setStars] = useState<StudentStar[]>([])
  const [logs, setLogs] = useState<StarLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"stars" | "logs">("stars")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [starsRes, studentsRes, logsRes] = await Promise.all([
        fetch("/api/students/with-stars"),
        fetch("/api/students"),
        fetch("/api/students/star-logs"),
      ])

      if (!starsRes.ok) throw new Error("Failed to fetch stars")
      if (!studentsRes.ok) throw new Error("Failed to fetch students")
      if (!logsRes.ok) throw new Error("Failed to fetch logs")

      const starsData: StudentStar[] = await starsRes.json()
      const studentsData: Student[] = await studentsRes.json()
      const logsData = await logsRes.json()

      console.log("[Stars Page] Raw starsData:", {
        length: starsData.length,
        sample: starsData.slice(0, 5),
        withStars: starsData.filter(s => s.stars > 0),
      })
      console.log("[Stars Page] Raw studentsData:", {
        length: studentsData.length,
        sample: studentsData.slice(0, 3),
        classes: [...new Set(studentsData.map((s: Student) => s.class_name).filter(Boolean))],
      })

      const filteredStars = starsData.filter(s => s.stars > 0)
      console.log("[Stars Page] Filtered stars (>0):", filteredStars.length, filteredStars)

      setStars(filteredStars)
      setLogs(logsData.logs || [])

      // Get all unique classes from students (includes classes with no stars/logs)
      const uniqueClasses = [...new Set(studentsData.map((s: Student) => s.class_name).filter(Boolean))]
      console.log("[Stars Page] Unique classes:", uniqueClasses)
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch data:", error)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }



  const handleRemoveStar = async (studentId: number, studentName: string) => {
    try {
      const token = localStorage.getItem("token")
      const staffId = localStorage.getItem("staffId")

      const res = await fetch(`/api/students/${studentId}/stars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "remove",
          stars: 1,
          awardedBy: parseInt(staffId || "0"),
          awardedByName: staffName,
          reason: "Star removed",
        }),
      })

      if (res.ok) {
        toast.success(`⭐ Star removed from ${studentName}`)
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to remove star")
      }
    } catch (error) {
      console.error("Error removing star:", error)
      toast.error("Failed to remove star")
    }
  }

  const starStats = stars.reduce((acc, s) => acc + s.stars, 0)

  const filteredStars = stars.filter((star) => {
    const matchesSearch =
      star.studentName.toLowerCase().includes(search.toLowerCase()) ||
      star.admissionNumber.toLowerCase().includes(search.toLowerCase())

    const matchesClass = classFilter === "all" || star.studentClass === classFilter

    return matchesSearch && matchesClass
  })

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(search.toLowerCase()) ||
      log.admissionNumber.toLowerCase().includes(search.toLowerCase())

    const matchesClass = classFilter === "all" || log.studentClass === classFilter

    // Date filtering for logs
    let matchesDate = true
    if (fromDate || toDate) {
      const logDate = new Date(log.timestamp)
      if (fromDate) {
        const from = new Date(fromDate)
        from.setHours(0, 0, 0, 0)
        if (logDate < from) matchesDate = false
      }
      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        if (logDate > to) matchesDate = false
      }
    }

    return matchesSearch && matchesClass && matchesDate
  })



  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-full px-4 md:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/admin/rewards")}
                className="rounded-full flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Stars Management</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 w-auto text-sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-8">
        {/* Statistics Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-gray-600 text-sm">Total Stars Awarded</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">{starStats}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Students with Stars</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stars.length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-600 text-sm">Recent Activities</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Mode Toggle & Add Button */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Button
            variant={viewMode === "stars" ? "default" : "outline"}
            onClick={() => setViewMode("stars")}
          >
            <Star className="w-4 h-4 mr-2" />
            Stars
          </Button>
          <Button
            variant={viewMode === "logs" ? "default" : "outline"}
            onClick={() => setViewMode("logs")}
          >
            Logs
          </Button>
          <div className="flex-1"></div>
          {viewMode === "stars" && (
            <Button
              onClick={() => router.push("/admin/rewards/stars/award")}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Star
            </Button>
          )}
        </div>

        {/* Search & Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or admission..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
            
            {viewMode === "logs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        {viewMode === "stars" ? (
          // Stars View
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500">Loading stars...</p>
                </div>
              ) : filteredStars.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {stars.length === 0 ? "No stars awarded yet" : "No matching records found"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">Student</th>
                        <th className="text-left py-3 px-4 font-semibold">Admission#</th>
                        <th className="text-left py-3 px-4 font-semibold">Class</th>
                        <th className="text-center py-3 px-4 font-semibold">Stars</th>
                        <th className="text-left py-3 px-4 font-semibold">Awarded By</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Reason</th>
                        <th className="text-center py-3 px-4 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStars.map((star) => (
                        <tr key={star.studentId} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{star.studentName}</td>
                          <td className="py-3 px-4">{star.admissionNumber}</td>
                          <td className="py-3 px-4">{star.studentClass || "-"}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                              <Star className="w-4 h-4 fill-amber-500" />
                              {star.stars}
                            </span>
                          </td>
                          <td className="py-3 px-4">{star.awardedByName}</td>
                          <td className="py-3 px-4 text-sm">{new Date(star.awardedAt).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{star.reason || "-"}</td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRemoveStar(star.studentId, star.studentName)}
                              className="text-xs text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          // Logs View
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500">Loading logs...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{log.studentName}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              log.action === "award"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {log.action === "award" ? "⭐ Awarded" : "Removed"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {log.admissionNumber} • {log.studentClass || "N/A"}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            By: <span className="font-medium">{log.awardedByName}</span> on {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                          {log.reason && (
                            <p className="text-sm text-gray-600 mt-1">
                              Reason: <span className="italic">{log.reason}</span>
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-600">
                            {log.action === "award" ? "+" : "-"}{log.stars}
                            <Star className="w-5 h-5 inline ml-1 fill-amber-500" />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Total: {log.currentStars} ⭐
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>


    </div>
  )
}
