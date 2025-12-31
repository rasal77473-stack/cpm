"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Phone, Loader2 } from "lucide-react"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
}

interface PhoneStatus {
  student_id: number
  status: string
  last_updated: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [phoneStatus, setPhoneStatus] = useState<Record<number, PhoneStatus>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState("")
  const [togglingStudentId, setTogglingStudentId] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.push("/login")
      return
    }

    setStaffName(name || "Staff")
    fetchStudentsAndStatus()
  }, [router])

  const fetchStudentsAndStatus = async () => {
    try {
      const [studentsRes, statusRes] = await Promise.all([fetch("/api/students"), fetch("/api/phone-status")])

      const studentsData = await studentsRes.json()
      const statusData = await statusRes.json()

      setStudents(studentsData)
      setPhoneStatus(statusData)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setLoading(false)
    }
  }

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
  }, [])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.admission_number.toLowerCase().includes(q) || 
      s.locker_number.toLowerCase().includes(q)
    )
  }, [students, searchQuery])

  const handleTogglePhoneStatus = async (studentId: number, currentStatus: string) => {
    setTogglingStudentId(studentId)
    const newStatus = currentStatus === "IN" ? "OUT" : "IN"

    try {
      const response = await fetch(`/api/phone-status/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          staffId: localStorage.getItem("staffId"),
          notes: "",
        }),
      })

      if (response.ok) {
        const updatedStatus = await response.json()
        setPhoneStatus((prev) => ({
          ...prev,
          [studentId]: updatedStatus.status,
        }))
      }
    } catch (error) {
      console.error("Failed to toggle phone status:", error)
    } finally {
      setTogglingStudentId(null)
    }
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
            <h1 className="text-2xl font-bold text-foreground">Hostel Phone Management</h1>
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
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Students</CardTitle>
            <CardDescription>Find students by name, admission number, or room number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission number, or room..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => handleSearch("")} variant="outline">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
            <CardDescription>Click action button to submit phone status</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No students found</div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => {
                  const status = phoneStatus[student.id]
                  const isPhoneIn = status?.status === "IN"
                  const isToggling = togglingStudentId === student.id

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors ${
                        isPhoneIn ? "led-in" : "led-out"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{student.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div>Admission: {student.admission_number}</div>
                          <div>Locker: {student.locker_number}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div
                            className={`font-medium px-2 py-1 rounded-lg text-sm ${
                              isPhoneIn
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                            }`}
                          >
                            {status?.status || "UNKNOWN"}
                          </div>
                          {status?.last_updated && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(status.last_updated).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleTogglePhoneStatus(student.id, status?.status)}
                          size="sm"
                          className="gap-1"
                          disabled={isToggling}
                          variant={isPhoneIn ? "destructive" : "default"}
                        >
                          {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                          {isPhoneIn ? "Submit OUT" : "Submit IN"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
