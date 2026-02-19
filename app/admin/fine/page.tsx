"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, LogOut, Plus, Settings, Search, Filter } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

interface StudentFine {
  id: number
  studentId: number
  studentName: string
  studentClass: string | null
  admissionNumber: string
  fineName: string | null
  amount: number
  reason: string | null
  isPaid: string
  issuedBy: number
  issuedByName: string
  paidDate: string | null
  issuedAt: string
}

export default function FineManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [fines, setFines] = useState<StudentFine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    fetchFines()
  }, [router, search, classFilter, statusFilter])

  const fetchFines = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (classFilter !== "all") params.append("class", classFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const res = await fetch(`/api/fines/student-fines?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch fines")

      const data = await res.json()
      setFines(data)

      // Extract unique classes
      const uniqueClasses = [...new Set(data.map((f: StudentFine) => f.studentClass).filter(Boolean))]
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch fines:", error)
      toast.error("Failed to load fines")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (fineId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/fines/student-fines/${fineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update fine")

      toast.success(`Fine marked as ${newStatus === "YES" ? "PAID" : "PENDING"}`)
      fetchFines()
    } catch (error) {
      console.error("Failed to update fine:", error)
      toast.error("Failed to update fine status")
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

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
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Fine Management</h1>
                <p className="text-sm text-gray-600">Logged in as: {staffName}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/fine/manage">
                <Button variant="outline" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Manage Fines
                </Button>
              </Link>
              <Link href="/admin/fine/add">
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  Add Fine
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Name or admission #"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Class Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              >
                <option value="all">All Fines</option>
                <option value="pending">Pending Only</option>
                <option value="paid">Paid Only</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("")
                  setClassFilter("all")
                  setStatusFilter("all")
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Fines List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading fines...</span>
            </div>
          </div>
        ) : fines.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-500">No fines found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Showing {fines.length} fine{fines.length !== 1 ? "s" : ""} • Pending listed first
            </p>
            {fines.map((fine) => (
              <Card key={fine.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    {/* Student Info */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">STUDENT</p>
                      <p className="font-semibold text-gray-900">{fine.studentName}</p>
                      <p className="text-sm text-gray-600">{fine.admissionNumber}</p>
                    </div>

                    {/* Class */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">CLASS</p>
                      <p className="font-semibold text-gray-900">{fine.studentClass || "—"}</p>
                    </div>

                    {/* Fine Details */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">FINE TYPE</p>
                      <p className="font-semibold text-gray-900">{fine.fineName || "Custom Fine"}</p>
                      {fine.reason && <p className="text-xs text-gray-600">{fine.reason}</p>}
                    </div>

                    {/* Amount */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">AMOUNT</p>
                      <p className="font-semibold text-lg text-gray-900">₹{fine.amount.toFixed(2)}</p>
                    </div>

                    {/* Status & Date */}
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">STATUS</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            fine.isPaid === "YES"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {fine.isPaid === "YES" ? "PAID" : "PENDING"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(fine.issuedAt)}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="flex gap-2">
                      {fine.isPaid === "NO" ? (
                        <Button
                          onClick={() => handleStatusChange(fine.id, "YES")}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          Pay
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStatusChange(fine.id, "NO")}
                          variant="outline"
                          className="w-full"
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
