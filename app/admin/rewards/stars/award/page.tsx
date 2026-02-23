"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, LogOut, Search } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

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
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [starsToAdd, setStarsToAdd] = useState(1)
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [classFilter, setClassFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])

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

      const uniqueClasses = [...new Set(data.map((s) => s.class_name).filter(Boolean))]
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (searchQuery: string, classVal: string) => {
    let filtered = students
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q)
      )
    }

    if (classVal !== "all") {
      filtered = filtered.filter((s) => s.class_name === classVal)
    }

    setFilteredStudents(filtered)
  }

  const handleSearch = (value: string) => {
    setSearch(value)
    applyFilters(value, classFilter)
  }

  const handleClassFilter = (value: string) => {
    setClassFilter(value)
    applyFilters(search, value)
  }

  const toggleStudent = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  const handleAwardStars = async () => {
    // TEST: This should log immediately when button is clicked
    console.log("🔴 BUTTON CLICKED - handleAwardStars called!")
    console.log("Selected students:", selectedStudents)
    console.log("Stars to add:", starsToAdd)
    
    if (selectedStudents.size === 0) {
      console.log("⚠️  No students selected!")
      toast.error("Please select at least one student")
      return
    }

    try {
      setIsSubmitting(true)
      const token = localStorage.getItem("token")
      const userId = localStorage.getItem("userId")

      if (!token || !userId) {
        console.log("⚠️  No auth token or userId!")
        toast.error("Authentication error - Please login again")
        setIsSubmitting(false)
        return
      }

      const studentIds = Array.from(selectedStudents)
      let successCount = 0
      let failureCount = 0
      const errors: string[] = []

      console.log(`🌟 Starting to award ${starsToAdd} stars to ${studentIds.length} student(s)`)

      for (const studentId of studentIds) {
        try {
          console.log(`📤 Sending request for student ${studentId}...`)
          
          const res = await fetch(`/api/students/${studentId}/stars`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "award",
              stars: starsToAdd,
              awardedBy: parseInt(userId || "0"),
              awardedByName: staffName,
              reason: note || "Star awarded",
            }),
          })

          const responseText = await res.text()
          console.log(`📥 Response status: ${res.status}`)
          console.log(`📥 Response body: ${responseText}`)

          if (res.ok) {
            try {
              const data = JSON.parse(responseText)
              console.log(`✅ Success for student ${studentId}:`, data)
              successCount++
            } catch (e) {
              console.error(`⚠️  Response parsing error for student ${studentId}:`, e)
              successCount++
            }
          } else {
            try {
              const errorData = JSON.parse(responseText)
              console.error(`❌ Error for student ${studentId}:`, errorData)
              errors.push(`Student ${studentId}: ${errorData.error || 'Unknown error'}`)
            } catch (e) {
              console.error(`❌ Error for student ${studentId}: ${responseText}`)
              errors.push(`Student ${studentId}: ${res.statusText}`)
            }
            failureCount++
          }
        } catch (error) {
          console.error(`💥 Exception for student ${studentId}:`, error)
          errors.push(`Student ${studentId}: ${String(error)}`)
          failureCount++
        }
      }

      console.log(`\n📊 Results: ${successCount} success, ${failureCount} failed`)

      if (successCount > 0) {
        toast.success(`⭐ Stars awarded to ${successCount} student(s)!`)
        setSelectedStudents(new Set())
        setStarsToAdd(1)
        setNote("")
        setSearch("")
        
        console.log('🔄 Refreshing page in 2 seconds...')
        // Refresh the page after a short delay to show updated data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }

      if (failureCount > 0) {
        const errorMsg = errors.slice(0, 3).join('\n')
        toast.error(`Failed to award stars to ${failureCount} student(s)\n${errorMsg}`)
        if (errors.length > 3) {
          console.error('Additional errors:', errors.slice(3))
        }
      }
    } catch (error) {
      console.error("💥 Error awarding stars:", error)
      toast.error("Failed to award stars")
    } finally {
      setIsSubmitting(false)
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/admin/rewards/stars")}
                className="rounded-full flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Award Stars</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2 w-auto text-sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filters */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search by name or admission..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={classFilter}
                  onChange={(e) => handleClassFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Students List */}
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500">Loading students...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No students found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Select All Button */}
                    <div className="flex items-center gap-3 pb-4 border-b">
                      <input
                        type="checkbox"
                        id="select-all"
                        checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                        onChange={selectAll}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Select All ({filteredStudents.length})
                      </label>
                    </div>

                    {/* Students */}
                    {filteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          id={`student-${student.id}`}
                          checked={selectedStudents.has(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="w-5 h-5 rounded cursor-pointer"
                        />
                        <label htmlFor={`student-${student.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500">
                            {student.admission_number} • {student.class_name || "N/A"}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Award Details */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Stars</label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStarsToAdd(Math.max(1, starsToAdd - 1))}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={starsToAdd}
                      onChange={(e) => setStarsToAdd(parseInt(e.target.value) || 1)}
                      className="text-center flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStarsToAdd(Math.min(10, starsToAdd + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
                  <Input
                    placeholder="Why are you awarding these stars?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-24 resize-none"
                  />
                </div>

                <div className="bg-amber-50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-gray-900">Summary</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {selectedStudents.size} Student{selectedStudents.size !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    {starsToAdd} star{starsToAdd !== 1 ? "s" : ""} each
                  </p>
                  <p className="text-sm text-gray-600">
                    Total: {selectedStudents.size * starsToAdd} stars
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/admin/rewards/stars")}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleAwardStars}
                    disabled={isSubmitting || selectedStudents.size === 0}
                  >
                    {isSubmitting ? "Awarding..." : "Award Stars"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
