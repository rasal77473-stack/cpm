"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Star, LogOut, CheckCircle, XCircle } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AdminSpecialPassPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")

  const { data: studentsData = [], isLoading } = useSWR("/api/students", fetcher)
  const students = Array.isArray(studentsData) ? studentsData : []

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const permissions = JSON.parse(localStorage.getItem("permissions") || "[]")
    if (!token || (role !== "admin" && !permissions.includes("manage_special_pass"))) {
      router.push("/login")
      return
    }
    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router])

  const classes = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s: any) => { if (s.class_name) set.add(s.class_name) })
    return ["all", ...Array.from(set).sort()]
  }, [students])

  const filteredStudents = useMemo(() => {
    let filtered = students
    if (selectedClass !== "all") {
      filtered = filtered.filter((s: any) => s.class_name === selectedClass)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((s: any) => 
        s.name.toLowerCase().includes(q) || 
        s.admission_number.toLowerCase().includes(q) || 
        s.locker_number.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [students, searchQuery, selectedClass])

  const toggleSpecialPass = async (studentId: number, currentPass: string) => {
    const newPass = currentPass === "YES" ? "NO" : "YES"
    
    try {
      const response = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: studentId,
          special_pass: newPass 
        }),
      })

      if (!response.ok) throw new Error("Failed to update special pass")
      
      toast.success(`Special pass ${newPass === "YES" ? "granted" : "revoked"} successfully`)
      mutate("/api/students")
    } catch (error) {
      toast.error("Failed to update special pass")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
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
              onClick={() => router.push("/admin")}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Special Passes</h1>
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
            <CardTitle>Student Authorization</CardTitle>
            <CardDescription>Grant or revoke special phone permissions for students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission number, or locker..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full md:w-48 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Classes</option>
                {classes.filter(c => c !== "all").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Student Name</th>
                    <th className="text-left py-3 px-4 font-medium">Adm No.</th>
                    <th className="text-left py-3 px-4 font-medium">Class</th>
                    <th className="text-left py-3 px-4 font-medium">Locker</th>
                    <th className="text-center py-3 px-4 font-medium">Special Pass</th>
                    <th className="text-right py-3 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No students found</td></tr>
                  ) : (
                    filteredStudents.map((student: any) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          {student.name}
                          {student.special_pass === "YES" && <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{student.admission_number}</td>
                        <td className="py-3 px-4 text-muted-foreground">{student.class_name || "-"}</td>
                        <td className="py-3 px-4 text-muted-foreground">{student.locker_number}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            student.special_pass === "YES" 
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {student.special_pass || "NO"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant={student.special_pass === "YES" ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleSpecialPass(student.id, student.special_pass)}
                            className="gap-2"
                          >
                            {student.special_pass === "YES" ? (
                              <><XCircle className="w-4 h-4" /> Revoke</>
                            ) : (
                              <><CheckCircle className="w-4 h-4" /> Grant</>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
