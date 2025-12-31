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
                      className={`flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 ${
                        isPhoneIn ? "led-in" : "led-out"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-foreground tracking-tight">{student.name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Adm: {student.admission_number}</span>
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Locker: {student.locker_number}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div
                            className={`font-bold px-3 py-1 rounded-full text-xs tracking-wider uppercase shadow-inner ${
                              isPhoneIn
                                ? "bg-green-100/80 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-orange-100/80 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            }`}
                          >
                            {status?.status || "UNKNOWN"}
                          </div>
                          {status?.last_updated && (
                            <div className="text-[10px] font-medium text-muted-foreground mt-1.5 opacity-70 italic">
                              {new Date(status.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleTogglePhoneStatus(student.id, status?.status)}
                          size="lg"
                          className={`rounded-xl px-6 font-semibold shadow-lg transition-all duration-300 hover:shadow-xl active:scale-95 ${
                            isPhoneIn 
                              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
                          }`}
                          disabled={isToggling}
                        >
                          {isToggling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                          <span className="ml-2">{isPhoneIn ? "Submit OUT" : "Submit IN"}</span>
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
