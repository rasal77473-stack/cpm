"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Search, ChevronRight } from "lucide-react"
import Link from "next/link"
import { handleLogout } from "@/lib/auth-utils"

interface Student {
  id: number
  name: string
  admission_number: string
  class_name?: string | null
  phone_number?: string | null
}

export default function StudentLookupPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.push("/login")
      return
    }

    setStaffName(name || "Staff")
    fetchStudents()
  }, [router])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()
      setStudents(data)
      setFilteredStudents(data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim() === "") {
      setFilteredStudents(students)
    } else {
      const filtered = students.filter((student) =>
        student.name.toLowerCase().includes(query.toLowerCase()) ||
        student.admission_number.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredStudents(filtered)
    }
  }

  if (!staffName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-900">Student Lookup</h1>
            <p className="text-sm text-gray-600 mt-1">Find and view student records</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Box */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or admission number..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Found {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
        </div>

        {/* Students List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
              <p className="text-gray-500 mt-4">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No students found</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <Link key={student.id} href={`/student-lookup/${student.id}`}>
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      {student.name}
                    </h3>
                    <div className="flex gap-4 mt-1 text-sm text-gray-600">
                      <span>Admission: {student.admission_number}</span>
                      {student.class_name && <span>Class: {student.class_name}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back to Dashboard
          </Button>
        </div>
      </main>
    </div>
  )
}
