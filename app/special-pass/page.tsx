"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
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
  Ticket,
  History,
  ArrowRightCircle,
  Users,
  Settings,
  Calendar,
  DoorOpen
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { format } from "date-fns"
import { useSearchParams } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function SpecialPassContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as any) || "phone-pass"

  const [searchQuery, setSearchQuery] = useState("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [passFilterClass, setPassFilterClass] = useState<string>("all")

  const [returningPassId, setReturningPassId] = useState<number | null>(null)
  const [showStudentList, setShowStudentList] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [activeTab, setActiveTab] = useState<"phone-pass" | "phone-in" | "phone-out" | "all-students" | "nill">(initialTab)

  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")

  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const debouncedStudentSearchQuery = useDebounce(studentSearchQuery, 300)

  const [activatingStudent, setActivatingStudent] = useState<any>(null)
  const [activatePhoneModel, setActivatePhoneModel] = useState("")

  const [canGrantPass, setCanGrantPass] = useState(false)
  const [canViewLogs, setCanViewLogs] = useState(false)
  const [canManageStatus, setCanManageStatus] = useState(false)

  // Fetch all students
  const { data: studentsData = [], isLoading: studentLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
    onError: () => setCanGrantPass(false),
  })
  const students = Array.isArray(studentsData) ? studentsData : []

  // Fetch all special passes
  const { data: allPasses = [], isLoading: passesLoading } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 3500,
    revalidateOnFocus: true,
    dedupingInterval: 500,
  })

  const passes = Array.isArray(allPasses) ? allPasses.filter((p: any) => {
    if (!p.purpose) return false
    return p.purpose.startsWith("PHONE:")
  }) : []

  // Fetch phone statuses
  const { data: phoneStatusData = [] } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 3500,
    revalidateOnFocus: true,
    dedupingInterval: 500,
  })

  const phoneStatusMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(phoneStatusData)) {
      phoneStatusData.forEach((s: any) => map.set(s.studentId, s.status))
    }
    // Override with passes data to ensure sync
    passes.forEach((p: any) => {
      if (p.status === "OUT") {
        map.set(p.studentId, "OUT")
      } else if (p.status === "ACTIVE" || p.status === "PENDING") {
        // Only set ACTIVE if not already OUT
        if (map.get(p.studentId) !== "OUT") {
          map.set(p.studentId, "ACTIVE")
        }
      }
    })
    return map
  }, [phoneStatusData, passes])

  const duplicatePassesPerStudent = useMemo(() => {
    const duplicates = new Map<number, any[]>()

    passes.forEach((pass: any) => {
      if (pass.status !== "COMPLETED") {
        const studentId = pass.studentId
        if (!duplicates.has(studentId)) {
          duplicates.set(studentId, [])
        }
        duplicates.get(studentId)!.push(pass)
      }
    })

    const result: Map<number, any[]> = new Map()
    duplicates.forEach((passArray, studentId) => {
      if (passArray.length > 1) {
        result.set(studentId, passArray)
      }
    })
    return result
  }, [passes])

  const stats = useMemo(() => {
    // Filter out students who don't have a phone registered
    const studentsWithPhones = students.filter((s: any) => {
      const hasNoPhone = !s.phone_name ||
        s.phone_name?.toLowerCase?.() === "nill" ||
        s.phone_name?.toLowerCase?.() === "nil" ||
        s.phone_name?.toLowerCase?.() === "none"
      return !hasNoPhone
    })

    const totalStudents = studentsWithPhones.length
    const outCount = studentsWithPhones.filter((s: any) => phoneStatusMap.get(s.id) === "OUT" || phoneStatusMap.get(s.id) === "ACTIVE").length
    const inCount = totalStudents - outCount
    const nillCount = students.length - totalStudents

    // Number of passes belonging to students with phones
    const validPasses = passes.filter((p: any) => {
      const student = students.find((s: any) => s.id === p.studentId)
      if (!student) return true;
      const hasNoPhone = !student.phone_name ||
        student.phone_name?.toLowerCase?.() === "nill" ||
        student.phone_name?.toLowerCase?.() === "nil" ||
        student.phone_name?.toLowerCase?.() === "none"
      return !hasNoPhone
    })

    return {
      allStudents: students.length,
      phonePass: validPasses.length,
      phoneIn: inCount,
      phoneOut: outCount,
      nillCount: nillCount
    }
  }, [passes, students, phoneStatusMap])

  const filteredList = useMemo(() => {
    let list: any[] = []

    if (activeTab === "phone-pass") {
      // Filter out passes belonging to nill students 
      const validPasses = passes.filter((p: any) => {
        const student = students.find((s: any) => s.id === p.studentId)
        if (!student) return true;
        const hasNoPhone = !student.phone_name ||
          student.phone_name?.toLowerCase?.() === "nill" ||
          student.phone_name?.toLowerCase?.() === "nil" ||
          student.phone_name?.toLowerCase?.() === "none"
        return !hasNoPhone
      })

      list = validPasses.map((p: any) => ({ ...p, type: "pass", originalId: p.id }))

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

      if (passFilterClass !== "all") {
        list = list.filter((p: any) => p.className === passFilterClass)
      }

      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase()
        list = list.filter((item: any) =>
          item.studentName?.toLowerCase().includes(q) ||
          item.admissionNumber?.toLowerCase().includes(q) ||
          item.purpose?.toLowerCase().includes(q)
        )
      }

      return list.sort((a, b) => {
        if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1
        if (a.status !== "COMPLETED" && b.status === "COMPLETED") return -1
        return new Date(b.issueTime || 0).getTime() - new Date(a.issueTime || 0).getTime()
      })

    } else {
      let studentList = students.map((s: any) => {
        const currentStatus = phoneStatusMap.get(s.id) || "IN"
        const hasNoPhone = !s.phone_name ||
          s.phone_name?.toLowerCase?.() === "nill" ||
          s.phone_name?.toLowerCase?.() === "nil" ||
          s.phone_name?.toLowerCase?.() === "none"

        // Find their active phone pass if they have one
        const activePass = passes.find((p: any) => p.studentId === s.id && p.status !== "COMPLETED")

        return {
          id: `student-${s.id}`,
          originalId: s.id,
          type: "student",
          studentName: s.name,
          admissionNumber: s.admission_number,
          className: s.class_name,
          lockerNumber: s.locker_number,
          rollNo: s.roll_no,
          phoneNumber: s.phone_name || s.phone_number || "Not Registered",
          status: currentStatus,
          issueTime: activePass ? activePass.issueTime : null,
          returnTime: activePass ? activePass.returnTime : null,
          purpose: activePass ? activePass.purpose : "Registered Student",
          hasNoPhone: hasNoPhone
        }
      })

      if (activeTab === "phone-out") {
        studentList = studentList.filter((s: any) => (s.status === "OUT" || s.status === "ACTIVE") && !s.hasNoPhone)
      } else if (activeTab === "phone-in") {
        studentList = studentList.filter((s: any) => s.status === "IN" && !s.hasNoPhone)
      } else if (activeTab === "all-students") {
        studentList = studentList.filter((s: any) => !s.hasNoPhone)
      } else if (activeTab === "nill") {
        studentList = studentList.filter((s: any) => s.hasNoPhone)
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
  }, [passes, students, activeTab, debouncedSearchQuery, startDate, endDate, passFilterClass, phoneStatusMap])

  const classes = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.class_name).filter(Boolean))).sort()], [students])
  const lockers = useMemo(() => ["all", ...Array.from(new Set(students.map((s: any) => s.locker_number).filter(Boolean))).sort((a: any, b: any) => Number(a) - Number(b))], [students])
  const passClasses = useMemo(() => ["all", ...Array.from(new Set(passes.map((p: any) => p.className).filter(Boolean))).sort()], [passes])

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

    setCanGrantPass(role === "admin" || perms.includes("issue_phone_pass"))
    setCanViewLogs(role === "admin" || perms.includes("view_phone_logs") || perms.includes("issue_phone_pass") || perms.includes("access_phone_pass"))
    setCanManageStatus(role === "admin" || perms.includes("manage_phone_status") || perms.includes("issue_phone_pass"))
  }, [router])

  useEffect(() => {
    if (duplicatePassesPerStudent.size > 0) {
      const duplicateCounts = Array.from(duplicatePassesPerStudent.entries())
        .map(([_, passes]) => passes[0].studentName)
        .join(", ")

      toast.error(
        `⚠️ Rule Violation: ${duplicatePassesPerStudent.size} student(s) have multiple active passes: ${duplicateCounts}. Only 1 pass per student allowed!`,
        { duration: 8000 }
      )
    }
  }, [duplicatePassesPerStudent])

  const handleSubmitOut = async (passId: number) => {
    setReturningPassId(passId)

    const pass = passes.find((p: any) => p.id === passId)
    if (!pass) {
      setReturningPassId(null)
      toast.error("Pass not found")
      return
    }

    // Ultra-smooth Optimistic UI Update
    mutate("/api/special-pass/all", (current: any[] = []) => {
      return current.map(p => p.id === passId ? { ...p, status: "OUT" } : p)
    }, false)

    mutate("/api/phone-status", (current: any[] = []) => {
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "OUT" } : s)
        : [...current, { studentId: pass.studentId, status: "OUT" }]
    }, false)


    try {
      const res = await fetch(`/api/special-pass/out/${passId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")

      toast.success("Marked as OUT")

      // Background sync without killing the optimistic state
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")
    } catch (e) {
      // Revert on failure
      mutate("/api/phone-status")
      mutate("/api/special-pass/all")
      toast.error("Failed to update status")
    } finally {
      setReturningPassId(null)
    }
  }

  const handleSubmitIn = async (passId: number) => {
    setReturningPassId(passId)
    const pass = passes.find((p: any) => p.id === passId)
    if (!pass) {
      setReturningPassId(null)
      toast.error("Pass not found")
      return
    }

    // Ultra-smooth Optimistic UI Update
    mutate("/api/special-pass/all", (current: any[] = []) => {
      return current.map(p => p.id === passId ? { ...p, status: "COMPLETED", submissionTime: new Date().toISOString() } : p)
    }, false)

    mutate("/api/phone-status", (current: any[] = []) => {
      const existing = current.find(s => s.studentId === pass.studentId)
      return existing
        ? current.map(s => s.studentId === pass.studentId ? { ...s, status: "IN" } : s)
        : [...current, { studentId: pass.studentId, status: "IN" }]
    }, false)

    try {
      const res = await fetch(`/api/special-pass/return/${passId}`, { method: "POST" })
      if (!res.ok) throw new Error("Failed")

      toast.success("Pass Completed")

      // Background sync without killing the optimistic state
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
    } catch (e) {
      // Revert on failure
      mutate("/api/special-pass/all")
      mutate("/api/phone-status")
      toast.error("Failed to return pass")
    } finally {
      setReturningPassId(null)
    }
  }

  const handleActivatePhone = async (studentId: number, phoneName: string) => {
    try {
      const res = await fetch(`/api/students`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, phone_name: phoneName })
      })
      if (!res.ok) throw new Error("Failed to activate phone")
      toast.success("Phone activated successfully")
      mutate("/api/students")
    } catch (e) {
      toast.error("Failed to activate phone")
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
    param: "phone-pass" | "phone-in" | "phone-out" | "all-students" | "nill"
  }) => {
    const isActive = activeTab === param
    return (
      <div
        onClick={() => setActiveTab(param)}
        className={`rounded-2xl p-3 min-w-[90px] flex-1 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.98] border
          ${isActive
            ? "bg-[#0ca643] border-[#0ca643] shadow-md shadow-green-600/20"
            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
          }`}
      >
        <span className={`text-xl font-bold ${isActive ? "text-white" : "text-slate-800"}`}>
          {count}
        </span>
        <span className={`text-[11px] font-semibold mt-0.5 tracking-wide ${isActive ? "text-green-50" : "text-slate-500"}`}>
          {title}
        </span>
        {subtitle && (
          <span className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${isActive ? "text-green-100/80" : "text-slate-400"}`}>
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
                  onClick={() => router.push(`/admin/special-pass/grant/${s.id}`)}
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
        <div onClick={() => router.push("/phone-pass-menu")} className="flex items-center gap-2 cursor-pointer group hover:opacity-80 transition-opacity">
          <Button variant="ghost" size="icon" asChild className="-ml-2 text-gray-800 rounded-xl pointer-events-none">
            <div><ChevronLeft className="h-6 w-6" /></div>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 pointer-events-none">Phone Pass</h1>
        </div>
        <div className="flex items-center gap-2.5">
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

      {showMenu && (
        <div className="fixed inset-x-0 top-[64px] z-40 bg-white border-b border-gray-100 shadow-xl shadow-gray-200/20 px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <Link href="/admin/manage-students" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-green-50 cursor-pointer transition-colors text-gray-700 hover:text-green-800">
              <GraduationCap className="h-5 w-5" />
              <span className="font-bold text-sm">Students</span>
            </div>
          </Link>
          <Link href="/special-pass" onClick={() => setShowMenu(false)}>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-green-50 cursor-pointer text-green-700">
              <Ticket className="h-5 w-5" />
              <span className="font-bold text-sm">Phone Pass</span>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-7">

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search passes..."
            className="pl-10 h-11 rounded-xl bg-white border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-sm focus:ring-2 focus:ring-slate-100 transition-shadow transition-colors placeholder:text-slate-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x">
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Phone Pass" subtitle="" count={stats.phonePass} param="phone-pass" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Phone In" subtitle="" count={stats.phoneIn} param="phone-in" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Phone Out" subtitle="" count={stats.phoneOut} param="phone-out" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="All Students" subtitle="" count={stats.allStudents} param="all-students" />
          </div>
          <div className="snap-start shrink-0 flex-1 min-w-[100px]">
            <StatCard title="Non Active" subtitle="" count={stats.nillCount} param="nill" />
          </div>
        </div>

        <div className="h-px bg-gray-200 w-full rounded-full"></div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {filteredList.length}
              {activeTab === "phone-pass" ? " Passes Found" : " Students Found"}
            </h2>
          </div>

          {activeTab === "phone-pass" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-xl border-slate-200 text-slate-700 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] focus:ring-slate-100 font-medium text-sm block"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-xl border-slate-200 text-slate-700 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] focus:ring-slate-100 font-medium text-sm block"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Class</label>
                <Select value={passFilterClass} onValueChange={setPassFilterClass}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 text-slate-700 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] focus:ring-slate-100 font-medium text-sm">
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="all" className="rounded-md">All Classes</SelectItem>
                    {passClasses.filter((c: string) => c !== "all").map((c: string) => (
                      <SelectItem key={c} value={c} className="rounded-md">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-2">
          {passesLoading || studentLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">No records found.</div>
          ) : filteredList.map((item: any) => {
            const isStudent = item.type === "student"
            const currentStatus = item.status || "IN"
            const isActive = currentStatus === "ACTIVE"
            const isOut = currentStatus === "OUT"
            const isCompleted = currentStatus === "COMPLETED"
            // If they are a student, they are "not issued" only if they don't have an active pass (status is IN)
            const isNotIssued = isStudent && (!item.issueTime || currentStatus === "IN")

            let displayTime = "-"
            if (item.issueTime) {
              try {
                displayTime = format(new Date(item.issueTime), "dd MMM • hh:mm a")
              } catch (e) { }
            }

            let remarksText = "-"
            if (item.purpose) {
              remarksText = item.purpose.replace("PHONE:", "").trim()
            } else if (isStudent && isNotIssued) {
              remarksText = ""
            }

            return (
              <div key={item.id} className="bg-[#f8fcf9] rounded-[24px] p-5 sm:p-6 border border-green-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-bold text-[#0ca643] text-lg uppercase tracking-tight pr-4">{item.studentName}</h3>
                  <div className={`px-3 py-0.5 rounded-full border text-xs font-semibold lowercase
                       ${isNotIssued ? 'border-orange-500 text-orange-500' :
                      (isActive ? 'border-amber-500 text-amber-500' :
                        (isOut ? 'border-red-500 text-red-500' :
                          (isCompleted ? 'border-gray-300 text-gray-500' : 'border-gray-400 text-gray-600')))}`}>
                    {isNotIssued ? "not issued" : (isStudent ? (isOut ? "out" : (isActive ? "active" : "in")) : (isCompleted ? "returned" : (isOut ? "out" : (isActive ? "active" : "active"))))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Student ID</p>
                    <p className="font-bold text-slate-800 text-[15px]">{item.admissionNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-1">Phone</p>
                    <p className="font-bold text-slate-800 text-[15px] uppercase">{item.phoneName || item.phoneNumber || "-"}</p>
                  </div>

                  {isStudent && (
                    <>
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-slate-400 mb-1">Class / Locker No</p>
                        <p className="font-bold text-slate-800 text-[15px] uppercase">{item.className || "None"} • L:{item.lockerNumber || "None"}</p>
                      </div>
                    </>
                  )}

                  {!isStudent && item.issueTime && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-400 mb-1">Out Time</p>
                      <p className="font-bold text-slate-800 text-[15px]">{displayTime}</p>
                    </div>
                  )}

                  {!isStudent && item.purpose && (
                    <div className="col-span-2">
                      <p className="text-xs font-medium text-slate-400 mb-1">Remarks</p>
                      <p className="font-bold text-slate-800 text-[15px] uppercase">{remarksText}</p>
                    </div>
                  )}
                </div>

                {!isStudent && !isCompleted && (
                  <div className="flex justify-end items-center gap-3 mt-6 pt-2">
                    <div className="flex gap-3">
                      <div className={`px-6 py-2.5 rounded-full border-2 font-bold text-sm uppercase tracking-wide
                             ${isOut ? 'border-red-400 text-red-500' : (isActive ? 'border-amber-400 text-amber-500' : 'border-green-400 text-green-600')}`}>
                        {isOut ? "OUT" : (isActive ? "ACTIVE" : "IN")}
                      </div>
                      <Button
                        onClick={() => isOut ? handleSubmitIn(item.originalId) : handleSubmitOut(item.originalId)}
                        disabled={returningPassId === item.originalId}
                        className="px-6 py-2.5 h-auto rounded-full bg-[#0ca643] hover:bg-green-700 text-white font-bold text-sm shadow-none transition-transform active:scale-95 border-none"
                      >
                        {isOut ? "Submit In" : "Submit Out"}
                      </Button>
                    </div>
                  </div>
                )}

                {isStudent && canGrantPass && !item.hasNoPhone && (
                  <div className="flex gap-3 mt-6 pt-2 justify-end">
                    {isOut ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const activePass = passes.find((p: any) => p.studentId === item.originalId && (!p.returnTime || p.status === 'OUT' || p.status === 'ACTIVE'));
                          if (activePass) {
                            handleSubmitIn(activePass.id);
                          } else {
                            toast.error("Active pass record not found");
                          }
                        }}
                        disabled={returningPassId === item.originalId}
                        className="px-6 py-2.5 h-auto rounded-full bg-white border-2 border-green-400 text-green-600 hover:bg-green-50 font-bold text-sm shadow-none transition-transform active:scale-95"
                      >
                        Submit In
                      </Button>
                    ) : isActive ? (
                      <Button
                        onClick={() => {
                          const activePass = passes.find((p: any) => p.studentId === item.originalId && (p.status === 'ACTIVE' || p.status === 'PENDING'));
                          if (activePass) {
                            handleSubmitOut(activePass.id);
                          } else {
                            toast.error("Active pass record not found");
                          }
                        }}
                        disabled={returningPassId === item.originalId}
                        className="px-6 py-2.5 h-auto rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-none transition-transform active:scale-95 border-none"
                      >
                        Submit Out
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push(`/admin/special-pass/grant/${item.originalId}`)}
                        className="px-6 py-2.5 h-auto rounded-full bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm shadow-none transition-transform active:scale-95 border-none"
                      >
                        Issue Pass
                      </Button>
                    )}
                  </div>
                )}
                {isStudent && canGrantPass && item.hasNoPhone && activeTab === "nill" && (
                  <div className="flex gap-3 mt-6 pt-2 justify-end">
                    <Button
                      onClick={() => {
                        setActivatingStudent(item)
                        setActivatePhoneModel("")
                      }}
                      className="px-6 py-2.5 h-auto rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-none transition-transform active:scale-95 border-none"
                    >
                      Activate Phone
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Activate Phone Modal */}
      <Dialog open={!!activatingStudent} onOpenChange={(open) => !open && setActivatingStudent(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">Activate Phone</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Enter phone model for {activatingStudent?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Phone Model</label>
              <Input
                placeholder="e.g. iPhone 13"
                value={activatePhoneModel}
                onChange={(e) => setActivatePhoneModel(e.target.value)}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
              <Button onClick={() => setActivatingStudent(null)} variant="outline" className="flex-1 h-11 rounded-xl font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-none transition-colors">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const phone = activatePhoneModel.trim()
                  if (phone && phone.toLowerCase() !== "nil" && phone.toLowerCase() !== "nill") {
                    handleActivatePhone(activatingStudent.originalId, phone)
                    setActivatingStudent(null)
                  } else {
                    toast.error("Invalid phone name. Must not be empty or Nil.")
                  }
                }}
                className="flex-1 h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-none transition-colors"
              >
                Activate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SpecialPassPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#0ca643]" />
      </div>
    }>
      <SpecialPassContent />
    </Suspense>
  )
}
