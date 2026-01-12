"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LogOut, Users, Phone, Settings, BarChart3, X, ChevronRight, Star } from "lucide-react"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
  phone_name?: string
  class_name?: string
  roll_no?: string
  special_pass?: string
}

interface PhoneHistory {
  id: number
  student_id: number
  student_name: string
  staff_id: number
  staff_name: string
  action: string
  notes: string
  timestamp: string
}

interface PhoneStatus {
  student_id: number
  status: string
  last_updated: string
}

export default function AdminPanel() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [phoneHistory, setPhoneHistory] = useState<PhoneHistory[]>([])
  const [phoneStatus, setPhoneStatus] = useState<Record<number, PhoneStatus>>({})
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [showPhoneInModal, setShowPhoneInModal] = useState(false)
  const [showPhoneOutModal, setShowPhoneOutModal] = useState(false)
  const [showStudentDetail, setShowStudentDetail] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<PhoneHistory[]>([])

  const [totalStudents, setTotalStudents] = useState(0)
  const [phoneInCount, setPhoneInCount] = useState(0)
  const [phoneOutCount, setPhoneOutCount] = useState(0)

  const [permissions, setPermissions] = useState<string[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    if (role === "admin") {
      setPermissions(["manage_students", "manage_special_pass", "manage_users", "in_out_control"])
    } else {
      setPermissions(perms)
    }
    setStaffName(name || "Staff")
    fetchAllData()
  }, [router])

  const fetchAllData = async () => {
    try {
      const [studentsRes, statusRes, historyRes] = await Promise.all([
        fetch("/api/students"),
        fetch("/api/phone-status"),
        fetch("/api/phone-history"),
      ])

      const studentsData = await studentsRes.json()
      const statusData = await statusRes.json()
      const historyData = await historyRes.json()

      const studentList = Array.isArray(studentsData) ? studentsData : []
      const historyList = Array.isArray(historyData) ? historyData : []
      const statusMap = statusData && typeof statusData === 'object' ? statusData : {}

      setStudents(studentList)
      setPhoneHistory(historyList)
      setPhoneStatus(statusMap)

      setTotalStudents(studentList.length)

      // Count phone in and out
      let inCount = 0
      let outCount = 0
      Object.values(statusData).forEach((status: any) => {
        if (status.status === "IN") inCount++
        if (status.status === "OUT") outCount++
      })
      setPhoneInCount(inCount)
      setPhoneOutCount(outCount)

      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setLoading(false)
    }
  }

  const handleStudentClick = (student: Student) => {
    setSelectedStudent(student)
    const history = phoneHistory.filter((h) => h.student_id === student.id)
    setSelectedStudentHistory(history)
    setShowStudentsModal(false)
    setShowStudentDetail(true)
  }

  const handlePhoneInClick = () => {
    setShowPhoneInModal(true)
  }

  const handlePhoneOutClick = () => {
    setShowPhoneOutModal(true)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
    router.push("/login")
  }

  const phoneInDetails = Array.isArray(students) 
    ? students.filter((s) => phoneStatus[s.id] && phoneStatus[s.id].status === "IN")
    : []

  const phoneOutDetails = Array.isArray(students)
    ? students.filter((s) => phoneStatus[s.id] && phoneStatus[s.id].status === "OUT")
    : []

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
        {/* Dashboard Stats - Clickable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Students Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-blue-500"
            onClick={() => setShowStudentsModal(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <p className="text-xs text-muted-foreground mt-1">Click to view all students</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Phone In Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-green-500"
            onClick={handlePhoneInClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone In</CardTitle>
              <Phone className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">{phoneInCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Phone Out Card */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-orange-500"
            onClick={handlePhoneOutClick}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Phone Out</CardTitle>
              <Phone className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-2xl font-bold">Loading...</div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">{phoneOutCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Click to view details</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(permissions.includes("manage_students") || permissions.includes("manage_users")) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Manage Students
                </CardTitle>
                <CardDescription>View and manage student records</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push("/admin/manage-students")} 
                  className="w-full"
                >
                  Manage Students
                </Button>
              </CardContent>
            </Card>
          )}

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
              <Button 
                onClick={() => router.push("/admin/settings")} 
                className="w-full"
              >
                Open Settings
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
              <Button 
                onClick={() => router.push("/admin/reports")} 
                className="w-full"
              >
                View Reports
              </Button>
            </CardContent>
          </Card>

          {(permissions.includes("manage_special_pass") || permissions.includes("manage_users")) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Special Passes
                </CardTitle>
                <CardDescription>Grant or revoke special phone permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push("/admin/special-pass")} 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  Give Special Pass
                </Button>
              </CardContent>
            </Card>
          )}

          {permissions.includes("manage_users") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>Manage mentors and roles</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => router.push("/admin/users")} 
                  className="w-full"
                >
                  Manage Users
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Students List Modal */}
      <Dialog open={showStudentsModal} onOpenChange={setShowStudentsModal}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Students</DialogTitle>
            <DialogDescription>Click on a student to view their transaction history</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className="p-4 border rounded-lg cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Adm: {student.admission_number} | Locker: {student.locker_number} | Class: {student.class_name || "-"} | Roll: {student.roll_no || "-"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Detail Modal */}
      <Dialog open={showStudentDetail} onOpenChange={setShowStudentDetail}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.name} - Transaction History</DialogTitle>
            <DialogDescription>
              Admission: {selectedStudent?.admission_number} | Locker: {selectedStudent?.locker_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {selectedStudentHistory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transaction history</p>
            ) : (
              selectedStudentHistory.map((history) => (
                <div key={history.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`font-medium px-2 py-1 rounded text-sm ${
                        history.action === "IN"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                      }`}>
                        {history.action}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{new Date(history.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{new Date(history.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone In Modal */}
      <Dialog open={showPhoneInModal} onOpenChange={setShowPhoneInModal}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Phones Currently IN</DialogTitle>
            <DialogDescription>Students who have their phones checked in</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {phoneInDetails.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No phones checked in</p>
            ) : (
              phoneInDetails.map((student) => (
                <div key={student.id} className="p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">Adm: {student.admission_number} | Locker: {student.locker_number}</p>
                  <p className="text-sm text-muted-foreground">Class: {student.class_name || "-"} | Roll: {student.roll_no || "-"}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Last updated: {new Date(phoneStatus[student.id]?.last_updated).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Phone Out Modal */}
      <Dialog open={showPhoneOutModal} onOpenChange={setShowPhoneOutModal}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Phones Currently OUT</DialogTitle>
            <DialogDescription>Students who have their phones checked out</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {phoneOutDetails.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No phones checked out</p>
            ) : (
              phoneOutDetails.map((student) => (
                <div key={student.id} className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-muted-foreground">Adm: {student.admission_number} | Locker: {student.locker_number}</p>
                  <p className="text-sm text-muted-foreground">Class: {student.class_name || "-"} | Roll: {student.roll_no || "-"}</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    Last updated: {new Date(phoneStatus[student.id]?.last_updated).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
