"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Star, LogOut, Phone, Loader2, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SpecialPassPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [togglingStudentId, setTogglingStudentId] = useState<number | null>(null)
  const [buttonStates, setButtonStates] = useState<Record<number, "IN" | "OUT">>({})

  const { data: studentsData = [], isLoading, error: studentsError } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000,
  })
  
  const students = Array.isArray(studentsData) ? studentsData : []

  const { data: phoneStatus = {}, error: phoneStatusError } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 15000,
  })

  const { data: allPasses = [], error: passesError } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 15000,
  })

  useEffect(() => {
    if (phoneStatus && Object.keys(phoneStatus).length > 0) {
      const newStates: Record<number, "IN" | "OUT"> = {}
      for (const [key, value] of Object.entries(phoneStatus)) {
        const studentId = parseInt(key)
        const status = value as any
        newStates[studentId] = status?.status || "IN"
      }
      setButtonStates(newStates)
    }
  }, [phoneStatus])

  useEffect(() => {
    if (studentsError) {
      console.error("Error fetching students:", studentsError)
      toast.error("Failed to load students")
    }
  }, [studentsError])

  useEffect(() => {
    if (phoneStatusError) {
      console.error("Error fetching phone status:", phoneStatusError)
      toast.error("Failed to load phone status")
    }
  }, [phoneStatusError])

  useEffect(() => {
    if (passesError) {
      console.error("Error fetching special passes:", passesError)
    }
  }, [passesError])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router])

  const handleTogglePhoneStatus = async (studentId: number, currentStatus: string) => {
    setTogglingStudentId(studentId)
    const newStatus = currentStatus === "IN" ? "OUT" : "IN"
    
    // Update button state immediately
    setButtonStates(prev => ({
      ...prev,
      [studentId]: newStatus
    }))

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
      mutate("/api/phone-status")
    } catch (error) {
      // Revert on error
      setButtonStates(prev => ({
        ...prev,
        [studentId]: currentStatus as "IN" | "OUT"
      }))
      toast.error("Update failed. Reverting...")
    } finally {
      setTogglingStudentId(null)
    }
  }

  const specialStudents = useMemo(() => {
    return students.filter((s: any) => s.special_pass === "YES")
  }, [students])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return specialStudents
    const q = searchQuery.toLowerCase()
    return specialStudents.filter((s: any) => 
      s.name.toLowerCase().includes(q) || 
      s.admission_number.toLowerCase().includes(q) || 
      s.locker_number.toLowerCase().includes(q)
    )
  }, [specialStudents, searchQuery])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Special Pass Students</h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Special Pass Students</CardTitle>
            <CardDescription>Only students with administration authorization are shown here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, admission number, or locker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authorized Students ({filteredStudents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No matching students found" : "No students have a special pass yet"}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student: any) => (
                  <div
                    key={student.id}
                    className="p-5 rounded-2xl border border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                          {student.name}
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        </h3>
                        <p className="text-sm text-muted-foreground">Adm: {student.admission_number}</p>
                      </div>
                      <div className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                        Authorized
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Locker:</span>
                        <span className="font-medium">{student.locker_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Class:</span>
                        <span className="font-medium">{student.class_name || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Roll:</span>
                        <span className="font-medium">{student.roll_no || "-"}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-yellow-200 dark:border-yellow-800">
                        <span className="text-muted-foreground font-bold">Phone:</span>
                        <span className="font-bold text-yellow-700 dark:text-yellow-400">{student.phone_name || "Nill"}</span>
                      </div>
                    </div>
                    
                    {/* Submit Out Button */}
                    <div className="mt-4">
                      {(() => {
                        const phoneVal = (student.phone_name || "").toLowerCase().trim()
                        const hasNoPhone = !phoneVal || phoneVal === "nill" || phoneVal === "nil" || phoneVal === "none" || phoneVal === "-"

                        if (hasNoPhone) return null

                        const currentButtonState = buttonStates[student.id]
                        const isPhoneIn = currentButtonState === "IN"
                        const isToggling = togglingStudentId === student.id

                        return (
                          <Button
                            onClick={() => handleTogglePhoneStatus(student.id, currentButtonState || "IN")}
                            size="sm"
                            className={`w-full rounded-xl font-semibold shadow transition-all duration-300 active:scale-95 ${
                              isPhoneIn 
                                ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
                                : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            }`}
                            disabled={isToggling}
                          >
                            {isToggling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                            <span className="ml-2">{isPhoneIn ? "Submit OUT" : "Submit IN"}</span>
                          </Button>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Special Pass History Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Special Pass History
            </CardTitle>
            <CardDescription>All granted special passes with their submission times and status</CardDescription>
          </CardHeader>
          <CardContent>
            {allPasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No special pass history yet</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Issued Time</TableHead>
                      <TableHead>Return Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPasses.map((pass: any) => (
                      <TableRow key={pass.id}>
                        <TableCell className="font-medium">{pass.studentName}</TableCell>
                        <TableCell>{pass.admissionNumber}</TableCell>
                        <TableCell>{pass.mentorName}</TableCell>
                        <TableCell className="max-w-xs truncate">{pass.purpose}</TableCell>
                        <TableCell>
                          {pass.issueTime ? new Date(pass.issueTime).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          {pass.returnTime ? new Date(pass.returnTime).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {pass.status === "ACTIVE" && (
                              <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Active</span>
                              </>
                            )}
                            {pass.status === "COMPLETED" && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                                <span className="text-sm font-medium text-green-600 dark:text-green-500">Completed</span>
                              </>
                            )}
                            {pass.status === "EXPIRED" && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
                                <span className="text-sm font-medium text-red-600 dark:text-red-500">Expired</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
