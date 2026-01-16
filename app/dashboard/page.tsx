"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, Search, Phone, Loader2, Star, Users } from "lucide-react"
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
  const [specialPassButtonStates, setSpecialPassButtonStates] = useState<Record<number, "OUT" | "IN">>({})

  const { data: studentsData = [], isLoading: loadingStudents } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
  })

  const { data: activePasses = [], isLoading: loadingPasses } = useSWR("/api/special-pass/active", fetcher, {
    refreshInterval: 15000,
    dedupingInterval: 5000,
  })

  useEffect(() => {
    if (activePasses && Array.isArray(activePasses)) {
      const newStates: Record<number, "OUT" | "IN"> = {}
      activePasses.forEach((pass: any) => {
        newStates[pass.id] = pass.status === "OUT" ? "OUT" : "IN"
      })
      // Initialize all passes in button states
      setSpecialPassButtonStates(prev => {
        const updated = { ...prev }
        for (const [id, status] of Object.entries(newStates)) {
          updated[parseInt(id)] = status
        }
        return updated
      })
    }
  }, [activePasses])

  const students = Array.isArray(studentsData) ? studentsData : []

  const { data: phoneStatus = {}, isLoading: loadingStatus } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 10000,
    dedupingInterval: 2000,
  })

  const [permissions, setPermissions] = useState<string[]>([])
  const [specialPass, setSpecialPass] = useState("NO")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setStaffName(localStorage.getItem("staffName") || "Staff")
    setSpecialPass(localStorage.getItem("special_pass") || "NO")
    try {
      const storedPerms = localStorage.getItem("permissions")
      setPermissions(storedPerms ? JSON.parse(storedPerms) : [])
    } catch (e) {
      setPermissions([])
    }
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
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    router.push("/login")
  }

  const handleOutPass = async (grantId: number) => {
    // Update button state INSTANTLY
    setSpecialPassButtonStates(prev => ({
      ...prev,
      [grantId]: "OUT"
    }))
    setTogglingStudentId(grantId)

    try {
      const response = await fetch(`/api/special-pass/out/${grantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark out")
      }

      toast.success("Special pass marked as OUT ✓")
      // Give a moment before refreshing
      setTimeout(() => {
        mutate("/api/special-pass/active")
      }, 500)
    } catch (error) {
      console.error("Out pass error:", error)
      // Revert on error
      setSpecialPassButtonStates(prev => ({
        ...prev,
        [grantId]: "IN"
      }))
      toast.error(error instanceof Error ? error.message : "Failed to mark special pass as OUT")
    } finally {
      setTogglingStudentId(null)
    }
  }

  const handleReturnPass = async (grantId: number) => {
    // Update button state INSTANTLY
    setSpecialPassButtonStates(prev => ({
      ...prev,
      [grantId]: "IN"
    }))
    setTogglingStudentId(grantId)

    try {
      const response = await fetch(`/api/special-pass/return/${grantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to return pass")
      }

      toast.success("Special pass submitted successfully! ✓")
      // Give a moment before refreshing
      setTimeout(() => {
        mutate("/api/special-pass/active")
      }, 500)
    } catch (error) {
      console.error("Return pass error:", error)
      // Revert on error
      setSpecialPassButtonStates(prev => ({
        ...prev,
        [grantId]: "OUT"
      }))
      toast.error(error instanceof Error ? error.message : "Failed to submit special pass")
    } finally {
      setTogglingStudentId(null)
    }
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
          <div className="flex items-center gap-4">
            {(permissions.includes("manage_special_pass") || permissions.includes("manage_users") || specialPass === "YES") && (
              <Button 
                variant="outline" 
                onClick={() => router.push("/admin")}
                className="gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50"
              >
                <Users className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
            {(permissions.includes("manage_special_pass") || permissions.includes("manage_users")) && (
              <Button 
                variant="outline" 
                onClick={() => router.push("/special-pass")}
                className="gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50"
              >
                <Star className="w-4 h-4 fill-current" />
                Special Pass List
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Active Special Passes Section */}
        {activePasses && activePasses.length > 0 && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
                <Star className="w-5 h-5 fill-current" />
                Active Special Passes
              </CardTitle>
              <CardDescription>Students currently authorized for special phone usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePasses.map((pass: any) => (
                  <div key={pass.id} className="p-4 rounded-xl border border-yellow-500/20 bg-card shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold">{pass.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          pass.status === 'OUT' 
                            ? "bg-orange-100 text-orange-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {pass.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Adm: {pass.admissionNumber}</p>
                        <p>Mentor: {pass.mentorName}</p>
                        <p className="font-medium text-yellow-600 dark:text-yellow-400">Return: {pass.returnTime ? new Date(pass.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</p>
                        <p className="italic mt-1 border-t border-yellow-500/10 pt-1 line-clamp-2">{pass.purpose}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {specialPassButtonStates[pass.id] !== 'OUT' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleOutPass(pass.id)}
                          disabled={togglingStudentId === pass.id}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                        >
                          {togglingStudentId === pass.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : null}
                          Submit Out
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleReturnPass(pass.id)}
                          disabled={togglingStudentId === pass.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                        >
                          {togglingStudentId === pass.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : null}
                          Submit In
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Access Actions based on permissions */}
        {(permissions.length > 0 || specialPass === "YES") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {permissions.includes("manage_students") && (
              <Card className="cursor-pointer hover:bg-accent transition-colors border-blue-500/20 bg-blue-500/5 shadow-sm" onClick={() => router.push("/admin/manage-students")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">Manage Students</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Add, edit or import student records</p>
                </CardContent>
              </Card>
            )}
            {(permissions.includes("manage_special_pass") || permissions.includes("view_special_pass_logs")) && (
              <Card className="cursor-pointer hover:bg-accent transition-colors border-yellow-500/20 bg-yellow-500/5 shadow-sm" onClick={() => router.push("/admin/special-pass")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-tight">Special Pass Management</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Grant, revoke or view special phone permissions</p>
                </CardContent>
              </Card>
            )}
            {permissions.includes("manage_users") && (
              <Card className="cursor-pointer hover:bg-accent transition-colors border-purple-500/20 bg-purple-500/5 shadow-sm" onClick={() => router.push("/admin/users")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight">User Management</CardTitle>
                  <Users className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Manage mentors and roles</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
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
                        <div className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                          {student.name}
                          {student.special_pass === "YES" && <Star className="w-4 h-4 fill-current text-yellow-500" />}
                          {hasNoPhone && <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-widest bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 rounded-full border border-yellow-200 dark:border-yellow-800">No Phone (Nill)</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {permissions.includes("manage_special_pass") && student.special_pass !== "YES" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] uppercase font-bold border-yellow-500/50 text-yellow-600 hover:bg-yellow-50"
                              onClick={() => router.push(`/admin/special-pass/grant/${student.id}`)}
                            >
                              Grant Pass
                            </Button>
                          )}
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

                        {permissions.includes("in_out_control") && !hasNoPhone && (
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
