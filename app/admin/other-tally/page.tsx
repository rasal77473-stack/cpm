"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Plus, Search, Star, Loader2, ClipboardList, TrendingUp, Users, ShieldAlert, Trash2 } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"
import { BackToDashboard } from "@/components/back-to-dashboard"
import { DownloadButton } from "@/components/download-button"

interface StudentTally {
  id: number
  studentId: number
  studentName: string
  studentClass: string | null
  admissionNumber: string
  tallyTypeName: string
  tallyType: string
  count: number
  reason: string | null
  issuedBy: number
  issuedByName: string
  issuedAt: string
}

interface StudentTallyCount {
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  count: number
  rupees: number
  issuedByName: string
  lastDate: string
}

export default function OtherTallyManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [tallies, setTallies] = useState<StudentTally[]>([])
  const [tallyCountMap, setTallyCountMap] = useState<Map<number, StudentTallyCount>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"summary" | "logs">("summary")
  const [awardingStars, setAwardingStars] = useState<number | null>(null)
  const [canDelete, setCanDelete] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      document.cookie="auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;"; window.location.href="/login"
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    const storedRole = localStorage.getItem("role")
    const perms: string[] = JSON.parse(localStorage.getItem("permissions") || "[]")
    setCanDelete(storedRole === "admin" || perms.includes("delete_records"))
    fetchTallies()
  }, [router])

  const fetchTallies = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tallies")
      if (!res.ok) throw new Error("Failed to fetch tallies")
      const data: StudentTally[] = await res.json()
      setTallies(data)

      const countMap = new Map<number, StudentTallyCount>()

      data.forEach((tally) => {
        if (tally.tallyType !== 'FIXED') return // Only FIXED type

        if (!countMap.has(tally.studentId)) {
          countMap.set(tally.studentId, {
            studentId: tally.studentId,
            studentName: tally.studentName,
            admissionNumber: tally.admissionNumber,
            studentClass: tally.studentClass,
            count: 0,
            rupees: 0,
            issuedByName: tally.issuedByName,
            lastDate: tally.issuedAt,
          })
        }

        const entry = countMap.get(tally.studentId)!
        entry.count += tally.count || 1
        entry.rupees = entry.count * 10
        entry.lastDate = tally.issuedAt
      })

      setTallyCountMap(countMap)

      const uniqueClasses = [...new Set(data.map((t) => t.studentClass).filter(Boolean))]
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch tallies:", error)
      toast.error("Failed to load other tallies")
    } finally {
      setLoading(false)
    }
  }

  const awardStar = async (studentId: number, studentName: string) => {
    try {
      setAwardingStars(studentId)
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
          reason: "Awarded by staff - Tally reduction",
        }),
      })

      if (res.ok) {
        toast.success(`⭐ Star awarded to ${studentName}! (Reduces tally by 2)`)
        fetchTallies() // Refresh data after awarding star
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to award star")
      }
    } catch (error) {
      console.error("Error awarding star:", error)
      toast.error("Failed to award star")
    } finally {
      setAwardingStars(null)
    }
  }

  const filteredTallies = useMemo(() => {
    return Array.from(tallyCountMap.values()).filter((tally) => {
      const matchesSearch =
        tally.studentName.toLowerCase().includes(search.toLowerCase()) ||
        tally.admissionNumber.toLowerCase().includes(search.toLowerCase())

      const matchesClass = classFilter === "all" || tally.studentClass === classFilter

      return matchesSearch && matchesClass
    }).sort((a, b) => b.count - a.count)
  }, [tallyCountMap, search, classFilter])

  const totalFilteredTallies = filteredTallies.reduce((sum, t) => sum + t.count, 0);
  const totalFilteredRupees = filteredTallies.reduce((sum, t) => sum + t.rupees, 0);

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen relative bg-[#f8fafc] overflow-x-hidden font-sans pb-24">
      {/* Background Orbs indicating a glassmorphic modern design - Orange Theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-300/20 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-amber-300/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-red-200/20 blur-[120px]" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/70 border-b border-orange-100/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 w-full sm:w-auto mb-2 sm:mb-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-xl hover:bg-white/60 bg-white/40 shadow-sm border border-gray-100 transition-transform active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </Button>
              <BackToDashboard />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight truncate">
                  Other Tallies
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                  {staffName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <DownloadButton
                data={filteredTallies}
                columns={[
                  { key: "studentName", header: "Student Name" },
                  { key: "admissionNumber", header: "Admission No" },
                  { key: "studentClass", header: "Class" },
                  { key: "count", header: "Total Tallies" },
                  { key: "rupees", header: "Fine Amount (₹)" },
                  { key: "lastDate", header: "Last Issued" },
                ]}
                filename="other-tallies"
                title="Other Tallies Report"
              />
              <Link href="/admin/other-tally/manage" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl gap-1.5 bg-white/50 border-gray-200 hover:bg-orange-50 hover:text-orange-700 shadow-sm transition-colors text-sm px-3 sm:px-4">
                  <ClipboardList className="w-4 h-4" />
                  <span>Manage</span>
                </Button>
              </Link>
              <Link href="/admin/other-tally/add" className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto rounded-xl gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-200 transition-all text-sm px-3 sm:px-4 border border-orange-400">
                  <Plus className="w-4 h-4" />
                  <span>Issue</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="icon"
                onClick={handleLogout}
                className="rounded-xl bg-white/50 border-gray-200 hover:bg-red-50 hover:text-red-600 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* KPI Dashboard (Desktop only for cleaner mobile) */}
        <div className="hidden sm:grid grid-cols-3 gap-4 lg:gap-6">
          <div className="rounded-2xl backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200/50 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest text-[10px]">Filtered Students</p>
              <p className="text-2xl font-bold text-gray-900">{filteredTallies.length}</p>
            </div>
          </div>
          <div className="rounded-2xl backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200/50 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest text-[10px]">Total Tallies</p>
              <p className="text-2xl font-bold text-gray-900">{totalFilteredTallies}</p>
            </div>
          </div>
          <div className="rounded-2xl backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-5 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 border border-red-200/50 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest text-[10px]">Rupees Listed</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalFilteredRupees}</p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative group w-full sm:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
              <Input
                placeholder="Search student or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-orange-100 shadow-sm transition-all text-base w-full"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-12 px-4 rounded-xl border border-gray-200 bg-white/50 hover:bg-orange-50 focus:ring-2 focus:ring-orange-200 outline-none shadow-sm text-gray-700 font-medium flex-1 sm:w-40 transition-colors"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <div className="flex bg-gray-100/80 p-1 rounded-xl shrink-0 border border-gray-200/50">
                <Button
                  variant="ghost"
                  onClick={() => setViewMode("summary")}
                  className={`px-3 sm:px-4 h-10 rounded-lg text-sm font-semibold transition-all ${viewMode === 'summary' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Summary
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setViewMode("logs")}
                  className={`px-3 sm:px-4 h-10 rounded-lg text-sm font-semibold transition-all ${viewMode === 'logs' ? 'bg-white shadow-sm text-gray-900 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  History
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] opacity-70">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
              <p className="text-sm font-medium text-gray-600 tracking-wide">Fetching other tallies...</p>
            </div>
          ) : viewMode === "summary" ? (
            <>
              {filteredTallies.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
                  <ShieldAlert className="w-12 h-12 mb-4 opacity-30 text-orange-500" />
                  <p className="text-lg font-medium text-gray-900">No other tallies found</p>
                  <p className="text-sm mt-1">Try relaxing your search terms</p>
                </div>
              ) : (
                <div className="w-full">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm w-[30%]">Student</th>
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Class</th>
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm text-center">Count</th>
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm text-center">Amount</th>
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm">Last Input</th>
                          <th className="py-4 px-6 font-semibold text-gray-600 text-sm text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white/30">
                        {filteredTallies.map((tally) => (
                          <tr key={tally.studentId} className="hover:bg-white/80 transition-colors group">
                            <td className="py-4 px-6">
                              <p className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{tally.studentName}</p>
                              <p className="text-xs text-gray-500 font-medium">ID: {tally.admissionNumber}</p>
                            </td>
                            <td className="py-4 px-6">
                              {tally.studentClass ? (
                                <span className="inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-100/50">
                                  {tally.studentClass}
                                </span>
                              ) : <span className="text-gray-400 text-sm">-</span>}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center justify-center min-w-[2rem] rounded-lg bg-orange-50 px-2 py-1 text-sm font-bold text-orange-700 border border-orange-100">
                                {tally.count}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className="inline-flex items-center justify-center min-w-[3rem] rounded-lg bg-red-50 px-2 py-1 text-sm font-bold text-red-700 border border-red-100">
                                ₹{tally.rupees}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <p className="text-sm font-medium text-gray-700">{new Date(tally.lastDate).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500 truncate max-w-[120px]">by {tally.issuedByName}</p>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                onClick={() => awardStar(tally.studentId, tally.studentName)}
                                disabled={awardingStars === tally.studentId}
                                className="gap-1.5 h-9 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white shadow-sm border border-yellow-400 font-semibold transition-transform active:scale-95"
                              >
                                {awardingStars === tally.studentId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Star className="w-3.5 h-3.5 fill-yellow-100" />
                                )}
                                Award
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Layout */}
                  <div className="md:hidden grid grid-cols-1 gap-3 p-4 bg-gray-50/30">
                    <div className="flex justify-between items-center mb-1 text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                      <span>{filteredTallies.length} Students</span>
                      <span>Total ₹{totalFilteredRupees}</span>
                    </div>
                    {filteredTallies.map((tally) => (
                      <div key={tally.studentId} className="bg-white border border-gray-200/70 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400 rounded-l-2xl opacity-80"></div>

                        <div className="flex justify-between items-start gap-2 pl-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{tally.studentName}</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                #{tally.admissionNumber}
                              </span>
                              {tally.studentClass && (
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                                  {tally.studentClass}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pl-2 flex items-center gap-3">
                          <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex-1 text-center">
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Count</p>
                            <p className="text-lg font-black text-orange-700 leading-none">{tally.count}</p>
                          </div>
                          <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex-1 text-center">
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">Amount</p>
                            <p className="text-lg font-black text-red-700 leading-none">₹{tally.rupees}</p>
                          </div>
                        </div>

                        <div className="pl-2 pt-2 border-t border-gray-100 flex items-center justify-between mt-1">
                          <div className="text-xs text-gray-500 min-w-0 pr-2">
                            <p className="truncate">Last: {new Date(tally.lastDate).toLocaleDateString()}</p>
                            <p className="truncate">By {tally.issuedByName}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => awardStar(tally.studentId, tally.studentName)}
                            disabled={awardingStars === tally.studentId}
                            className="shrink-0 gap-1 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-400 hover:from-yellow-600 hover:to-amber-500 text-white shadow-sm border border-yellow-400/50 font-bold px-4 active:scale-95 transition-transform"
                          >
                            {awardingStars === tally.studentId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Star className="w-4 h-4 fill-white" />
                            )}
                            Award
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Detailed Logs View
            <div className="p-4 sm:p-6 bg-white/40 min-h-[400px]">
              {tallies.filter(t => t.tallyType === 'FIXED').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-gray-500">
                  <ShieldAlert className="w-12 h-12 mb-4 opacity-30 text-orange-500" />
                  <p className="text-lg font-medium text-gray-900">No history found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                  <div className="hidden sm:grid grid-cols-4 px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <div>Student</div>
                    <div>Violation</div>
                    <div>Details</div>
                    <div>Metadata</div>
                  </div>
                  {tallies
                    .filter(t => t.tallyType === 'FIXED')
                    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
                    .map((tally) => (
                      <div key={tally.id} className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-orange-200 transition-all">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                          <div className="flex flex-col justify-center">
                            <p className="text-[10px] sm:hidden font-bold text-gray-400 uppercase mb-1">Student</p>
                            <p className="font-bold text-gray-900 leading-tight">{tally.studentName}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">#{tally.admissionNumber}</p>
                          </div>

                          <div className="flex flex-col justify-center border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                            <p className="text-[10px] sm:hidden font-bold text-gray-400 uppercase mb-1">Violation</p>
                            <p className="font-bold text-orange-900 bg-orange-50 border border-orange-100 inline-block px-3 py-1.5 rounded-xl text-sm self-start break-words max-w-full">
                              {tally.tallyTypeName}
                            </p>
                          </div>

                          <div className="flex flex-col justify-center border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                            <p className="text-[10px] sm:hidden font-bold text-gray-400 uppercase mb-1">Details</p>
                            <div className="flex gap-2">
                              <span className="inline-flex items-center rounded-lg bg-red-50 border border-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                                {tally.count} tallies
                              </span>
                              <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                                ₹{tally.count * 10}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col justify-center border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                            <p className="text-[10px] sm:hidden font-bold text-gray-400 uppercase mb-1">Date & Staff</p>
                            <p className="font-semibold text-gray-900 text-sm">{new Date(tally.issuedAt).toLocaleDateString(undefined, {
                              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">By {tally.issuedByName}</p>
                          </div>
                        </div>

                        {tally.reason && (
                          <div className="mt-4 pt-3 border-t border-dashed border-gray-200 bg-gray-50/50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Optional Note</p>
                            <p className="text-sm font-medium text-gray-700 italic">"{tally.reason}"</p>
                          </div>
                        )}

                        {canDelete && (
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-start">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (!confirm("Delete this tally record? This cannot be undone.")) return
                                fetch(`/api/tallies/${tally.id}`, { method: "DELETE" })
                                  .then(res => res.ok ? res.json() : Promise.reject())
                                  .then(() => { toast.success("Tally deleted"); fetchTallies() })
                                  .catch(() => toast.error("Failed to delete tally"))
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl gap-1.5 text-xs font-semibold px-3 h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Global Styles config for scrollbar if not in globals */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(251, 146, 60, 0.4);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(251, 146, 60, 0.7);
        }
      `}} />
    </div>
  )
}
