"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
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
  const [phoneStatusFilter, setPhoneStatusFilter] = useState<"all" | "OUT" | "IN">("all")
  const [activeView, setActiveView] = useState<"phone-pass" | "phone-out" | "phone-in" | "all-students">("phone-pass")



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
    if (role !== "admin" && !perms.includes("manage_special_pass") && !perms.includes("view_special_pass_logs")) {
      // Regular users can still view if they have permission
      if (!perms.includes("in_out_control")) {
        router.replace("/dashboard")
        return
      }
    }

    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router])

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

    return filtered
  }, [passes, searchQuery])

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
      filtered = filtered.filter((s: any) => phoneStatusMap.get(s.id) === "IN")
    }
    // For "all-students", no filter needed

    // Sort alphabetically by name
    return filtered.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [students, activeView, phoneStatusMap])

  const handleSubmitOut = (passId: number) => {
    // Change button state to "Submit In"
    setPassStates(prev => ({
      ...prev,
      [passId]: "OUT"
    }))
  }

  const handleSubmitIn = async (passId: number) => {
    setReturningPassId(passId)
    
    try {
      const response = await fetch(`/api/special-pass/return/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to complete pass")
      }

      toast.success("✓ Phone pass completed successfully")
      mutate("/api/special-pass/all")
      
      // Reset the state for this pass
      setPassStates(prev => {
        const newStates = { ...prev }
        delete newStates[passId]
        return newStates
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete pass")
    } finally {
      setReturningPassId(null)
    }
  }

  const handleReturnPass = async (passId: number) => {
    setReturningPassId(passId)
    try {
      const response = await fetch(`/api/special-pass/return/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to return pass")
      }

      toast.success("Phone pass returned successfully")
      mutate("/api/special-pass/all")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return pass")
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
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
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {showStudentList ? "Select Student" : "Phone Pass Management"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!showStudentList && (
              <Button 
                onClick={() => setShowStudentList(true)}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Phone className="w-4 h-4" />
                Grant Pass
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
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
                <CardTitle>Select Student to Grant Phone Pass</CardTitle>
                <CardDescription>Search and filter students to grant a phone pass</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student name or admission number..."
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
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Phone Passes</CardTitle>
            <CardDescription>Find and manage phone pass grants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, admission, mentor, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Manage Students Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manage Students by Phone Status</CardTitle>
            <CardDescription>View students filtered by their current phone status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {/* Phone Pass Button */}
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

              {/* Phone Out Button */}
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

              {/* Phone In Button */}
              <Button
                onClick={() => setActiveView("phone-in")}
                variant={phoneStatusFilter === "IN" ? "default" : "outline"}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>Phone In</span>
                <span className="text-xs opacity-75">
                  {students.filter((s: any) => phoneStatusMap.get(s.id) === "IN").length} students
                </span>
              </Button>

              {/* All Students Button */}
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
                  const status = phoneStatusMap.get(student.id) || "Unknown"
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
                        <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                          status === "OUT"
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
        {activeView === "phone-pass" && <div className="my-8 border-t" />}

        {/* Phone Pass Records Grid - Only show for phone-pass view */}
        {activeView === "phone-pass" && (
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Phone Pass Records ({filteredPasses.length})
          </h2>
          <p className="text-muted-foreground mb-6">View and manage all phone pass grants</p>

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
                      <div className={`p-3 rounded-lg border ${
                        new Date(pass.submissionTime) > new Date(pass.returnTime || 0)
                          ? "bg-red-50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/30"
                          : "bg-green-50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/30"
                      }`}>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          {new Date(pass.submissionTime) > new Date(pass.returnTime || 0) ? "Submitted Late" : "Submitted On Time"}
                        </p>
                        <p className={`font-medium text-xs ${
                          new Date(pass.submissionTime) > new Date(pass.returnTime || 0)
                            ? "text-red-700 dark:text-red-400"
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {new Date(pass.submissionTime).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <div className="px-6 py-3 border-t border-yellow-200/50 dark:border-yellow-800/30 space-y-2">
                    {pass.status === "ACTIVE" ? (
                      <>
                        {passStates[pass.id] === "OUT" ? (
                          // Show "Submit In" button after "Submit Out" was clicked
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
