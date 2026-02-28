"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Search, Check, Users, AlertCircle, Loader2, Sparkles, Star, Plus, Minus } from "lucide-react"
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

  const handleStudentToggle = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const selectAllVisible = () => {
    const allVisibleSelected = filteredStudents.every(s => selectedStudents.has(s.id))
    const newSelected = new Set(selectedStudents)

    if (allVisibleSelected && filteredStudents.length > 0) {
      filteredStudents.forEach(s => newSelected.delete(s.id))
    } else {
      filteredStudents.forEach(s => newSelected.add(s.id))
    }

    setSelectedStudents(newSelected)
  }

  const handleAwardStars = async () => {
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

          if (response.ok) {
            successCount++
          } else {
            const errData = await response.json()
            errorList.push(`Student ${studentId}: ${errData.error || 'Failed to award'}`)
          }
        } catch (err: any) {
          errorList.push(`Student ${studentId}: ${err.message}`)
        }
      }

      if (successCount > 0) {
        toast.success(`✅ Stars awarded to ${successCount} student(s)!`)
        setSelectedStudents(new Set())
        setStarsToAdd(1)
        setNote("")
        setSearch("")

        setTimeout(() => {
          router.push("/admin/rewards/stars")
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative bg-[#f8fafc] overflow-x-hidden font-sans pb-32">
      {/* Background Orbs indicating a glassmorphic modern design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-yellow-300/30 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-amber-300/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-orange-300/20 blur-[120px]" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/70 border-b border-yellow-100/50 shadow-sm transition-all">
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
                  Award Stars
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
                  <div className="w-10 h-10 rounded-2xl bg-amber-100/80 flex items-center justify-center border border-amber-200/50">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 leading-tight">1. Select Students</h2>
                    <p className="text-sm text-gray-500 font-medium">Reward individuals with stars</p>
                  </div>
                </div>
                {selectedStudents.size > 0 && (
                  <div className="bg-amber-500 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md shadow-amber-200 border border-amber-400 animate-in fade-in zoom-in">
                    {selectedStudents.size} Selected
                  </div>
                )}
              </div>

              <div className="space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                      placeholder="Search name or ID..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-11 h-12 rounded-xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-amber-100 shadow-sm transition-all text-base"
                    />
                  </div>
                  <select
                    value={classFilter}
                    onChange={(e) => handleClassFilter(e.target.value)}
                    className="h-12 px-4 rounded-xl border border-gray-200 bg-white/50 hover:bg-amber-50 focus:ring-2 focus:ring-amber-200 outline-none shadow-sm text-gray-700 font-medium"
                  >
                    <option value="all">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    onClick={selectAllVisible}
                    disabled={loading || filteredStudents.length === 0}
                    className="h-12 rounded-xl border-gray-200 bg-white/50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 shadow-sm shrink-0"
                  >
                    {filteredStudents.every(s => selectedStudents.has(s.id)) && filteredStudents.length > 0 ? 'Deselect List' : 'Select List'}
                  </Button>
                </div>

                <div className="rounded-2xl bg-gray-50/50 border border-gray-100/80 p-2 overflow-hidden flex flex-col">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 opacity-70">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                      <p className="text-sm font-medium text-gray-600 tracking-wide">Fetching students...</p>
                    </div>
                  ) : (
                    <div className="max-h-[310px] overflow-y-auto pr-2 space-y-2 custom-scrollbar p-1">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                          <Users className="w-10 h-10 mb-3 opacity-30 text-amber-400" />
                          <p className="text-base font-medium text-gray-600">No students matched.</p>
                          <p className="text-sm mt-1">Try a different search or filter.</p>
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className={`group relative flex items-center p-3 sm:p-4 cursor-pointer rounded-2xl transition-all duration-300 border ${selectedStudents.has(student.id)
                              ? "bg-white border-yellow-200 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.15)] ring-1 ring-yellow-50 scale-[1.01] z-10"
                              : "bg-white/60 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm"
                              }`}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <p className={`text-base font-bold truncate transition-colors ${selectedStudents.has(student.id) ? 'text-amber-900' : 'text-gray-900 group-hover:text-amber-700'}`}>
                                {student.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="inline-flex items-center rounded-md bg-gray-100/80 px-2 py-0.5 text-xs font-semibold text-gray-600 border border-gray-200/50">
                                  ID: {student.admission_number || "N/A"}
                                </span>
                                {student.class_name && (
                                  <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-xs font-semibold text-yellow-700 border border-yellow-100/50">
                                    {student.class_name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="ml-auto shrink-0 relative flex items-center">
                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${selectedStudents.has(student.id)
                                ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-200/50 border border-yellow-400"
                                : "bg-white border-2 border-gray-300 group-hover:border-yellow-300"
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
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Configure Reward */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white isolate shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 lg:sticky lg:top-28">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-yellow-100/80 flex items-center justify-center border border-yellow-200/50">
                  <Star className="w-5 h-5 text-yellow-600 fill-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">2. Award Details</h2>
                  <p className="text-sm text-gray-500 font-medium">Configure star rewards</p>
                </div>
              </div>

              <div className="space-y-6 pt-2">

                <div className="bg-white/50 backdrop-blur border border-white p-4 sm:p-6 rounded-2xl shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-4 tracking-wide uppercase">Number of Stars to Award</label>
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setStarsToAdd(Math.max(1, starsToAdd - 1))}
                      className="h-14 w-14 rounded-2xl border-gray-200 bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm"
                    >
                      <Minus className="w-5 h-5" />
                    </Button>

                    <div className="flex-1 relative flex justify-center">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={starsToAdd}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          setStarsToAdd(Math.max(1, Math.min(10, val)))
                        }}
                        className="text-center h-16 w-full text-3xl font-black text-amber-600 bg-amber-50/50 border-amber-100 rounded-2xl focus:ring-amber-200 hide-arrows"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setStarsToAdd(Math.min(10, starsToAdd + 1))}
                      className="h-14 w-14 rounded-2xl border-gray-200 bg-white hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors shadow-sm"
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="mt-4 flex justify-center flex-wrap gap-1">
                    {[...Array(starsToAdd)].map((_, i) => (
                      <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400 animate-in zoom-in slide-in-from-bottom flex-shrink-0" style={{ animationDelay: `${i * 50}ms` }} />
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <label className="text-sm font-semibold text-gray-700 pl-1 mb-2 block">Reason <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <textarea
                    placeholder="Why are you awarding these stars?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 border border-white shadow-sm focus:bg-white focus:ring-2 focus:ring-amber-100 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400 min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Floating Action Mobile/Desktop Footer */}
      <div className={`fixed bottom-0 left-0 right-0 lg:bottom-6 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-[70rem] z-50 transition-transform duration-500 ${selectedStudents.size > 0 && starsToAdd > 0 ? 'translate-y-0' : 'translate-y-full lg:translate-y-[150%]'} pointer-events-none`}>
        <div className="w-full sm:w-auto mx-auto px-4 pb-4 lg:p-0 pointer-events-auto">
          <div className="backdrop-blur-2xl bg-white/85 border border-white/60 sm:rounded-3xl rounded-2xl p-4 lg:px-6 lg:py-5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] lg:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 bg-gradient-to-r from-white/90 to-amber-50/50">

            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-yellow-200 to-amber-300 flex items-center justify-center border border-amber-300/50 shrink-0 shadow-inner">
                <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-700 fill-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider">Total Stars</p>
                  <span className="inline-flex bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                  <span className="text-amber-500">⭐ {selectedStudents.size * starsToAdd}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto shrink-0">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="hidden sm:flex rounded-2xl hover:bg-white/50 h-12 sm:h-14 font-semibold text-gray-600 px-6 border border-transparent hover:border-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAwardStars}
                disabled={isSubmitting || starsToAdd < 1 || selectedStudents.size === 0}
                className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-600 hover:via-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-300 border border-amber-500/50 h-12 sm:h-14 px-8 font-bold text-base sm:text-lg transition-all active:scale-95 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative flex items-center justify-center z-10 w-full">
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 sm:w-6 sm:h-6 mr-3 animate-spin" /> Processing</>
                  ) : (
                    <><Sparkles className="w-5 h-5 sm:w-6 sm:h-6 mr-3" /> Award {starsToAdd} Star{starsToAdd !== 1 ? 's' : ''}</>
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
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield;
        }
      `}} />
    </div>
  )
}
