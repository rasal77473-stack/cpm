"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, Search, Star, LogOut, TrendingUp } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"
import { BackToDashboard } from "@/components/back-to-dashboard"

interface StarLog {
  id: number
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  action: "award" | "remove"
  awardedBy: number
  awardedByName: string
  timestamp: string
  reason: string | null
  currentStars: number
}

interface StarSummary {
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  totalStars: number
  totalAwarded: number
  totalRemoved: number
  lastUpdated: string
}

export default function StarLogsPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [logs, setLogs] = useState<StarLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<StarLog[]>([])
  const [summary, setSummary] = useState<StarSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [classes, setClasses] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"summary" | "detailed">("summary")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    fetchLogs()
  }, [router])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/students/star-logs")
      if (!res.ok) throw new Error("Failed to fetch logs")
      const data = await res.json()
      
      setLogs(data.logs || [])
      setSummary(data.summary || [])

      // Extract unique classes
      const uniqueClasses = [...new Set([...data.logs, ...data.summary]
        .map((item: any) => item.studentClass)
        .filter(Boolean))]
      setClasses(uniqueClasses as string[])
      
      applyFilters(data.logs || [], search, classFilter, dateFrom, dateTo)
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      toast.error("Failed to load star logs")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (
    dataToFilter: StarLog[],
    searchQuery: string,
    classVal: string,
    dateFromVal: string,
    dateToVal: string
  ) => {
    let filtered = dataToFilter.filter((log) => {
      const matchesSearch = 
        log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesClass = classVal === "all" || log.studentClass === classVal
      
      const logDate = new Date(log.timestamp).toISOString().split('T')[0]
      const matchesDateFrom = !dateFromVal || logDate >= dateFromVal
      const matchesDateTo = !dateToVal || logDate <= dateToVal
      
      return matchesSearch && matchesClass && matchesDateFrom && matchesDateTo
    })

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setFilteredLogs(filtered)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    applyFilters(logs, value, classFilter, dateFrom, dateTo)
  }

  const handleClassFilter = (value: string) => {
    setClassFilter(value)
    applyFilters(logs, search, value, dateFrom, dateTo)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    applyFilters(logs, search, classFilter, value, dateTo)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    applyFilters(logs, search, classFilter, dateFrom, value)
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
    </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-full px-4 md:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <BackToDashboard />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Star Logs</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 w-auto text-sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 py-6 md:py-8 max-w-6xl mx-auto">
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={viewMode === "summary" ? "default" : "outline"}
            onClick={() => setViewMode("summary")}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Summary
          </Button>
          <Button
            variant={viewMode === "detailed" ? "default" : "outline"}
            onClick={() => setViewMode("detailed")}
          >
            Detailed Logs
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by name or admission..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <select 
                value={classFilter}
                onChange={(e) => handleClassFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg h-11"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary View */}
        {viewMode === "summary" && (
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-500">Loading summary...</p>
                </div>
              ) : summary.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No star data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Student</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Admission#</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Class</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Total Stars</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Awarded</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Removed</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.map((item) => (
                        <tr key={item.studentId} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{item.studentName}</td>
                          <td className="py-3 px-4 text-gray-700">{item.admissionNumber}</td>
                          <td className="py-3 px-4 text-gray-700">{item.studentClass || "-"}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold">
                              <Star className="w-4 h-4 fill-amber-500" />
                              {item.totalStars}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-green-600 font-medium">+{item.totalAwarded}</td>
                          <td className="py-3 px-4 text-center text-red-600 font-medium">-{item.totalRemoved}</td>
                          <td className="py-3 px-4 text-gray-700 text-sm">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Detailed Logs View */}
        {viewMode === "detailed" && (
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
                            {log.currentStars}
                            <Star className="w-5 h-5 inline ml-1 fill-amber-500" />
                          </div>
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
