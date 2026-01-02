"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Phone, Loader2, Star } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")
  const [togglingStudentId, setTogglingStudentId] = useState<number | null>(null)

  const { data: studentsData = [], isLoading: loadingStudents } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  })

  const students = Array.isArray(studentsData) ? studentsData : []

  const { data: phoneStatus = {}, isLoading: loadingStatus } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 5000,
    dedupingInterval: 2000,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const { lockers, classes } = useMemo(() => {
    const classSet = new Set<string>()
    const lockerSet = new Set<string>()
    students.forEach((s: any) => {
      if (s.class_name) classSet.add(s.class_name)
      if (s.locker_number) lockerSet.add(s.locker_number)
    })
    return {
      classes: ["all", ...Array.from(classSet).sort()],
      lockers: ["all", ...Array.from(lockerSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))]
    }
  }, [students])

  const filteredStudents = useMemo(() => {
    let filtered = students
    
    if (selectedClass !== "all") {
      filtered = filtered.filter((s: any) => s.class_name === selectedClass)
    }

    if (selectedLocker !== "all") {
      filtered = filtered.filter((s: any) => s.locker_number === selectedLocker)
    }

    if (!searchQuery.trim()) return filtered
    
    const q = searchQuery.toLowerCase()
    return filtered.filter((s: any) => 
      s.name.toLowerCase().includes(q) || 
      s.admission_number.toLowerCase().includes(q) || 
      s.locker_number.toLowerCase().includes(q) ||
      (s.roll_no && s.roll_no.toLowerCase().includes(q))
    )
  }, [students, searchQuery, selectedClass, selectedLocker])

  const handleTogglePhoneStatus = useCallback(async (studentId: number, currentStatus: string) => {
    setTogglingStudentId(studentId)
    const newStatus = currentStatus === "IN" ? "OUT" : "IN"
    
    // Optimistic Update
    const oldStatus = { ...phoneStatus }
    const optimisticStatus = { 
      ...phoneStatus, 
      [studentId]: { 
        status: newStatus, 
        last_updated: new Date().toISOString() 
      } 
    }
    
    // Use mutate with the new data immediately, and set revalidate to false 
    // to prevent an immediate network refresh from overwriting our optimistic state
    mutate("/api/phone-status", optimisticStatus, false)

    try {
      const response = await fetch(`/api/phone-status/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          staffId: localStorage.getItem("staffId"),
          notes: ""
        }),
      })

      if (!response.ok) throw new Error("Failed to update status")
      
      toast.success(`Phone marked as ${newStatus}`)
      // Trigger a silent revalidation in the background
      mutate("/api/phone-status")
    } catch (error) {
      toast.error("Update failed. Reverting...")
      mutate("/api/phone-status", oldStatus, false)
    } finally {
      setTogglingStudentId(null)
    }
  }, [phoneStatus])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    router.push("/login")
  }

  const loading = loadingStudents || (loadingStatus && students.length === 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Caliph Phone Management</h1>
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
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission number, or roll..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex-1 flex flex-col md:flex-row gap-2">
                <div className="w-full md:w-48">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Classes</option>
                    {classes.filter(c => c !== "all").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-48">
                  <select
                    value={selectedLocker}
                    onChange={(e) => setSelectedLocker(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Lockers</option>
                    {lockers.filter(l => l !== "all").map(l => (
                      <option key={l} value={l}>Locker {l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button onClick={() => { setSearchQuery(""); setSelectedClass("all"); setSelectedLocker("all"); }} variant="outline">
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
                {filteredStudents.map((student: any) => {
                  const status = phoneStatus[student.id]
                  const isPhoneIn = status?.status === "IN"
                  const isToggling = togglingStudentId === student.id
                  const phoneVal = (student.phone_name || "").toLowerCase().trim()
                  const hasNoPhone = !phoneVal || phoneVal === "nill" || phoneVal === "nil" || phoneVal === "none" || phoneVal === "-"

                  return (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 ${
                        hasNoPhone ? "bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.2)]" : isPhoneIn ? "led-in" : "led-out"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-foreground tracking-tight">
                          {student.name}
                          {hasNoPhone && <span className="ml-2 text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-800">No Phone (Nill)</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Adm: {student.admission_number}</span>
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Locker: {student.locker_number}</span>
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Class: {student.class_name || "-"}</span>
                          <span className="bg-secondary px-2 py-0.5 rounded-full border border-border/50">Roll: {student.roll_no || "-"}</span>
                          <span className={`bg-secondary px-2 py-0.5 rounded-full border border-border/50 ${hasNoPhone ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}>
                            Ph: {student.phone_name || "Nill"}
                          </span>
                        </div>
                        {student.special_pass === "YES" && (
                          <div className="mt-4">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 gap-2">
                                  <Star className="w-4 h-4 fill-current" />
                                  View Special Pass
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-yellow-600">
                                    <Star className="w-5 h-5 fill-current" />
                                    Special Phone Pass Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    This student has been granted a special phone pass by the administration.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Student Name</p>
                                      <p className="font-medium">{student.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Admission No</p>
                                      <p className="font-medium">{student.admission_number}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Class & Roll</p>
                                      <p className="font-medium">{student.class_name} / {student.roll_no}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Locker No</p>
                                      <p className="font-medium">{student.locker_number}</p>
                                    </div>
                                  </div>
                                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300 font-semibold uppercase tracking-wider mb-1">Authorization Status</p>
                                    <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">VALID PASS GRANTED</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div
                            className={`font-bold px-3 py-1 rounded-full text-xs tracking-wider uppercase shadow-inner ${
                              hasNoPhone
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                                : isPhoneIn
                                ? "bg-green-100/80 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                                : "bg-orange-100/80 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                            }`}
                          >
                            {hasNoPhone ? "NO PHONE" : status?.status || "UNKNOWN"}
                          </div>
                          {status?.last_updated && !hasNoPhone && (
                            <div className="text-[10px] font-medium text-muted-foreground mt-1.5 opacity-70 italic">
                              {new Date(status.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>

                        {!hasNoPhone && (
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
                        )}
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
