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
  Loader2,
  Menu,
  X,
  GraduationCap,
  DoorOpen,
  History,
  ArrowRightCircle,
  Users,
  Settings,
  Calendar
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
import { format } from "date-fns"
import { BackToDashboard } from "@/components/back-to-dashboard"
import { DownloadButton } from "@/components/download-button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function GatePassContent() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showStudentList, setShowStudentList] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<"gate-pass" | "student-in" | "student-out" | "all-students">("gate-pass")
  const [gatePassFilterClass, setGatePassFilterClass] = useState<string>("all")

  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")

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

  // Fetch gate passes
  const { data: allPasses = [], isLoading: passesLoading } = useSWR("/api/gate-pass/all", fetcher, {
    refreshInterval: 3500,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  const gatePasses = Array.isArray(allPasses) ? allPasses.filter((p: any) => {
    if (!p.purpose) return false
    return p.purpose.startsWith("GATE:")
  }) : []

  // Fetch phone/gate pass statuses
  const { data: phoneStatusData = [] } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 3500,
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })

  const gatePassStatusMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(phoneStatusData)) {
      phoneStatusData.forEach((s: any) => map.set(s.studentId, s.status))
    }
    return map
  }, [phoneStatusData])

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

      if (startDate) {
        list = list.filter((item: any) => {
          if (!item.issueTime) return false;
          return new Date(item.issueTime) >= new Date(startDate);
        })
      }

      if (endDate) {
        list = list.filter((item: any) => {
          if (!item.issueTime) return false;
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return new Date(item.issueTime) <= end;
        })
      }

      return list.sort((a, b) => {
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1
        if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1
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
          purpose: null
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
  }, [gatePasses, students, activeTab, debouncedSearchQuery, gatePassFilterClass, gatePassStatusMap, startDate, endDate])

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
      document.cookie="auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;"; window.location.href="/login"
      return
    }

    setCanGrantPass(role === "admin" || perms.includes("issue_gate_pass"))
    setCanViewLogs(role === "admin" || perms.includes("view_gate_logs") || perms.includes("issue_gate_pass") || perms.includes("access_gate_pass"))
    setCanManageStatus(role === "admin" || perms.includes("manage_gate_status") || perms.includes("issue_gate_pass"))
  }, [router])

  const handleSubmitOut = async (gatePassId: number) => {
    setReturningGatePassId(gatePassId)

    const pass = gatePasses.find((p: any) => p.id === gatePassId)
    if (!pass) {
      setReturningGatePassId(null)
      toast.error("Pass not found")
      return
    }

    mutate("/api/phone-status", (current: any[] = []) => {
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
    } catch (e) {
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")
      toast.error("Failed to update status")
    } finally {
      setReturningGatePassId(null)
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
    title,
    subtitle,
    count,
    param
  }: {
    title: string,
    subtitle: string,
    count: number,
    param: "gate-pass" | "student-in" | "student-out" | "all-students"
  }) => {
    const isActive = activeTab === param
    return (
      <div
        onClick={() => setActiveTab(param)}
        className={`rounded-3xl p-4 min-w-[100px] flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 border
          ${isActive
            ? "bg-[#0ca643] border-[#0ca643] shadow-[0_4px_20px_rgba(12,166,67,0.3)]"
            : "bg-green-50/50 border-green-100 hover:bg-green-100/50"
          }`}
      >
        <span className={`text-2xl font-bold ${isActive ? "text-white" : "text-slate-900"}`}>
          {count}
        </span>
        <span className={`text-[11px] font-semibold mt-1 tracking-wide ${isActive ? "text-green-50" : "text-green-600"}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isActive ? "text-green-100/80" : "text-green-500/70"}`}>
            {subtitle}
          </span>
        )}
      </div>
    )
  }

  if (showStudentList) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowStudentList(false)} className="rounded-xl hover:bg-slate-100 text-slate-700">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-slate-900">Select Student</h1>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredStudents.length} / {students.length}
          </div>
        </header>

        <main className="p-4 space-y-4 max-w-lg mx-auto">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student..."
                className="pl-10 h-12 bg-white border-slate-200 rounded-2xl shadow-sm text-sm focus:ring-slate-200"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-white border-slate-200 rounded-2xl h-11 text-sm font-medium text-slate-700 shadow-sm flex-1">
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200">
                  {classes.map(c => <SelectItem key={c} value={c} className="rounded-xl">{c === "all" ? "All Classes" : c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedLocker} onValueChange={setSelectedLocker}>
                <SelectTrigger className="bg-white border-slate-200 rounded-2xl h-11 text-sm font-medium text-slate-700 shadow-sm flex-1">
                  <SelectValue placeholder="Locker" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200">
                  {lockers.map(l => <SelectItem key={l} value={l} className="rounded-xl">{l === "all" ? "All Lockers" : `Locker ${l}`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {studentLoading ? (
              <div className="text-center py-12 flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="font-medium text-sm">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium text-sm bg-white rounded-3xl border border-slate-100">
                {students.length === 0 ? "No students available" : "No students found matching filters"}
              </div>
            ) : (
              filteredStudents.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/admin/gate-pass/grant/${s.id}`)}
                  className="flex items-center gap-4 p-3.5 rounded-[20px] bg-white border border-slate-100 hover:border-green-200 hover:shadow-md cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Avatar className="h-11 w-11 rounded-full border border-green-100 shadow-sm">
                    <AvatarFallback className="bg-green-50 text-green-700 font-bold text-lg">
                      {s.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{s.admission_number}</span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{s.class_name || "No Class"}</span>
                    </div>
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
    <div className="min-h-screen bg-white pb-20 md:pb-8 font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="-ml-2 hover:bg-gray-50 text-gray-800 rounded-xl">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <BackToDashboard />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gate Pass</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <DownloadButton
            data={filteredList}
            columns={[
              { key: "studentName", header: "Student Name" },
              { key: "admissionNumber", header: "Admission No" },
              { key: "className", header: "Class" },
              { key: "status", header: "Status" },
              { key: "issueTime", header: "Issue Time" },
              { key: "purpose", header: "Purpose" },
            ]}
            filename={`gate-pass-${activeTab}`}
            title="Gate Pass Report"
          />
          {canGrantPass && (
            <Button
              className="bg-[#0ca643] hover:bg-green-700 text-white gap-1 rounded-2xl px-5 h-10 font-bold text-sm shadow-sm transition-transform active:scale-95"
              onClick={() => setShowStudentList(true)}
            >
              Add <Plus className="h-4 w-4 stroke-[3]" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-2xl border-gray-200 bg-white hover:bg-gray-50 text-gray-700 h-10 w-10 shadow-sm transition-transform active:scale-95"
          >
            {showMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Menu Dropdown */}
      {showMenu && (
        <div className="fixed inset-x-0 top-[64px] z-40 bg-white border-b border-gray-100 shadow-xl shadow-gray-200/20 px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <Link href="/admin/manage-students" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <GraduationCap className="h-5 w-5" />
              <span className="font-bold text-sm">Students</span>
            </div>
          </Link>
          <Link href="/gate-pass" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-50 cursor-pointer text-green-700">
              <DoorOpen className="h-5 w-5" />
              <span className="font-bold text-sm">Gate Pass</span>
            </div>
          </Link>
          <Link href="/history" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <History className="h-5 w-5" />
              <span className="font-bold text-sm">History</span>
            </div>
          </Link>
          <Link href="/admin/monthly-leave" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <ArrowRightCircle className="h-5 w-5" />
              <span className="font-bold text-sm">Monthly Leave</span>
            </div>
          </Link>
          <Link href="/admin/users" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <Users className="h-5 w-5" />
              <span className="font-bold text-sm">Users</span>
            </div>
          </Link>
          <Link href="/admin/settings" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <Settings className="h-5 w-5" />
              <span className="font-bold text-sm">Settings</span>
            </div>
          </Link>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-7">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search"
            className="pl-12 h-14 rounded-3xl bg-white border border-gray-200 shadow-sm text-base focus:ring-2 focus:ring-green-100 transition-shadow"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats Flow */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x">
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Gate Pass" subtitle="" count={stats.gatePass} param="gate-pass" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Student In" subtitle="" count={stats.studentIn} param="student-in" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Student Out" subtitle="" count={stats.studentOut} param="student-out" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="All Students" subtitle="" count={stats.allStudents} param="all-students" />
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full rounded-full"></div>

        <div className="space-y-4">
          {/* Section Title */}
          <h2 className="text-base font-semibold text-slate-500">
            Listed {filteredList.length}
            {activeTab === "gate-pass" ? " Passes" : " Students"}
          </h2>

          {/* Filters */}
          {activeTab === "gate-pass" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">Start Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-12 w-full rounded-2xl border-blue-400 text-blue-600 bg-white pr-10 focus:ring-blue-100 appearance-none font-medium"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">End Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-12 w-full rounded-2xl border-green-400 text-green-600 bg-white pr-10 focus:ring-green-100 appearance-none font-medium"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 ml-1 mb-1 block">Class</label>
                <Select value={gatePassFilterClass} onValueChange={setGatePassFilterClass}>
                  <SelectTrigger className="h-12 w-full rounded-2xl border-purple-400 text-purple-600 bg-white focus:ring-purple-100 font-medium border">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-purple-200">
                    <SelectItem value="all" className="rounded-xl">All Classes</SelectItem>
                    {gatePassClasses.filter((c: string) => c !== "all").map((c: string) => (
                      <SelectItem key={c} value={c} className="rounded-xl">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-4 pt-2">
          {passesLoading || studentLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">No records found.</div>
          ) : filteredList.map((item: any) => {
            const isStudent = item.type === "student"
            const currentStatus = item.status || "IN"
            const isOut = currentStatus === "OUT"
            const isCompleted = currentStatus === "COMPLETED"
            const isNotIssued = isStudent && !item.issueTime

            // Date formatting
            let displayTime = "-"
            if (item.issueTime) {
              try {
                displayTime = format(new Date(item.issueTime), "dd MMM • hh:mm a")
              } catch (e) { }
            }

            // Remarks
            let remarksText = "-"
            if (item.purpose) {
              remarksText = item.purpose.replace("GATE:", "").trim()
            } else if (isStudent && isNotIssued) {
              remarksText = ""
            }

            return (
              <div key={item.id} className="bg-[#f8fcf9] rounded-[24px] p-5 sm:p-6 border border-green-100 shadow-sm relative overflow-hidden">
                {/* Top Status Badge */}
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-[#0ca643] text-lg uppercase tracking-tight pr-4">{item.studentName}</h3>
                  <div className={`px-3 py-0.5 rounded-full border text-xs font-semibold lowercase
                       ${isNotIssued ? 'border-orange-500 text-orange-500' :
                      (!isCompleted && isOut ? 'border-red-500 text-red-500' :
                        (isCompleted ? 'border-gray-300 text-gray-500' : 'border-gray-400 text-gray-600'))}`}>
                    {isNotIssued ? "not issued" : (isStudent ? (isOut ? "out" : "in") : (isCompleted ? "returned" : (isOut ? "out" : "active")))}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Student ID</p>
                    <p className="font-bold text-slate-800 text-[15px]">{item.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Phone</p>
                    <p className="font-bold text-slate-800 text-[15px] uppercase">{item.phoneNumber || "-"}</p>
                  </div>

                  {!isNotIssued && (
                    <>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-400 mb-1">Out Time</p>
                        <p className="font-bold text-slate-800 text-[15px]">{displayTime}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-400 mb-1">Remarks</p>
                        <p className="font-bold text-slate-800 text-[15px] uppercase">{remarksText || "-"}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                {!isStudent && !isCompleted && (
                  <div className="flex justify-end items-center gap-3 mt-6 pt-2">
                    <div className="flex gap-3">
                      <div className={`px-6 py-2.5 rounded-full border-2 font-bold text-sm uppercase tracking-wide
                             ${isOut ? 'border-red-400 text-red-500' : 'border-green-400 text-green-600'}`}>
                        {isOut ? "OUT" : "IN"}
                      </div>
                      <Button
                        onClick={() => isOut ? handleSubmitIn(item.originalId) : handleSubmitOut(item.originalId)}
                        disabled={returningGatePassId === item.originalId}
                        className="px-6 py-2.5 h-auto rounded-full bg-[#0ca643] hover:bg-green-700 text-white font-bold text-sm shadow-none transition-transform active:scale-95 border-none"
                      >
                        {isOut ? "Submit In" : "Submit Out"}
                      </Button>
                    </div>
                  </div>
                )}
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
