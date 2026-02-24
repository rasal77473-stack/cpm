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
  
  // State
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

  // Check authorization on mount
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

  // Fetch students
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

  // Apply filters
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

  // Toggle student selection
  const toggleStudent = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  // Select all students
  const selectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  // Award stars
  const awardStars = async () => {
    console.log("✅ Award Stars button clicked!")
    console.log("Selected students:", Array.from(selectedStudents))
    console.log("Stars to add:", starsToAdd)
    
    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student")
      return
    }

    if (starsToAdd < 1 || starsToAdd > 10) {
      toast.error("Stars must be between 1 and 10")
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem("token")
      const staffId = localStorage.getItem("staffId")

      if (!token || !staffId) {
        toast.error("Not authenticated. Please login again.")
        router.replace("/login")
        return
      }

      const studentIds = Array.from(selectedStudents)
      let successCount = 0
      let errorList: string[] = []

      console.log(`🌟 Awarding ${starsToAdd} stars to ${studentIds.length} student(s)`)

      for (const studentId of studentIds) {
        try {
          const response = await fetch(`/api/students/${studentId}/stars`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "award",
              stars: starsToAdd,
              awardedBy: parseInt(staffId),
              awardedByName: staffName,
              reason: note || "Star awarded",
            }),
          })

          console.log(`📤 Response from student ${studentId}: ${response.status}`)

          if (response.ok) {
            const data = await response.json()
            console.log(`✅ Success for student ${studentId}:`, data)
            successCount++
          } else {
            const errData = await response.json()
            console.error(`❌ Failed for student ${studentId}:`, errData)
            errorList.push(`Student ${studentId}: ${errData.error || 'Failed to award'}`)
          }
        } catch (err: any) {
          console.error(`💥 Exception for student ${studentId}:`, err)
          errorList.push(`Student ${studentId}: ${err.message}`)
        }
      }

      console.log(`📊 Results: ${successCount} success, ${studentIds.length - successCount} failed`)

      if (successCount > 0) {
        toast.success(`✅ Stars awarded to ${successCount} student(s)!`)
        setSelectedStudents(new Set())
        setStarsToAdd(1)
        setNote("")
        setSearch("")
        
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      }

      if (errorList.length > 0) {
        const msg = errorList.slice(0, 2).join(" | ")
        toast.error(`⚠️ ${msg}`)
      }
    } catch (error: any) {
      console.error("💥 Error:", error)
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
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-gray-100"
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
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Student List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
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
                  <div className="space-y-2">
                    {/* Select All */}
                    <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                        onChange={selectAll}
                        className="w-5 h-5"
                      />
                      Select All ({filteredStudents.length})
                    </label>

                    {/* Student Items */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredStudents.map((student) => (
                        <label
                          key={student.id}
                          className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            onChange={() => toggleStudent(student.id)}
                            className="w-5 h-5 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">
                              {student.admission_number} • {student.class_name || "N/A"}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Award Panel */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="pt-6 space-y-4">
                {/* Stars Count */}
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Stars</label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStarsToAdd(Math.max(1, starsToAdd - 1))}
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={starsToAdd}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1
                        setStarsToAdd(Math.max(1, Math.min(10, val)))
                      }}
                      className="text-center flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStarsToAdd(Math.min(10, starsToAdd + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
                  <textarea
                    placeholder="Why are you awarding these stars?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none h-24"
                  />
                </div>

                {/* Summary */}
                <div className="bg-amber-50 p-4 rounded-lg space-y-2 border border-amber-200">
                  <p className="text-sm font-medium text-gray-900">Summary</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {selectedStudents.size}
                  </p>
                  <p className="text-sm text-gray-600">
                    {starsToAdd} star{starsToAdd !== 1 ? "s" : ""} each
                  </p>
                  <p className="text-sm font-medium text-gray-700">
                    Total: ⭐ {selectedStudents.size * starsToAdd}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/admin/rewards/stars")}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={awardStars}
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
