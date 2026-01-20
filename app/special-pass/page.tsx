"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  Search,
  Plus,
  ArrowUpRight,
  Loader2
} from "lucide-react"
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

function SpecialPassContent() {
  const router = useRouter()
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // App States
  const [returningPassId, setReturningPassId] = useState<number | null>(null)
  const [showStudentList, setShowStudentList] = useState(false)
  const [activeTab, setActiveTab] = useState<"phone-pass" | "phone-in" | "phone-out" | "all-students">("phone-pass")

  // Student List Filter States (for Grant Pass view)
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")

  // Optimistic UI States
  const [passStates, setPassStates] = useState<{ [key: number]: "OUT" | "IN" }>({})

  // Permissions
  const [canGrantPass, setCanGrantPass] = useState(false)
  const [canViewLogs, setCanViewLogs] = useState(false)

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------

  // Fetch all students
  const { data: studentsData = [], isLoading: studentLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
  })
  const students = Array.isArray(studentsData) ? studentsData : []

  // Fetch all special passes
  const { data: allPasses = [], isLoading: passesLoading } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 10000,
  })
  const passes = Array.isArray(allPasses) ? allPasses : []

  // Fetch phone statuses
  const { data: phoneStatusData = [] } = useSWR("/api/phone-status", fetcher, {
    revalidateOnFocus: false,
  })

  // --------------------------------------------------------------------------
  // Derived Data & Memos
  // --------------------------------------------------------------------------

  // Phone Status Map
  const phoneStatusMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(phoneStatusData)) {
      phoneStatusData.forEach((s: any) => map.set(s.studentId, s.status))
    }
    return map
  }, [phoneStatusData])

  // Stats for the top cards
  const stats = useMemo(() => {
    const totalPasses = passes.length
    const totalStudents = students.length

    // Calculate current status counts derived from map (Real-time status)
    const outCount = Array.from(phoneStatusMap.values()).filter(status => status === "OUT").length
    const inCount = totalStudents - outCount

    // Note: If you want to only count "IN" from map, you might miss students who haven't had a pass yet (default IN).
    // So (Total - Out) is safely "Everyone else is IN".

    return {
      allStudents: totalStudents,
      phonePass: totalPasses,
      phoneIn: inCount,
      phoneOut: outCount
    }
  }, [passes, students, phoneStatusMap])

  // Filtered List (Passes or Students based on ActiveTab)
  const filteredList = useMemo(() => {
    let list: any[] = []

    // 1. Determine Source
    if (activeTab === "phone-pass") {
      // SOURCE: Passes History
      // "phone-pass" = All History
      list = passes.map((p: any) => ({ ...p, type: "pass", originalId: p.id }))

      // Apply Date Filter (Only for Passes)
      if (startDate || endDate) {
        list = list.filter((p: any) => {
          if (!p.issueTime) return false
          const passDate = new Date(p.issueTime).toISOString().split('T')[0]
          if (startDate && endDate) return passDate >= startDate && passDate <= endDate
          if (startDate) return passDate >= startDate
          if (endDate) return passDate <= endDate
          return true
        })
      }

      // Search for Passes
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        list = list.filter((item: any) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.admissionNumber?.toLowerCase().includes(q) ||
          item.purpose?.toLowerCase().includes(q)
        )
      }

      // Sort Passes (Recent first)
      return list.sort((a, b) => new Date(b.issueTime || 0).getTime() - new Date(a.issueTime || 0).getTime())

    } else {
      // SOURCE: Students (for All Students, Phone Out, Phone In)
      // First, map all students to include their current status
      let studentList = students.map((s: any) => {
        const currentStatus = phoneStatusMap.get(s.id) || "IN"
        return {
          id: `student-${s.id}`,
          originalId: s.id,
          type: "student",
          studentName: s.name,
          admissionNumber: s.admission_number,
          className: s.class_name,
          lockerNumber: s.locker_number,
          rollNo: s.roll_no,
          phoneNumber: "-",
          status: currentStatus, // Use actual status from map
          issueTime: null,
          returnTime: null,
          purpose: "Registered Student"
        }
      })

      // Filter based on Tab
      if (activeTab === "phone-out") {
        studentList = studentList.filter((s: any) => s.status === "OUT")
      } else if (activeTab === "phone-in") {
        studentList = studentList.filter((s: any) => s.status === "IN")
      }
      // "all-students" returns everyone

      // Search for Students
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        studentList = studentList.filter((item: any) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.admissionNumber?.toLowerCase().includes(q)
        )
      }

      // Sort Students (Alphabetical)
      return studentList.sort((a: any, b: any) => (a.studentName || "").localeCompare(b.studentName || ""))
    }
  }, [passes, students, activeTab, searchQuery, startDate, endDate, phoneStatusMap])

  // Unique Classes/Lockers for Grant Pass View
  const classes = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.class_name).filter(Boolean))).sort()], [students])
  const lockers = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.locker_number).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b))], [students])

  // Filtered Students for GRANT PASS view
  const filteredStudents = useMemo(() => {
    return students
      .filter((s: any) => {
        const matchesSearch = !studentSearchQuery.trim() ||
          s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
          s.admission_number?.toLowerCase().includes(studentSearchQuery.toLowerCase())
        const matchesClass = selectedClass === "all" || s.class_name === selectedClass
        const matchesLocker = selectedLocker === "all" || s.locker_number === selectedLocker
        return matchesSearch && matchesClass && matchesLocker
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [students, studentSearchQuery, selectedClass, selectedLocker])

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    setCanGrantPass(role === "admin" || perms.includes("issue_phone_pass"))
    setCanViewLogs(role === "admin" || perms.includes("view_phone_logs") || perms.includes("issue_phone_pass") || perms.includes("access_phone_pass"))
  }, [router])

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  const handleSubmitOut = async (passId: number) => {
    setPassStates(prev => ({ ...prev, [passId]: "OUT" }))
    mutate("/api/phone-status", (current: any[] = []) => {
      const pass = passes.find((p: any) => p.id === passId)
      if (!pass) return current
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "OUT" } : s)
        : [...current, { studentId: pass.studentId, status: "OUT" }]
    }, false)

    toast.success("Marked as OUT")

    try {
      const res = await fetch(`/api/special-pass/out/${passId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")
    } catch (e) {
      setPassStates(prev => {
        const n = { ...prev }; delete n[passId]; return n
      })
      mutate("/api/phone-status")
      toast.error("Failed to update status")
    }
  }

  const handleSubmitIn = async (passId: number) => {
    const pass = passes.find((p: any) => p.id === passId)
    if (!pass) return

    // 1. Optimistic Update for PASS STATUS (The list item)
    mutate("/api/special-pass/all", (current: any[] = []) => {
      return current.map(p => p.id === passId ? { ...p, status: "COMPLETED", submissionTime: new Date().toISOString() } : p)
    }, false)

    // 2. Optimistic Update for PHONE STATUS (The counts)
    // We assume if they return the pass, the phone is "IN"
    mutate("/api/phone-status", (current: any[] = []) => {
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "IN" } : s)
        : [...current, { studentId: pass.studentId, status: "IN" }]
    }, false)

    toast.success("Pass Completed")

    try {
      setReturningPassId(passId)
      const res = await fetch(`/api/special-pass/return/${passId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")

      // Revalidate to ensure server consistency
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
    } catch (e) {
      // Rollback on error
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
      toast.error("Failed to complete pass")
    } finally {
      setReturningPassId(null)
    }
  }

  // --------------------------------------------------------------------------
  // Components
  // --------------------------------------------------------------------------

  const StatCard = ({
    label,
    count,
    param
  }: {
    label: string,
    count: number,
    param: "phone-pass" | "phone-in" | "phone-out" | "all-students"
  }) => {
    const isActive = activeTab === param
    return (
      <div
        onClick={() => setActiveTab(param)}
        className={`rounded-xl p-3 min-w-[80px] flex flex-col items-start justify-center shadow-sm border cursor-pointer transition-all active:scale-95
          ${isActive
            ? "bg-blue-600 border-blue-600"
            : "bg-cyan-50 border-cyan-100 hover:border-blue-300"
          }`}
      >
        <span className={`text-lg font-bold ${isActive ? "text-white" : "text-cyan-900"}`}>{count}</span>
        <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-blue-100" : "text-cyan-700/70"}`}>{label}</span>
      </div>
    )
  }

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------

  // 1. Student Selection View (Grant Pass)
  if (showStudentList) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowStudentList(false)} className="-ml-2">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Select Student</h1>
        </header>

        <main className="p-4 space-y-4">
          {/* Search & Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                className="pl-9 bg-muted/50 border-0"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-muted/50 border-0">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Class" : c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedLocker} onValueChange={setSelectedLocker}>
                <SelectTrigger className="bg-muted/50 border-0">
                  <SelectValue placeholder="Locker" />
                </SelectTrigger>
                <SelectContent>
                  {lockers.map(l => <SelectItem key={l} value={l}>{l === "all" ? "All Locker" : `Locker ${l}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-2">
            {filteredStudents.map((s: any) => (
              <div
                key={s.id}
                onClick={() => router.push(`/admin/special-pass/grant/${s.id}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/50 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {s.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.admission_number} • {s.class_name}</p>
                </div>
              </div>
            ))}
            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No students found</div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // 2. Main Dashboard View
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Gate Pass</h1>
        </div>
        {canGrantPass && (
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white gap-1 rounded-lg px-4"
            onClick={() => setShowStudentList(true)}
          >
            Add <Plus className="h-4 w-4" />
          </Button>
        )}
      </header>

      <main className="px-4 py-4 space-y-6">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-11 h-12 rounded-xl bg-white border-gray-200 shadow-sm text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Counts Cards (Tabs) */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x">
          <div className="snap-start shrink-0">
            <StatCard label="Phone Pass" count={stats.phonePass} param="phone-pass" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="Phone In" count={stats.phoneIn} param="phone-in" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="Phone Out" count={stats.phoneOut} param="phone-out" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="All Students" count={stats.allStudents} param="all-students" />
          </div>
        </div>

        {/* List Header & Date Filters */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Listed {filteredList.length}
            {activeTab === "phone-pass" ? " Passes" : " Students"}
          </h2>

          {/* Only show Date filters for History (Phone Pass) */}
          {activeTab === "phone-pass" && (
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground pl-1">Start Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 rounded-xl border-blue-400 text-blue-600 bg-white"
                  />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground pl-1">End Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 rounded-xl border-blue-400 text-blue-600 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="space-y-4">
          {passesLoading || studentLoading ? (
            <div className="text-center py-10 opacity-50"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : filteredList.map((item: any) => {
            const isStudent = item.type === "student"
            const currentStatus = item.status || "IN"
            const isOut = currentStatus === "OUT" // Valid for both pass object and student object (if status mapped)
            const isActive = currentStatus === "ACTIVE"
            const isCompleted = currentStatus === "COMPLETED" || currentStatus === "IN"

            // For Pass objects, we might check passStates for local optimistic updates
            const effectiveOut = isStudent ? isOut : (isOut || passStates[item.originalId] === "OUT")

            return (
              <div key={item.id} className="bg-blue-50/50 rounded-[20px] p-5 shadow-sm border border-blue-100">
                <div className="flex gap-4">
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-[#0066cc] text-base truncate pr-2">{item.studentName}</h3>
                      {/* Status Badge */}
                      <Badge variant="outline" className={`
                        rounded-md px-2 py-0.5 text-xs font-normal bg-white
                        ${effectiveOut ? "text-red-500 border-red-500" : "text-gray-500 border-gray-300"}
                      `}>
                        {isStudent ? (effectiveOut ? "out" : "in") : (effectiveOut ? "out" : isActive ? "active" : "gate pass")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mt-2">
                      {/* Row 1 */}
                      <div>
                        <p className="text-xs text-gray-400">Student ID</p>
                        <p className="font-semibold text-gray-900">{item.admissionNumber}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-gray-700 truncate">{item.phoneNumber || "-"}</p>
                      </div>

                      {/* Student Fields */}
                      {isStudent && (
                        <>
                          <div>
                            <p className="text-xs text-gray-400">Class</p>
                            <p className="font-medium text-gray-900">{item.className || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Locker</p>
                            <p className="font-medium text-gray-900">{item.lockerNumber || "-"}</p>
                          </div>
                          {item.rollNo && (
                            <div>
                              <p className="text-xs text-gray-400">Roll No</p>
                              <p className="font-medium text-gray-900">{item.rollNo}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Pass Fields - Timestamps */}
                      {!isStudent && item.issueTime && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Out Time</p>
                          <p className="font-medium text-gray-900">
                            {new Date(item.issueTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} •
                            {new Date(item.issueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      )}

                      {!isStudent && item.returnTime && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Return Time</p>
                          <p className="font-medium text-gray-900">
                            {new Date(item.returnTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} •
                            {new Date(item.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                      )}

                      {!isStudent && item.purpose && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Remarks</p>
                          <p className="font-medium text-gray-900 truncate">{item.purpose}</p>
                        </div>
                      )}

                      {!isStudent && isCompleted && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400">Status</p>
                          <p className="text-green-600 font-bold">Returned</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Only for Passes */}
                    {!isStudent && (
                      <div className="flex gap-3 mt-4 justify-end">
                        {(effectiveOut || isActive) && !isCompleted && (
                          <Button
                            variant="outline"
                            className="h-9 px-6 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700 bg-white font-medium"
                            onClick={() => handleSubmitIn(item.originalId)}
                            disabled={returningPassId === item.originalId}
                          >
                            {returningPassId === item.originalId ? <Loader2 className="h-4 w-4 animate-spin" /> : "IN"}
                          </Button>
                        )}

                        {isActive && !effectiveOut && !isCompleted && (
                          <Button
                            className="h-9 px-4 bg-red-300 hover:bg-red-400 text-red-900 border-none font-medium gap-1"
                            onClick={() => handleSubmitOut(item.originalId)}
                          >
                            Submit Out <ArrowUpRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Action for Students: Quick Grant Pass */}
                    {isStudent && canGrantPass && (
                      <div className="flex gap-3 mt-4 justify-end">
                        <Button
                          className="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => router.push(`/admin/special-pass/grant/${item.originalId}`)}
                        >
                          Issue Pass
                        </Button>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default function SpecialPassPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SpecialPassContent />
    </Suspense>
  )
}
