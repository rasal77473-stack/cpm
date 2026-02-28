"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Search, Check, Users, AlertCircle, Loader2, Sparkles, ClipboardList } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"
import { BackToDashboard } from "@/components/back-to-dashboard"

interface TallyType {
  id: number
  name: string
  type: string
  description?: string
  tallyValue: number
}

interface Student {
  id: number
  name: string
  admission_number: string
  class_name?: string
}

export default function AddTallyPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Tally type selection
  const [tallyTypes, setTallyTypes] = useState<TallyType[]>([])
  const [selectedTally, setSelectedTally] = useState<TallyType | null>(null)
  const [tallySearch, setTallySearch] = useState("")
  const [tallyReason, setTallyReason] = useState("")

  // Student selection
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [studentSearch, setStudentSearch] = useState("")
  const [studentPage, setStudentPage] = useState(1)
  const [studentPagination, setStudentPagination] = useState({ total: 0, totalPages: 0, hasMore: false })
  const [studentLoading, setStudentLoading] = useState(false)

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
    fetchTallyTypes()
    fetchStudents(1, "")
  }, [router])

  const fetchTallyTypes = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tally-types")
      if (!res.ok) throw new Error("Failed to fetch tally types")
      const data = await res.json()
      const normalTallies = data.filter((t: TallyType) => t.type === 'NORMAL')
      setTallyTypes(normalTallies)
    } catch (error) {
      console.error("Failed to fetch tally types:", error)
      toast.error("Failed to load tally types")
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (page: number = 1, search: string = "") => {
    try {
      setStudentLoading(true)
      const params = new URLSearchParams()
      params.append("page", String(page))
      if (search) params.append("search", search)

      const res = await fetch(`/api/students/paginated?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch students")
      }

      const data = await res.json()
      setStudents(data.data || [])
      setStudentPagination(data.pagination || { total: 0, totalPages: 0, hasMore: false })
      setStudentPage(page)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast.error("Failed to load students")
    } finally {
      setStudentLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents(1, studentSearch)
    }, 300)
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

  const selectAllStudentsVisible = () => {
    const allVisibleSelected = students.every(s => selectedStudents.has(s.id))
    const newSelected = new Set(selectedStudents)

    if (allVisibleSelected && students.length > 0) {
      students.forEach(s => newSelected.delete(s.id))
    } else {
      students.forEach(s => newSelected.add(s.id))
    }

    setSelectedStudents(newSelected)
  }

  const handleSubmit = async () => {
    if (!selectedTally) {
      toast.error("Please select a tally type")
      return
    }

    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/tallies/add-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents),
          tallyTypeId: selectedTally.id,
          tallyTypeName: selectedTally.name,
          tallyType: selectedTally.type,
          count: selectedTally.tallyValue || 1, // Use tallyValue as the count
          reason: tallyReason || null,
          issuedByName: staffName,
          issuedById: parseInt(staffId),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast.success(`Tally added to ${selectedStudents.size} student(s)`)

      // Reset form
      setSelectedTally(null)
      setTallyReason("")
      setSelectedStudents(new Set())
      setStudentSearch("")
      setStudentPage(1)
      fetchTallyTypes()

      // Redirect after 1 second
      setTimeout(() => router.push("/admin/tally"), 1000)
    } catch (error) {
      console.error("Failed to add tally:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add tally")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTallies = useMemo(() => {
    return tallyTypes.filter(
      (tally) =>
        tally.name.toLowerCase().includes(tallySearch.toLowerCase()) ||
        tally.description?.toLowerCase().includes(tallySearch.toLowerCase())
    )
  }, [tallyTypes, tallySearch])

  return (
    <div className="min-h-screen relative bg-[#f8fafc] overflow-x-hidden font-sans pb-32">
      {/* Background Orbs indicating a glassmorphic modern design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-300/30 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-300/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-emerald-300/20 blur-[120px]" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/70 border-b border-blue-100/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-xl hover:bg-white/60 bg-white/40 shadow-sm border border-gray-100 transition-transform active:scale-95"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </Button>
              <BackToDashboard />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
                  Add Tallies
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  {staffName}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl gap-2 bg-white/50 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm hidden sm:flex"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">Sign Out</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="rounded-xl bg-white/50 border-gray-200 hover:bg-red-50 hover:text-red-600 sm:hidden"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

          {/* STEP 1: Student Selection */}
          <div className="lg:col-span-7">
            <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-100/80 flex items-center justify-center border border-cyan-200/50">
                    <Users className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">1. Select Students</h2>
                    <p className="text-sm text-gray-500 font-medium">Assign tally to individuals</p>
                  </div>
                </div>
                {selectedStudents.size > 0 && (
                  <div className="bg-blue-600 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md shadow-blue-200 border border-blue-500 animate-in fade-in zoom-in">
                    {selectedStudents.size} Selected
                  </div>
                )}
              </div>

              <div className="space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                    <Input
                      placeholder="Search name or ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-cyan-100 shadow-sm transition-all text-base"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={selectAllStudentsVisible}
                    disabled={studentLoading || students.length === 0}
                    className="h-12 rounded-xl border-gray-200 bg-white/50 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 shadow-sm shrink-0"
                  >
                    {students.every(s => selectedStudents.has(s.id)) && students.length > 0 ? 'Deselect Page' : 'Select Page'}
                  </Button>
                </div>

                <div className="rounded-2xl bg-gray-50/50 border border-gray-100/80 p-2 overflow-hidden flex flex-col">
                  {studentLoading && students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 opacity-70">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
                      <p className="text-sm font-medium text-gray-600 tracking-wide">Fetching students map...</p>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-[310px] overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
                        {students.length === 0 && !studentLoading ? (
                          <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <Users className="w-10 h-10 mb-3 opacity-30 text-cyan-400" />
                            <p className="text-base font-medium text-gray-600">No students matched.</p>
                            <p className="text-sm mt-1">Try a different search term.</p>
                          </div>
                        ) : (
                          students.map((student) => (
                            <label
                              key={student.id}
                              className={`group relative flex items-center p-3 sm:p-4 cursor-pointer rounded-2xl transition-all duration-300 border ${selectedStudents.has(student.id)
                                ? "bg-white border-cyan-200 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.15)] ring-1 ring-cyan-50 scale-[1.01] z-10"
                                : "bg-white/60 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm"
                                }`}
                            >
                              <div className="flex-1 min-w-0 pr-4">
                                <p className={`text-base font-bold truncate transition-colors ${selectedStudents.has(student.id) ? 'text-cyan-900' : 'text-gray-900 group-hover:text-cyan-700'}`}>
                                  {student.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <span className="inline-flex items-center rounded-md bg-gray-100/80 px-2 py-0.5 text-xs font-semibold text-gray-600 border border-gray-200/50">
                                    ID: {student.admission_number || "N/A"}
                                  </span>
                                  {student.class_name && (
                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-100/50">
                                      {student.class_name}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="ml-auto shrink-0 relative flex items-center">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedStudents.has(student.id)
                                  ? "bg-gradient-to-br from-cyan-500 to-blue-500 shadow-md shadow-cyan-200/50 border border-cyan-400"
                                  : "bg-white border-2 border-gray-300 group-hover:border-cyan-300"
                                  }`}>
                                  <Check className={`w-4 h-4 text-white transition-opacity duration-300 ${selectedStudents.has(student.id) ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                                </div>
                                <input
                                  type="checkbox"
                                  className="absolute opacity-0 w-full h-full cursor-pointer"
                                  checked={selectedStudents.has(student.id)}
                                  onChange={() => handleStudentToggle(student.id)}
                                />
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      {/* Pagination block */}
                      {studentPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-200/60 px-2">
                          <Button
                            variant="outline"
                            onClick={() => fetchStudents(studentPage - 1, studentSearch)}
                            disabled={studentPage === 1 || studentLoading}
                            className="bg-white/80 rounded-xl shadow-sm border-gray-200 hover:bg-gray-50 h-10 px-4"
                          >
                            Prev
                          </Button>
                          <span className="text-sm font-semibold text-gray-600 bg-white/60 px-3 py-1.5 rounded-lg">
                            Page {studentPage} of {studentPagination.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => fetchStudents(studentPage + 1, studentSearch)}
                            disabled={!studentPagination.hasMore || studentLoading}
                            className="bg-white/80 rounded-xl shadow-sm border-gray-200 hover:bg-gray-50 h-10 px-4"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Tally Selection */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white isolate shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 lg:sticky lg:top-28">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100/80 flex items-center justify-center border border-blue-200/50">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">2. Select Tally</h2>
                  <p className="text-sm text-gray-500 font-medium">Choose tally type</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search tally types..."
                    value={tallySearch}
                    onChange={(e) => setTallySearch(e.target.value)}
                    className="pl-11 h-12 rounded-xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-blue-100 shadow-sm transition-all text-base"
                  />
                </div>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                    </div>
                  ) : filteredTallies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-50 text-blue-400" />
                      <p className="text-sm font-medium">No tallies found matching criteria.</p>
                    </div>
                  ) : (
                    filteredTallies.map((tally) => (
                      <button
                        key={tally.id}
                        onClick={() => setSelectedTally(tally)}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 relative overflow-hidden group ${selectedTally?.id === tally.id
                          ? "bg-white border-blue-300 shadow-[0_8px_20px_-4px_rgba(59,130,246,0.15)] scale-[1.01]"
                          : "bg-white/40 border-transparent hover:bg-white/70 hover:border-blue-100 hover:scale-[1.01]"
                          }`}
                      >
                        {selectedTally?.id === tally.id && (
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-cyan-500 to-blue-500" />
                        )}
                        <div className="flex justify-between items-start gap-4 pl-1">
                          <div className="flex-1">
                            <h3 className={`font-semibold text-base transition-colors ${selectedTally?.id === tally.id ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-800'}`}>
                              {tally.name}
                            </h3>
                            {tally.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-snug">
                                {tally.description}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 bg-blue-50/80 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-sm border border-blue-100/50 shadow-sm">
                            Count: {tally.tallyValue || 1}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Additional Notes sliding in */}
                <div className={`transition-all duration-300 overflow-hidden ${selectedTally ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <div className="pt-4 border-t border-gray-200/50 space-y-2">
                    <label className="text-sm font-semibold text-gray-700 pl-1">Additional Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
                    <textarea
                      placeholder="Add reason or extra context..."
                      value={tallyReason}
                      onChange={(e) => setTallyReason(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 border border-white shadow-sm focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 min-h-[80px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Floating Action Mobile/Desktop Footer */}
      <div className={`fixed bottom-0 left-0 right-0 lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-[70rem] z-50 transition-transform duration-500 ${selectedStudents.size > 0 && selectedTally ? 'translate-y-0' : 'translate-y-full lg:translate-y-[150%]'} pointer-events-none`}>
        <div className="w-full sm:w-auto mx-auto px-4 pb-4 lg:p-0 pointer-events-auto">
          <div className="backdrop-blur-2xl bg-white/85 border border-white/60 sm:rounded-3xl rounded-2xl p-4 lg:px-6 lg:py-5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] lg:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 bg-gradient-to-r from-white/90 to-blue-50/50">

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center border border-cyan-200/50 shrink-0 shadow-inner">
                <ClipboardList className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider">Tally Action</p>
                  <span className="inline-flex bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
                  {selectedTally?.name || "Ready"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto shrink-0">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hidden sm:flex rounded-2xl hover:bg-white/50 h-12 sm:h-14 font-semibold text-gray-600 px-6 border border-transparent hover:border-gray-200 transition-colors"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !selectedTally || selectedStudents.size === 0}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200 border border-blue-500/50 h-12 sm:h-14 px-8 font-bold text-base sm:text-lg transition-all active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center justify-center z-10 w-full">
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-3 animate-spin" /> Processing</>
                  ) : (
                    <><Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-3" /> Add Tally</>
                  )}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles config for scrollbar if not in globals */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}} />
    </div>
  )
}
