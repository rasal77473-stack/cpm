"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Star, LogOut, Phone, Loader2 } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SpecialPassPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [togglingStudentId, setTogglingStudentId] = useState<number | null>(null)

  const { data: studentsData = [], isLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000,
  })
  
  const students = Array.isArray(studentsData) ? studentsData : []

  const { data: phoneStatus = {} } = useSWR("/api/phone-status", fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 15000,
  })

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
    
    // Optimistic Update
    const oldStatus = { ...phoneStatus }
    const optimisticStatus = { 
      ...phoneStatus, 
      [studentId]: { 
        status: newStatus, 
        last_updated: new Date().toISOString() 
      } 
    }
    
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
      mutate("/api/phone-status")
    } catch (error) {
      toast.error("Update failed. Reverting...")
      mutate("/api/phone-status", oldStatus, false)
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
                        const status = phoneStatus[student.id]
                        const isPhoneIn = status?.status === "IN"
                        const isToggling = togglingStudentId === student.id
                        const phoneVal = (student.phone_name || "").toLowerCase().trim()
                        const hasNoPhone = !phoneVal || phoneVal === "nill" || phoneVal === "nil" || phoneVal === "none" || phoneVal === "-"

                        if (hasNoPhone) return null

                        return (
                          <Button
                            onClick={() => handleTogglePhoneStatus(student.id, status?.status)}
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
      </main>
    </div>
  )
}
