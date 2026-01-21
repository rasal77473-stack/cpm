"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Calendar } from "lucide-react"

interface HistoryEntry {
  id: number
  student_id: number
  student_name: string
  staff_id: number
  staff_name: string
  action: string
  notes: string
  timestamp: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState("")
  const [filterAction, setFilterAction] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.push("/login")
      return
    }

    setStaffName(name || "Staff")
    fetchHistory()
  }, [router])

  const fetchHistory = async () => {
    try {
      const response = await fetch("/api/phone-history")
      const data = await response.json()
      setHistory(data)
      setFilteredHistory(data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch history:", error)
      setLoading(false)
    }
  }

  const formatDate = (timestamp: string) => {
    if (!mounted) return ""
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  const applyFilters = (query: string, action: string | null) => {
    let filtered = history

    if (action) {
      filtered = filtered.filter((entry) => entry.action === action)
    }

    if (query.trim()) {
      filtered = filtered.filter(
        (entry) =>
          entry.student_name.toLowerCase().includes(query.toLowerCase()) ||
          entry.staff_name.toLowerCase().includes(query.toLowerCase()),
      )
    }

    setFilteredHistory(filtered)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    applyFilters(query, filterAction)
  }

  const handleActionFilter = (action: string | null) => {
    setFilterAction(action)
    applyFilters(searchQuery, action)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Phone Management History</h1>
            <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
          </div>
          <div className="flex gap-3" suppressHydrationWarning>
            <Button onClick={() => router.push("/dashboard")} variant="outline" className="font-medium">
              Dashboard
            </Button>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2" suppressHydrationWarning>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or staff name..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  suppressHydrationWarning
                />
              </div>
              <Button onClick={() => handleSearchChange("")} variant="outline">
                Clear
              </Button>
            </div>

            <div className="flex flex-wrap gap-2" suppressHydrationWarning>
              <Button
                variant={filterAction === null ? "default" : "outline"}
                onClick={() => handleActionFilter(null)}
                className="font-medium"
              >
                All Actions
              </Button>
              <Button
                variant={filterAction === "IN" ? "default" : "outline"}
                onClick={() => handleActionFilter("IN")}
                className={filterAction === "IN"
                  ? "bg-green-600 hover:bg-green-700 text-white font-medium"
                  : "hover:bg-green-50 hover:text-green-700 hover:border-green-300 font-medium"}
              >
                Mark IN
              </Button>
              <Button
                variant={filterAction === "OUT" ? "default" : "outline"}
                onClick={() => handleActionFilter("OUT")}
                className={filterAction === "OUT"
                  ? "bg-orange-600 hover:bg-orange-700 text-white font-medium"
                  : "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 font-medium"}
              >
                Mark OUT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All phone deposit and withdrawal transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No history found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-3 px-2 font-medium w-[25%]">Student Name</th>
                      <th className="pb-3 px-2 font-medium w-[12%]">Action</th>
                      <th className="pb-3 px-2 font-medium w-[18%]">Staff</th>
                      <th className="pb-3 px-2 font-medium w-[20%]">Notes</th>
                      <th className="pb-3 px-2 font-medium w-[25%]">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-medium">{entry.student_name}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${entry.action === "IN"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                              }`}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{entry.staff_name}</td>
                        <td className="py-3 px-2 text-muted-foreground max-w-[200px] truncate" title={entry.notes || "-"}>
                          {entry.notes || "-"}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="whitespace-nowrap" suppressHydrationWarning>
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
