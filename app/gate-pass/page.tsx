"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  Search,
  Plus,
  ArrowUpRight,
  Loader2,
  Menu,
  X,
  GraduationCap,
  DoorOpen,
  History,
  ArrowRightCircle,
  Users,
  Settings,
  Ticket
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
import Link from "next/link"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function GatePassContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showStudentList, setShowStudentList] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<"gate-pass" | "student-in" | "student-out" | "all-students">("gate-pass")
  const [gatePassFilterClass, setGatePassFilterClass] = useState<string>("all")

  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")

  const [gatePassStates, setGatePassStates] = useState<{ [key: number]: "OUT" | "IN" }>({})
  const [returningGatePassId, setReturningGatePassId] = useState<number | null>(null)

  // Debounced search queries for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const debouncedStudentSearchQuery = useDebounce(studentSearchQuery, 300)

  const [canGrantPass, setCanGrantPass] = useState(false)
  const [canViewLogs, setCanViewLogs] = useState(false)
  const [canManageStatus, setCanManageStatus] = useState(false)

  // Fetch students
  const { data: studentsData = [], isLoading: studentLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
    onError: () => setCanGrantPass(false),
  })
  const students = Array.isArray(studentsData) ? studentsData : []

  // Fetch gate passes (from special-pass/all since we use same table)
  // OPTIMIZED: Reduced polling to 10s for smooth UX
  const { data: allGatePasses = [], isLoading: gatePassesLoading } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 10000, // CHANGED: 3000ms → 10000ms
    revalidateOnFocus: false, // CHANGED: true → false
    dedupingInterval: 5000, // CHANGED: 1000ms → 5000ms
  })
  // Filter ONLY gate passes - strictly exclude all phone passes
  const gatePasses = Array.isArray(allGatePasses) ? allGatePasses.filter((p: any) => {
    // Show ONLY gate passes (those that start with "GATE:")
    if (!p.purpose) return false
    return p.purpose.startsWith("GATE:")
  }) : []

  // Fetch phone/gate pass statuses (same tracking)
  // OPTIMIZED: Reduced polling to 15s for better performance
  const { data: gatePassStatusData = [] } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 15000, // CHANGED: 2000ms → 15000ms
    revalidateOnFocus: false, // CHANGED: true → false
    dedupingInterval: 5000, // CHANGED: 500ms → 5000ms
  })

  const gatePassStatusMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(gatePassStatusData)) {
      gatePassStatusData.forEach((s: any) => map.set(s.studentId, s.status))
    }
    return map
  }, [gatePassStatusData])

  const stats = useMemo(() => {
    const totalPasses = gatePasses.length
    const totalStudents = students.length
    const outCount = Array.from(gatePassStatusMap.values()).filter(status => status === "OUT").length
    const inCount = totalStudents - outCount

    return {
      allStudents: totalStudents,
      gatePass: totalPasses,
      studentIn: inCount,
      studentOut: outCount
    }
  }, [gatePasses, students, gatePassStatusMap])

  const filteredList = useMemo(() => {
    let list: any[] = []

    if (activeTab === "gate-pass") {
      list = gatePasses.map((p: any) => ({ ...p, type: "pass", originalId: p.id }))

      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase()
        list = list.filter((item: any) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.admissionNumber?.toLowerCase().includes(q)
        )
      }

      if (gatePassFilterClass !== "all") {
        list = list.filter((item: any) => item.className === gatePassFilterClass)
      }

      return list.sort((a, b) => {
        // First: sort by completion status (active passes first)
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1
        if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1
        // Then: sort by recency (most recent first)
        return new Date(b.issueTime || 0).getTime() - new Date(a.issueTime || 0).getTime()
      })
    } else {
      let studentList = students.map((s: any) => {
        const currentStatus = gatePassStatusMap.get(s.id) || "IN"
        return {
          id: `student-${s.id}`,
          originalId: s.id,
          type: "student",
          studentName: s.name,
          admissionNumber: s.admission_number,
          className: s.class_name,
          lockerNumber: s.locker_number,
          phoneNumber: s.phone_number,
          status: currentStatus,
          issueTime: null,
        }
      })

      if (activeTab === "student-out") {
        studentList = studentList.filter((s: any) => s.status === "OUT")
      } else if (activeTab === "student-in") {
        studentList = studentList.filter((s: any) => s.status === "IN")
      }

      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase()
        studentList = studentList.filter((item: any) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.admissionNumber?.toLowerCase().includes(q)
        )
      }

      return studentList.sort((a: any, b: any) => (a.studentName || "").localeCompare(b.studentName || ""))
    }
  }, [gatePasses, students, activeTab, debouncedSearchQuery, gatePassFilterClass, gatePassStatusMap])

  const classes = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.class_name).filter(Boolean))).sort()], [students])
  const lockers = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.locker_number).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b))], [students])
  const gatePassClasses = useMemo(() => ["all", ...Array.from(new Set(gatePasses.map((p: any) => p.className).filter(Boolean))).sort()], [gatePasses])

  const filteredStudents = useMemo(() => {
    return students
      .filter((s: any) => {
        const matchesSearch = !debouncedStudentSearchQuery.trim() ||
          s.name?.toLowerCase().includes(debouncedStudentSearchQuery.toLowerCase()) ||
          s.admission_number?.toLowerCase().includes(debouncedStudentSearchQuery.toLowerCase())
        const matchesClass = selectedClass === "all" || s.class_name === selectedClass
        const matchesLocker = selectedLocker === "all" || s.locker_number === selectedLocker
        return matchesSearch && matchesClass && matchesLocker
      })
      .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
  }, [students, debouncedStudentSearchQuery, selectedClass, selectedLocker])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const perms = JSON.parse(localStorage.getItem("permissions") || "[]")

    if (!token) {
      router.push("/login")
      return
    }

    setCanGrantPass(role === "admin" || perms.includes("issue_gate_pass"))
    setCanViewLogs(role === "admin" || perms.includes("view_gate_logs") || perms.includes("issue_gate_pass") || perms.includes("access_gate_pass"))
    setCanManageStatus(role === "admin" || perms.includes("manage_gate_status") || perms.includes("issue_gate_pass"))
  }, [router])

  const handleSubmitOut = async (gatePassId: number) => {
    setGatePassStates(prev => ({ ...prev, [gatePassId]: "OUT" }))
    mutate("/api/phone-status", (current: any[] = []) => {
      const pass = gatePasses.find((p: any) => p.id === gatePassId)
      if (!pass) return current
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "OUT" } : s)
        : [...current, { studentId: pass.studentId, status: "OUT" }]
    }, false)

    toast.success("Student Marked OUT")

    try {
      const res = await fetch(`/api/special-pass/out/${gatePassId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")
      // Clear the optimistic state after successful API response
      setGatePassStates(prev => {
        const n = { ...prev }; delete n[gatePassId]; return n
      })
    } catch (e) {
      setGatePassStates(prev => {
        const n = { ...prev }; delete n[gatePassId]; return n
      })
      mutate("/api/phone-status")
      toast.error("Failed to update status")
    }
  }

  const handleSubmitIn = async (gatePassId: number) => {
    const pass = gatePasses.find((p: any) => p.id === gatePassId)
    if (!pass) return

    mutate("/api/special-pass/all", (current: any[] = []) => {
      return current.map(p => p.id === gatePassId ? { ...p, status: "COMPLETED", submissionTime: new Date().toISOString() } : p)
    }, false)

    mutate("/api/phone-status", (current: any[] = []) => {
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "IN" } : s)
        : [...current, { studentId: pass.studentId, status: "IN" }]
    }, false)

    toast.success("Student Marked IN")

    try {
      setReturningGatePassId(gatePassId)
      const res = await fetch(`/api/special-pass/return/${gatePassId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")

      // Clear the optimistic state after successful API response
      setGatePassStates(prev => {
        const n = { ...prev }; delete n[gatePassId]; return n
      })

      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
    } catch (e) {
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
      toast.error("Failed to complete gate pass")
    } finally {
      setReturningGatePassId(null)
    }
  }

  const StatCard = ({
    label,
    count,
    param
  }: {
    label: string,
    count: number,
    param: "gate-pass" | "student-in" | "student-out" | "all-students"
  }) => {
    const isActive = activeTab === param
    return (
      <div
        onClick={() => setActiveTab(param)}
        className={`rounded-xl p-3 min-w-[80px] flex flex-col items-start justify-center shadow-sm border cursor-pointer transition-all active:scale-95
          ${isActive
            ? "bg-green-600 border-green-600"
            : "bg-green-50 border-green-100 hover:border-green-300"
          }`}
      >
        <span className={`text-lg font-bold ${isActive ? "text-white" : "text-green-900"}`}>{count}</span>
        <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-green-100" : "text-green-700/70"}`}>{label}</span>
      </div>
    )
  }

  if (showStudentList) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowStudentList(false)} className="-ml-2">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-bold">Select Student</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredStudents.length} / {students.length} total
          </div>
        </header>

        <main className="p-4 space-y-4">
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

          <div className="grid grid-cols-1 gap-2">
            {studentLoading ? (
              <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p>Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {students.length === 0 ? "No students available" : "No students found matching filters"}
              </div>
            ) : (
              filteredStudents.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/admin/gate-pass/grant/${s.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border hover:border-primary/50 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-100 text-green-600 font-bold">
                      {s.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.admission_number} • {s.class_name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">Gate Pass</h1>
        </div>
        <div className="flex items-center gap-2">
          {canGrantPass && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-1 rounded-lg px-4"
              onClick={() => setShowStudentList(true)}
            >
              Add <Plus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="relative"
          >
            {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="sticky top-16 z-40 bg-background border-b">
          <div className="px-4 py-4 space-y-2">
            <Link href="/admin/manage-students" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                <GraduationCap className="h-5 w-5 text-green-600" />
                <span className="font-medium">Students</span>
              </div>
            </Link>
            <Link href="/gate-pass-menu" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 cursor-pointer">
                <DoorOpen className="h-5 w-5 text-green-600" />
                <span className="font-medium">Gate Pass</span>
              </div>
            </Link>
            <Link href="/history" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                <History className="h-5 w-5 text-green-600" />
                <span className="font-medium">History</span>
              </div>
            </Link>
            <Link href="/admin/monthly-leave" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                <ArrowRightCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Monthly Leave</span>
              </div>
            </Link>
            <Link href="/admin/users" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                <Users className="h-5 w-5 text-green-600" />
                <span className="font-medium">Users</span>
              </div>
            </Link>
            <Link href="/admin/settings" onClick={() => setShowMenu(false)}>
              <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 cursor-pointer transition-colors">
                <Settings className="h-5 w-5 text-green-600" />
                <span className="font-medium">Settings</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      <main className="px-4 py-4 space-y-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-11 h-12 rounded-xl bg-white border-gray-200 shadow-sm text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Gate Pass Filter */}
          {activeTab === "gate-pass" && (
            <select
              value={gatePassFilterClass}
              onChange={(e) => setGatePassFilterClass(e.target.value)}
              className="w-full h-12 px-3 py-2 rounded-xl border border-purple-400 bg-white text-purple-600 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Classes</option>
              {gatePassClasses.filter((c: string) => c !== "all").map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x">
          <div className="snap-start shrink-0">
            <StatCard label="Gate Pass" count={stats.gatePass} param="gate-pass" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="Student In" count={stats.studentIn} param="student-in" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="Student Out" count={stats.studentOut} param="student-out" />
          </div>
          <div className="snap-start shrink-0">
            <StatCard label="All Students" count={stats.allStudents} param="all-students" />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Listed {filteredList.length}
            {activeTab === "gate-pass" ? " Gate Passes" : " Students"}
          </h2>
        </div>

        <div className="space-y-4">
          {gatePassesLoading || studentLoading ? (
            <div className="text-center py-10 opacity-50"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
          ) : filteredList.map((item: any) => {
            const isStudent = item.type === "student"
            const currentStatus = item.status || "IN"
            const isOut = currentStatus === "OUT"
            const isCompleted = currentStatus === "COMPLETED"
            const isNotIssued = isStudent && !item.issueTime // Student with no gate pass issued
            const effectiveOut = !isCompleted && (isStudent ? isOut : (gatePassStates[item.originalId] === "OUT" || isOut))

            return (
              <div key={item.id} className="bg-green-50/50 rounded-[20px] p-5 shadow-sm border border-green-100">
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-green-600 text-base truncate pr-2">{item.studentName}</h3>
                      <Badge variant="outline" className={`
                        rounded-md px-2 py-0.5 text-xs font-normal bg-white
                        ${isNotIssued ? "text-orange-600 border-orange-400" : (!isCompleted && effectiveOut ? "text-red-500 border-red-500" : (isCompleted ? "text-green-600 border-green-200" : "text-gray-500 border-gray-300"))}
                      `}>
                        {isNotIssued
                          ? "not issued"
                          : (isStudent
                            ? (effectiveOut ? "out" : "in")
                            : (isCompleted ? "returned" : (effectiveOut ? "out" : "active"))
                          )
                        }
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mt-2">
                      <div>
                        <p className="text-xs text-gray-400">Student ID</p>
                        <p className="font-semibold text-gray-900">{item.admissionNumber}</p>
                      </div>

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
                          <div>
                            <p className="text-xs text-gray-400">Phone</p>
                            <p className="font-medium text-gray-900">{item.phoneNumber || "-"}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {!isStudent && (
                      <div className="flex gap-3 mt-4 justify-end items-center">
                        {!isCompleted && (
                          <div className="flex items-center gap-3">
                            <Badge className={`rounded-full px-4 py-1 text-xs font-semibold border-2 ${effectiveOut ? "bg-red-50 text-red-600 border-red-400" : "bg-green-50 text-green-600 border-green-400"}`}>
                              {effectiveOut ? "OUT" : "IN"}
                            </Badge>

                            <Button
                              className="h-9 px-6 rounded-full text-xs font-semibold bg-green-500 hover:bg-green-600 text-white border-none transition-all"
                              onClick={() => effectiveOut ? handleSubmitIn(item.originalId) : handleSubmitOut(item.originalId)}
                              disabled={returningGatePassId === item.originalId}
                            >
                              {returningGatePassId === item.originalId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  {effectiveOut ? "Submit In" : "Submit Out"}
                                  {!effectiveOut && <ArrowUpRight className="h-4 w-4 ml-1 inline" />}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
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

export default function GatePassPage() {
  return <GatePassContent />
}
