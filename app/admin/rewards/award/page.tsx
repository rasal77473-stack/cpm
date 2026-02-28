"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, Search, Star, LogOut } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"
import { BackToDashboard } from "@/components/back-to-dashboard"

interface Student {
  id: number
  name: string
  admission_number: string
  class_name: string | null
}

export default function AwardStarPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [awardingStudentId, setAwardingStudentId] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    fetchStudents()
  }, [router])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/students")
      if (!res.ok) throw new Error("Failed to fetch students")
      const data: Student[] = await res.json()
      setStudents(data || [])
      setFilteredStudents(data || [])
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    const query = value.toLowerCase()
    const filtered = students.filter((student) =>
      student.name.toLowerCase().includes(query) ||
      student.admission_number.toLowerCase().includes(query)
    )
    setFilteredStudents(filtered)
  }

  const awardStar = async (studentId: number, studentName: string) => {
    try {
      setAwardingStudentId(studentId)
      const token = localStorage.getItem("token")

      const res = await fetch(`/api/students/${studentId}/stars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "award",
          stars: 1,
          awardedBy: parseInt(localStorage.getItem("staffId") || "0"),
          awardedByName: staffName,
          reason: "Awarded for good behavior",
        }),
      })

      if (res.ok) {
        toast.success(`⭐ Star awarded to ${studentName}!`)
        fetchStudents()
        setSearch("")
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to award star")
      }
    } catch (error) {
      console.error("Error awarding star:", error)
      toast.error("Failed to award star")
    } finally {
      setAwardingStudentId(null)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
    </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="w-full px-4 md:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <BackToDashboard />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Award Star</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 w-auto text-sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full px-4 md:px-6 py-6 md:py-8 max-w-4xl mx-auto">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search student by name or admission number..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>{search ? "No students found" : "No students available"}</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <Card key={student.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                      <p className="text-sm text-gray-600 truncate">
                        {student.admission_number} • {student.class_name || "N/A"}
                      </p>
                    </div>
                    <Button
                      onClick={() => awardStar(student.id, student.name)}
                      disabled={awardingStudentId === student.id}
                      className="gap-2 bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                    >
                      <Star className="w-4 h-4" />
                      Award Star
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
