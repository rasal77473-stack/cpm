"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, LogOut, Search, Check, X, Loader2 } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

interface FineType {
  id: number
  name: string
  amount: number
  description?: string
}

interface Student {
  id: number
  name: string
  admission_number: string
  class_name?: string
}

export default function AddFinePage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fine selection
  const [fines, setFines] = useState<FineType[]>([])
  const [selectedFine, setSelectedFine] = useState<FineType | null>(null)
  const [fineSearch, setFineSearch] = useState("")
  const [fineReason, setFineReason] = useState("")

  // Student selection
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [studentSearch, setStudentSearch] = useState("")
  const [studentPage, setStudentPage] = useState(1)
  const [studentPagination, setStudentPagination] = useState({ total: 0, totalPages: 0, hasMore: false })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")
    const id = localStorage.getItem("staffId")

    if (!token) {
      router.replace("/login")
      return
    }

    setStaffName(name || "Staff")
    setStaffId(id || "")
    fetchFines()
    fetchStudents(1) // Load students on initial page load
  }, [router])

  const fetchFines = async () => {
    try {
      const res = await fetch("/api/fines/all")
      if (!res.ok) throw new Error("Failed to fetch fines")
      const data = await res.json()
      setFines(data)
    } catch (error) {
      console.error("Failed to fetch fines:", error)
      toast.error("Failed to load fine types")
    }
  }

  const fetchStudents = async (page: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append("page", String(page))
      if (studentSearch) params.append("search", studentSearch)

      const res = await fetch(`/api/students/paginated?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch students")

      const data = await res.json()
      setStudents(data.data)
      setStudentPagination(data.pagination)
      setStudentPage(page)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast.error("Failed to load students")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents(1)
    }, 300) // Debounce search
    return () => clearTimeout(timeoutId)
  }, [studentSearch])

  const handleStudentToggle = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleSubmit = async () => {
    if (!selectedFine) {
      toast.error("Please select a fine type")
      return
    }

    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/fines/apply-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          fineId: selectedFine.id,
          amount: selectedFine.amount,
          fineName: selectedFine.name,
          reason: fineReason || null,
          issuedByName: staffName,
          issuedById: parseInt(staffId),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      const data = await res.json()
      toast.success(data.message)
      
      // Reset form
      setSelectedFine(null)
      setFineReason("")
      setSelectedStudents(new Set())
      setStudentSearch("")
      setStudentPage(1)
      
      // Redirect after 1 second
      setTimeout(() => router.push("/admin/fine"), 1000)
    } catch (error) {
      console.error("Failed to apply fines:", error)
      toast.error(error instanceof Error ? error.message : "Failed to apply fines")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredFines = fines.filter(
    (fine) =>
      fine.name.toLowerCase().includes(fineSearch.toLowerCase()) ||
      fine.description?.toLowerCase().includes(fineSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Add Fine to Students</h1>
                <p className="text-sm text-gray-600">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Fine Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Fine Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search fines..."
                    value={fineSearch}
                    onChange={(e) => setFineSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredFines.map((fine) => (
                    <button
                      key={fine.id}
                      onClick={() => setSelectedFine(fine)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedFine?.id === fine.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{fine.name}</p>
                      <p className="text-sm text-gray-600">₹{fine.amount.toFixed(2)}</p>
                      {fine.description && (
                        <p className="text-xs text-gray-500 mt-1">{fine.description}</p>
                      )}
                    </button>
                  ))}
                </div>

                {selectedFine && (
                  <>
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</p>
                      <textarea
                        placeholder="Reason or notes..."
                        value={fineReason}
                        onChange={(e) => setFineReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Student Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Select Students</CardTitle>
                  <span className="text-sm text-gray-600">
                    {selectedStudents.size} selected / {studentPagination.total} total
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or admission number..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                    <p className="text-sm text-gray-600 mt-2">Loading students...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4">
                      {students.map((student) => (
                        <label key={student.id} className="flex items-center p-3 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedStudents.has(student.id)}
                            onChange={() => handleStudentToggle(student.id)}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium text-gray-900">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.admission_number || "-"}</p>
                          </div>
                          {student.class_name && <span className="text-xs text-gray-500">{student.class_name}</span>}
                        </label>
                      ))}
                    </div>

                    {/* Pagination */}
                    {studentPagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(studentPage - 1)}
                          disabled={studentPage === 1 || loading}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {studentPage} of {studentPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(studentPage + 1)}
                          disabled={!studentPagination.hasMore || loading}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit Section */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Fine Type</p>
                <p className="font-semibold text-gray-900">{selectedFine?.name || "None selected"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount per Student</p>
                <p className="font-semibold text-gray-900">
                  {selectedFine ? `₹${selectedFine.amount.toFixed(2)}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Fine Amount</p>
                <p className="font-semibold text-lg text-green-600">
                  {selectedFine ? `₹${(selectedFine.amount * selectedStudents.size).toFixed(2)}` : "—"}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => router.back()} disabled={submitting} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedFine || selectedStudents.size === 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying Fine to {selectedStudents.size} Student{selectedStudents.size !== 1 ? "s" : ""}...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Apply Fine to {selectedStudents.size} Student{selectedStudents.size !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
