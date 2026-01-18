"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Phone, LogOut, Clock, CheckCircle2, AlertCircle, Loader2, Plus } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SpecialPassPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [returningPassId, setReturningPassId] = useState<number | null>(null)
  const [showStudentList, setShowStudentList] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")
  const [passStates, setPassStates] = useState<{ [key: number]: "OUT" | "IN" }>({})
  const [activeView, setActiveView] = useState<"phone-pass" | "phone-out" | "phone-in" | "all-students">("phone-pass")
  const [canGrantPass, setCanGrantPass] = useState(false)
  const [canViewLogs, setCanViewLogs] = useState(false)
  const [canManageStatus, setCanManageStatus] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Fetch all students
  const { data: studentsData = [], isLoading: studentLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
  })

  const students = Array.isArray(studentsData) ? studentsData : []

  // Fetch all phone statuses
  const { data: phoneStatusData = [] } = useSWR("/api/phone-status", fetcher, {
    revalidateOnFocus: false,
  })

  const phoneStatusMap = useMemo(() => {
    const map = new Map()
    phoneStatusData.forEach((ps: any) => {
      map.set(ps.studentId, ps.status)
    })
    return map
  }, [phoneStatusData])

  // Fetch all special passes
  const { data: allPasses = [], isLoading: passesLoading } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 30000,
  })

  // Ensure allPasses is always an array
  const passes = Array.isArray(allPasses) ? allPasses : []

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const permissions = localStorage.getItem("permissions")

    if (!token) {
      router.push("/login")
      return
    }

    // Allow access to admins and users with manage_special_pass permission
    const perms = permissions ? JSON.parse(permissions) : []

    // Check if user can grant passes (admin or has issue_phone_pass permission)
    const canGrant = role === "admin" || perms.includes("issue_phone_pass")
    setCanGrantPass(canGrant)

    // Check if user can view pass logs (admin or has view_phone_logs permission)
    const canView = role === "admin" || perms.includes("view_phone_logs") || perms.includes("issue_phone_pass") || perms.includes("access_phone_pass")
    setCanViewLogs(canView)

    // Check if user can manage phone status lists
    const canManage = role === "admin" || perms.includes("manage_phone_status")
    setCanManageStatus(canManage)

    if (role !== "admin" && !perms.includes("issue_phone_pass") && !perms.includes("view_phone_logs") && !perms.includes("access_phone_pass") && !perms.includes("manage_phone_status")) {
      // Regular users can still view if they have permission
      if (!perms.includes("in_out_control")) {
        router.replace("/dashboard")
        return
      }
    }

    // Force view to phone-pass if user doesn't have permission to see other views
    if (!canManage) {
      setActiveView("phone-pass")
    }

    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router, activeView])

  const searchParams = useSearchParams()

  useEffect(() => {
    const view = searchParams.get('view')
    if (view && ["phone-pass", "phone-out", "phone-in", "all-students"].includes(view)) {
      // Only allow switching to restricted views if authorized
      if (canManageStatus || view === "phone-pass") {
        setActiveView(view as any)
      }
    }
  }, [searchParams, canManageStatus])

  // Filter passes based on search and filters
  const filteredPasses = useMemo(() => {
    let filtered = passes

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((p: any) =>
        p.studentName?.toLowerCase().includes(q) ||
        p.admissionNumber?.toLowerCase().includes(q) ||
        p.mentorName?.toLowerCase().includes(q) ||
        p.purpose?.toLowerCase().includes(q)
      )
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter((p: any) => {
        if (!p.issueTime) return false
        const passDate = new Date(p.issueTime).toISOString().split('T')[0]

        if (startDate && endDate) {
          return passDate >= startDate && passDate <= endDate
        } else if (startDate) {
          return passDate >= startDate
        } else if (endDate) {
          return passDate <= endDate
        }
        return true
      })
    }

    return filtered
  }, [passes, searchQuery, startDate, endDate])

  // Get unique classes and lockers for filtering
  const classes = useMemo(() => {
    const uniqueClasses = new Set(students.map((s: any) => s.class_name).filter(Boolean))
    return ["all", ...Array.from(uniqueClasses).sort()]
  }, [students])

  const lockers = useMemo(() => {
    const uniqueLockers = new Set(students.map((s: any) => s.locker_number).filter(Boolean))
    return ["all", ...Array.from(uniqueLockers).sort((a, b) => Number(a) - Number(b))]
  }, [students])

  // Filter and sort students for the grant modal
  const filteredStudents = useMemo(() => {
    let filtered = students.filter((s: any) => {
      const matchesSearch =
        !studentSearchQuery.trim() ||
        s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.admission_number?.toLowerCase().includes(studentSearchQuery.toLowerCase())

      const matchesClass = selectedClass === "all" || s.class_name === selectedClass
      const matchesLocker = selectedLocker === "all" || s.locker_number === selectedLocker

      return matchesSearch && matchesClass && matchesLocker
    })

    // Sort alphabetically by name
    return filtered.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [students, studentSearchQuery, selectedClass, selectedLocker])

  // Filter students by phone status for manage students list
  const filteredStudentsByStatus = useMemo(() => {
    let filtered = students

    // Filter by active view
    if (activeView === "phone-out") {
      filtered = filtered.filter((s: any) => phoneStatusMap.get(s.id) === "OUT")
    } else if (activeView === "phone-in") {
      filtered = filtered.filter((s: any) => {
        const status = phoneStatusMap.get(s.id)
        return status === "IN" || !status // Treat no status as IN
      })
    }
    // For "all-students", no filter needed

    // Sort alphabetically by name
    return filtered.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [students, activeView, phoneStatusMap])

  const handleSubmitOut = async (passId: number) => {
    // Optimistic Update
    setPassStates(prev => ({
      ...prev,
      [passId]: "OUT"
    }))

    // Optimistically update phone status for global list
    mutate("/api/phone-status", (currentStatus: any[] | undefined) => {
      if (!currentStatus) return []
      const pass = passes.find((p: any) => p.id === passId)
      if (!pass) return currentStatus

      const existing = currentStatus.find(s => s.studentId === pass.studentId)
      if (existing) {
        return currentStatus.map(s => s.studentId === pass.studentId ? { ...s, status: "OUT" } : s)
      }
      return [...currentStatus, { studentId: pass.studentId, status: "OUT" }]
    }, false)

    toast.success("Phone marked as OUT")

    try {
      const response = await fetch(`/api/special-pass/out/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to mark pass as OUT")
      }

      // Background validation
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")

    } catch (error) {
      // Revert on failure
      setPassStates(prev => {
        const newStates = { ...prev }
        delete newStates[passId]
        return newStates
      })
      mutate("/api/phone-status")
      toast.error("Failed to update status. Reverting...")
    }
  }

  const handleSubmitIn = async (passId: number) => {
    // Optimistic Update: Immediately mark locally as returned
    // We update the SWR cache directly for instant feedback
    mutate("/api/special-pass/all", (currentPasses: any[] | undefined) => {
      if (!currentPasses) return []
      return currentPasses.map(p =>
        p.id === passId ? { ...p, status: "COMPLETED", submissionTime: new Date().toISOString() } : p
      )
    }, false)

    // Also update phone status cache optimistically
    mutate("/api/phone-status", (currentStatus: any[] | undefined) => {
      if (!currentStatus) return []
      // Find student for this pass
      const pass = passes.find((p: any) => p.id === passId)
      if (!pass) return currentStatus

      // Update or add status
      const existing = currentStatus.find(s => s.studentId === pass.studentId)
      if (existing) {
        return currentStatus.map(s => s.studentId === pass.studentId ? { ...s, status: "IN" } : s)
      }
      return [...currentStatus, { studentId: pass.studentId, status: "IN" }]
    }, false)

    toast.success("Phone pass completed")

    try {
      setReturningPassId(passId)
      const response = await fetch(`/api/special-pass/return/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to complete pass")
      }

      // Revalidate to ensure data consistency
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")

      // Reset local state just in case
      setPassStates(prev => {
        const newStates = { ...prev }
        delete newStates[passId]
        return newStates
      })
    } catch (error) {
      // Revert is complex for SWR, simpler to just revalidate immediately to fetch true server state
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
      toast.error("Failed to complete pass. Reverting...")
    } finally {
      setReturningPassId(null)
    }
  }

  const handleReturnPass = async (passId: number) => {
    // Optimistic Update
    mutate("/api/special-pass/all", (currentPasses: any[] | undefined) => {
      if (!currentPasses) return []
      return currentPasses.map(p =>
        p.id === passId ? { ...p, status: "COMPLETED", submissionTime: new Date().toISOString() } : p
      )
    }, false)

    toast.success("Phone pass returned")

    try {
      setReturningPassId(passId)
      const response = await fetch(`/api/special-pass/return/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to return pass")
      }

      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
    } catch (error) {
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
      toast.error("Failed to return pass")
    } finally {
      setReturningPassId(null)
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (showStudentList) {
                  setShowStudentList(false)
                } else {
                  router.push("/dashboard")
                }
              }}
              className="rounded-full shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {showStudentList ? "Select Student" : "Phone Pass Management"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {!showStudentList && canGrantPass && (
              <Button
                onClick={() => setShowStudentList(true)}
                className="gap-2 bg-green-600 hover:bg-green-700 flex-1 md:flex-none"
              >
                <Phone className="w-4 h-4" />
                Grant Pass
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent flex-1 md:flex-none">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {showStudentList ? (
          // Student Selection Page
          <div className="space-y-6">
            {/* Search Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Search and filter students to grant a phone pass</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or admission..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Filter Options */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">Class</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls === "all" ? "All Classes" : cls}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">Locker</label>
                    <Select value={selectedLocker} onValueChange={setSelectedLocker}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lockers.map((locker) => (
                          <SelectItem key={locker} value={locker}>
                            {locker === "all" ? "All Lockers" : `Locker ${locker}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardHeader>
                <CardTitle>Students ({filteredStudents.length})</CardTitle>
                <CardDescription>Click on a student to grant them a phone pass</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {studentSearchQuery || selectedClass !== "all" || selectedLocker !== "all"
                      ? "No students found matching your filters"
                      : "No students available"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student: any) => (
                      <button
                        key={student.id}
                        onClick={() => {
                          setShowStudentList(false)
                          router.push(`/admin/special-pass/grant/${student.id}`)
                        }}
                        className="text-left p-4 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20 transition-all"
                      >
                        <p className="font-semibold text-foreground">{student.name}</p>
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                          <div>Adm: {student.admission_number}</div>
                          <div>Class: {student.class_name || "-"}</div>
                          <div>Locker: {student.locker_number || "-"}</div>
                          <div>Roll: {student.roll_no || "-"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Phone Pass Records Page
          <>
            {/* Manage Students Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Manage Students by Phone Status</CardTitle>
                <CardDescription>View students filtered by their current phone status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Phone Pass Button - Only show if user has permission */}
                  {canViewLogs && (
                    <Button
                      onClick={() => setActiveView("phone-pass")}
                      variant={activeView === "phone-pass" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-2"
                    >
                      <Phone className="w-6 h-6" />
                      <span>Phone Pass</span>
                      <span className="text-xs opacity-75">
                        {passes.length} records
                      </span>
                    </Button>
                  )}

                  {/* Phone Out Button */}
                  {canManageStatus && (
                    <Button
                      onClick={() => setActiveView("phone-out")}
                      variant={activeView === "phone-out" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-2"
                    >
                      <Phone className="w-6 h-6" />
                      <span>Phone Out</span>
                      <span className="text-xs opacity-75">
                        {students.filter((s: any) => phoneStatusMap.get(s.id) === "OUT").length} students
                      </span>
                    </Button>
                  )}

                  {/* Phone In Button */}
                  {canManageStatus && (
                    <Button
                      onClick={() => setActiveView("phone-in")}
                      variant={activeView === "phone-in" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-2"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Phone In</span>
                      <span className="text-xs opacity-75">
                        {students.filter((s: any) => {
                          const status = phoneStatusMap.get(s.id)
                          return status === "IN" || !status
                        }).length} students
                      </span>
                    </Button>
                  )}

                  {/* All Students Button */}
                  {canManageStatus && (
                    <Button
                      onClick={() => setActiveView("all-students")}
                      variant={activeView === "all-students" ? "default" : "outline"}
                      className="h-auto py-4 flex flex-col gap-2"
                    >
                      <Clock className="w-6 h-6" />
                      <span>All Students</span>
                      <span className="text-xs opacity-75">
                        {students.length} total
                      </span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Section (Moved below Buttons) */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Search Phone Passes</CardTitle>
                <CardDescription>Find and manage phone pass grants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search passes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Student Management List - Only show for student views */}
            {activeView !== "phone-pass" && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    {activeView === "phone-out" && "Students with Phone Out"}
                    {activeView === "phone-in" && "Students with Phone In"}
                    {activeView === "all-students" && "All Students List"}
                  </CardTitle>
                  <CardDescription>Showing in alphabetical order with status and details</CardDescription>
                </CardHeader>
                <CardContent>
                  {studentLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading students...</div>
                  ) : filteredStudentsByStatus.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No students found with this status</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredStudentsByStatus.map((student: any) => {
                        const status = phoneStatusMap.get(student.id) || "IN"
                        return (
                          <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{student.name}</p>
                              <div className="text-xs text-muted-foreground mt-1 grid grid-cols-4 gap-2">
                                <span>Adm: {student.admission_number}</span>
                                <span>Class: {student.class_name || "-"}</span>
                                <span>Locker: {student.locker_number || "-"}</span>
                                <span>Roll: {student.roll_no || "-"}</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${status === "OUT"
                                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                                : status === "IN"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                                }`}>
                                {status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Separator */}
            {activeView === "phone-pass" && canViewLogs && <div className="my-8 border-t" />}

            {/* Phone Pass Records Grid - Only show for phone-pass view and if user has permission */}
            {activeView === "phone-pass" && canViewLogs && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <Clock className="w-6 h-6" />
                      Phone Pass Records ({filteredPasses.length})
                    </h2>
                    <p className="text-muted-foreground">View and manage all phone pass grants</p>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-1 md:w-[150px]">
                      <Input
                        type="date"
                        placeholder="From Date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1 md:w-[150px]">
                      <Input
                        type="date"
                        placeholder="To Date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {passesLoading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading passes...</div>
                ) : filteredPasses.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? "No matching passes found" : "No special passes yet"}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPasses.map((pass: any) => (
                      <Card key={pass.id} className="flex flex-col border-2 border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-900/10 hover:shadow-lg transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-yellow-900 dark:text-yellow-400">{pass.studentName || "Unknown"}</CardTitle>
                              <CardDescription className="text-xs mt-1">Admission: {pass.admissionNumber}</CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                              {pass.status === "ACTIVE" && (
                                <>
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">ACTIVE</span>
                                </>
                              )}
                              {pass.status === "COMPLETED" && (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                                  <span className="text-xs font-bold text-green-600 dark:text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">COMPLETED</span>
                                  {pass.submissionTime && pass.returnTime && new Date(pass.submissionTime) > new Date(pass.returnTime) && (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">LATE</span>
                                  )}
                                </>
                              )}
                              {pass.status === "OUT" && (
                                <>
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                                  <span className="text-xs font-bold text-orange-600 dark:text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">OUT</span>
                                </>
                              )}
                              {pass.status === "EXPIRED" && (
                                <>
                                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
                                  <span className="text-xs font-bold text-red-600 dark:text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">EXPIRED</span>
                                </>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Mentor</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">{pass.mentorName}</p>
                            </div>
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Class</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">{pass.className || "-"}</p>
                            </div>
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Locker</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">{pass.lockerNumber || "-"}</p>
                            </div>
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Roll No</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">{pass.rollNo || "-"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="font-semibold text-muted-foreground">Phone Name</p>
                              <p className="font-medium text-foreground mt-0.5">{pass.phoneNumber || "-"}</p>
                            </div>
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="font-semibold text-muted-foreground">Admission</p>
                              <p className="font-medium text-foreground mt-0.5">{pass.admissionNumber || "-"}</p>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-background/50 p-3 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Purpose</p>
                            <p className="text-sm font-medium text-foreground italic">{pass.purpose}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Issued</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">
                                {pass.issueTime ? new Date(pass.issueTime).toLocaleString() : "-"}
                              </p>
                            </div>
                            <div className="bg-white dark:bg-background/50 p-2 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
                              <p className="text-xs font-semibold text-muted-foreground">Expected Return</p>
                              <p className="font-medium text-foreground mt-0.5 text-xs">
                                {pass.returnTime ? new Date(pass.returnTime).toLocaleString() : "-"}
                              </p>
                            </div>
                          </div>

                          {pass.status === "COMPLETED" && pass.submissionTime && (
                            <div className={`p-3 rounded-lg border ${new Date(pass.submissionTime) > new Date(pass.returnTime || 0)
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30"
                              : "bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/30"
                              }`}>
                              <p className="text-xs font-semibold text-muted-foreground mb-1">
                                {new Date(pass.submissionTime) > new Date(pass.returnTime || 0) ? "Submitted Late" : "Submitted On Time"}
                              </p>
                              <p className={`font-medium text-xs ${new Date(pass.submissionTime) > new Date(pass.returnTime || 0)
                                ? "text-red-700 dark:text-red-400"
                                : "text-green-700 dark:text-green-400"
                                }`}>
                                {new Date(pass.submissionTime).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </CardContent>
                        <div className="px-6 py-3 border-t border-yellow-200/50 dark:border-yellow-800/30 space-y-2">
                          {pass.status === "ACTIVE" || pass.status === "OUT" ? (
                            <>
                              {pass.status === "OUT" || passStates[pass.id] === "OUT" ? (
                                // Show "Submit In" button if status is OUT or local state thinks it's OUT
                                <Button
                                  size="sm"
                                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                                  onClick={() => handleSubmitIn(pass.id)}
                                  disabled={returningPassId === pass.id}
                                >
                                  {returningPassId === pass.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Completing...
                                    </>
                                  ) : (
                                    "Submit In"
                                  )}
                                </Button>
                              ) : (
                                // Show "Submit Out" button initially
                                <Button
                                  size="sm"
                                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                                  onClick={() => handleSubmitOut(pass.id)}
                                  disabled={returningPassId === pass.id}
                                >
                                  Submit Out
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="w-full" disabled>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {pass.status}
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
