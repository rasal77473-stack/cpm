"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Plus, Settings, Search, Filter, Loader2, IndianRupee, Banknote, ShieldAlert, CheckCircle2, TrendingDown, Trash2 } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"
import { BackToDashboard } from "@/components/back-to-dashboard"
import { DownloadButton } from "@/components/download-button"

interface StudentFine {
  id: number
  studentId: number
  studentName: string
  studentClass: string | null
  admissionNumber: string
  fineName: string | null
  amount: number
  reason: string | null
  isPaid: string
  issuedBy: number
  issuedByName: string
  paidDate: string | null
  issuedAt: string
}

export default function FineManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [fines, setFines] = useState<StudentFine[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [canDelete, setCanDelete] = useState(false)

  // Calculate fine statistics
  const fineStats = useMemo(() => {
    return {
      totalPending: fines.reduce((sum, f) => f.isPaid === "NO" ? sum + f.amount : sum, 0),
      totalPaid: fines.reduce((sum, f) => f.isPaid === "YES" ? sum + f.amount : sum, 0),
      totalAmount: fines.reduce((sum, f) => sum + f.amount, 0),
      pendingCount: fines.filter(f => f.isPaid === "NO").length,
      paidCount: fines.filter(f => f.isPaid === "YES").length,
    }
  }, [fines])

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
    fetchFines()
  }, [router, search, classFilter, statusFilter])

  const fetchFines = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (classFilter !== "all") params.append("class", classFilter)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const res = await fetch(`/api/fines/student-fines?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch fines")

      const data = await res.json()
      setFines(data)

      const uniqueClasses = [...new Set(data.map((f: StudentFine) => f.studentClass).filter(Boolean))]
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch fines:", error)
      toast.error("Failed to load fines")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (fineId: number, newStatus: string) => {
    try {
      setProcessingId(fineId)
      const res = await fetch(`/api/fines/student-fines/${fineId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update fine")

      toast.success(newStatus === "YES" ? "Fine paid successfully!" : "Fine status reverted to Pending")
      fetchFines() // Refresh list
    } catch (error) {
      console.error("Failed to update fine:", error)
      toast.error("Failed to update fine status")
    } finally {
      setProcessingId(null)
    }
  }

  const sortedFines = useMemo(() => {
    return [...fines].sort((a, b) => {
      if (a.isPaid !== b.isPaid) {
        return a.isPaid === "NO" ? -1 : 1
      }
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    })
  }, [fines])

  if (!isAuthorized) return null

  return (
    <div className="min-h-screen relative bg-[#f8fafc] overflow-x-hidden font-sans pb-24">
      {/* Background Orbs indicating a glassmorphic modern design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-300/20 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-fuchsia-300/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-300/20 blur-[120px]" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-40 backdrop-blur-3xl bg-white/70 border-b border-indigo-100/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 w-full sm:w-auto mb-2 sm:mb-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="rounded-xl hover:bg-white/60 bg-white/40 shadow-sm border border-gray-100 transition-transform active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </Button>
              <BackToDashboard />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight truncate">
                  Fine Management
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                  {staffName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <DownloadButton
                data={sortedFines}
                columns={[
                  { key: "studentName", header: "Student Name" },
                  { key: "admissionNumber", header: "Admission No" },
                  { key: "studentClass", header: "Class" },
                  { key: "fineName", header: "Fine Reason" },
                  { key: "amount", header: "Amount (₹)" },
                  { key: "isPaid", header: "Paid Status" },
                  { key: "issuedAt", header: "Issue Date" },
                  { key: "issuedByName", header: "Issued By" },
                ]}
                filename="fine-management"
                title="Fine Management Report"
              />
              <Link href="/admin/fine/manage" className="flex-1 sm:flex-none">
                <Button variant="outline" className="w-full sm:w-auto rounded-xl gap-1.5 bg-white/50 border-gray-200 hover:bg-violet-50 hover:text-violet-700 shadow-sm transition-colors text-sm px-3 sm:px-4">
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </Button>
              </Link>
              <Link href="/admin/fine/add" className="flex-1 sm:flex-none">
                <Button className="w-full sm:w-auto rounded-xl gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-violet-200 transition-all text-sm px-3 sm:px-4 border border-violet-500/50">
                  <Plus className="w-4 h-4" />
                  <span>New Fine</span>
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

        {/* KPI Dashboard (Desktop mostly, stack on mobile) */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <div className="rounded-[20px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-50 rounded-full blur-xl group-hover:bg-indigo-100 transition-colors"></div>
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 border border-indigo-200/50 mb-3">
                  <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Fines</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-black text-gray-900 leading-none">₹{fineStats.totalAmount}</p>
                <p className="text-xs text-indigo-600 font-semibold mt-1">{fines.length} Issued</p>
              </div>
            </div>

            <div className="rounded-[20px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-50 rounded-full blur-xl group-hover:bg-rose-100 transition-colors"></div>
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-100/80 flex items-center justify-center text-rose-600 border border-rose-200/50 mb-3">
                  <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Pending</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-black text-rose-600 leading-none">₹{fineStats.totalPending}</p>
                <p className="text-xs text-rose-600 font-semibold mt-1">{fineStats.pendingCount} unpaid</p>
              </div>
            </div>

            <div className="rounded-[20px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-50 rounded-full blur-xl group-hover:bg-emerald-100 transition-colors"></div>
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-600 border border-emerald-200/50 mb-3">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Collected</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-black text-emerald-600 leading-none">₹{fineStats.totalPaid}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-1">{fineStats.paidCount} paid</p>
              </div>
            </div>

            <div className="rounded-[20px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-50 rounded-full blur-xl group-hover:bg-purple-100 transition-colors"></div>
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-100/80 flex items-center justify-center text-purple-600 border border-purple-200/50 mb-3">
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Recovery Rate</p>
              </div>
              <div>
                <p className="text-xl sm:text-3xl font-black text-purple-600 leading-none">
                  {fineStats.totalAmount > 0 ? ((fineStats.totalPaid / fineStats.totalAmount) * 100).toFixed(0) : '0'}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Controls */}
        <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative group w-full flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <Input
                placeholder="Search student or admission #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-indigo-100 shadow-sm transition-all text-base w-full"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-12 px-4 rounded-xl border border-gray-200 bg-white/50 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm text-gray-700 font-medium min-w-[130px] transition-colors"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 px-4 rounded-xl border border-gray-200 bg-white/50 hover:bg-indigo-50 focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm text-gray-700 font-medium min-w-[140px] transition-colors"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Only</option>
                <option value="paid">Paid Only</option>
              </select>

              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("")
                  setClassFilter("all")
                  setStatusFilter("all")
                }}
                className="h-12 px-4 rounded-xl border border-gray-200/50 bg-white/50 hover:bg-gray-100 shadow-sm shrink-0 font-semibold"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="rounded-[24px] backdrop-blur-xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[400px] opacity-70">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
              <p className="text-sm font-medium text-gray-600 tracking-wide">Fetching fine records...</p>
            </div>
          ) : sortedFines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-500">
              <Banknote className="w-12 h-12 mb-4 opacity-30 text-indigo-500" />
              <p className="text-lg font-medium text-gray-900">No fines found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="w-full">
              <div className="px-4 py-3 sm:px-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-widest">
                <span>{sortedFines.length} Fines Listed</span>
                <span className="hidden sm:inline">Pending Fines prioritize top</span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto custom-scrollbar bg-white/30 p-2">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-4 px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <div>Student</div>
                  <div>Class Details</div>
                  <div>Fine Details</div>
                  <div className="text-center">Amount</div>
                  <div>Status</div>
                  <div className="text-right">Action</div>
                </div>

                <div className="space-y-2">
                  {sortedFines.map((fine) => (
                    <div key={fine.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_0.5fr] gap-4 items-center bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-indigo-100 transition-all group">
                      {/* Student Info */}
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{fine.studentName}</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">#{fine.admissionNumber}</p>
                      </div>

                      {/* Class */}
                      <div>
                        {fine.studentClass ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100/50">
                            {fine.studentClass}
                          </span>
                        ) : <span className="text-gray-400 text-sm">-</span>}
                      </div>

                      {/* Fine Details */}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm truncate">{fine.fineName || "Custom"}</p>
                        {fine.reason && <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[150px]" title={fine.reason}>{fine.reason}</p>}
                      </div>

                      {/* Amount */}
                      <div className="text-center">
                        <span className="inline-flex items-center justify-center min-w-[4rem] rounded-lg bg-gray-100/80 px-3 py-1.5 text-base font-black text-gray-800 border border-gray-200/50">
                          ₹{fine.amount}
                        </span>
                      </div>

                      {/* Status & Date */}
                      <div>
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${fine.isPaid === "YES"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : "bg-rose-50 text-rose-700 border-rose-200/60"
                              }`}
                          >
                            {fine.isPaid === "YES" ? "Paid" : "Pending"}
                          </span>
                          <p className="text-[11px] text-gray-500 font-medium">
                            {new Date(fine.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end gap-2">
                        {fine.isPaid === "NO" ? (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(fine.id, "YES")}
                            disabled={processingId === fine.id}
                            className="gap-1.5 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 border border-emerald-500 font-bold px-4 hover:scale-105 transition-transform"
                          >
                            {processingId === fine.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Pay"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(fine.id, "NO")}
                            disabled={processingId === fine.id}
                            variant="outline"
                            className="gap-1.5 h-9 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 font-semibold px-3 transition-colors border-gray-200"
                          >
                            {processingId === fine.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Undo"}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (!confirm("Delete this fine record? This cannot be undone.")) return
                              fetch(`/api/fines/student-fines/${fine.id}`, { method: "DELETE" })
                                .then(res => res.ok ? res.json() : Promise.reject())
                                .then(() => { toast.success("Fine deleted"); fetchFines() })
                                .catch(() => toast.error("Failed to delete fine"))
                            }}
                            className="h-9 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-gray-50/30">
                {sortedFines.map((fine) => (
                  <div key={fine.id} className="bg-white border border-gray-200/70 rounded-[20px] p-5 shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] flex flex-col gap-4 relative overflow-hidden group">
                    {/* Decorative top bar indicating status */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${fine.isPaid === "YES" ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

                    {/* Header: Student & Status */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 pr-2">
                        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{fine.studentName}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                            #{fine.admissionNumber}
                          </span>
                          {fine.studentClass && (
                            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                              {fine.studentClass}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase border ${fine.isPaid === "YES" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-rose-50 text-rose-700 border-rose-200/60"
                        }`}>
                        {fine.isPaid === "YES" ? "PAID" : "PENDING"}
                      </span>
                    </div>

                    {/* Middle: Fine Details & Amount */}
                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 flex items-center justify-between">
                      <div className="min-w-0 pr-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Fine Type</p>
                        <p className="font-bold text-gray-800 text-sm truncate">{fine.fineName || "Custom"}</p>
                        {fine.reason && <p className="text-xs text-gray-500 mt-1 truncate max-w-[180px] italic">"{fine.reason}"</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Amount</p>
                        <p className="font-black text-xl text-indigo-700">₹{fine.amount}</p>
                      </div>
                    </div>

                    {/* Footer: Meta & Actions */}
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-500 font-medium">
                        {new Date(fine.issuedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>

                      <div className="flex items-center gap-2">
                        {fine.isPaid === "NO" ? (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(fine.id, "YES")}
                            disabled={processingId === fine.id}
                            className="shrink-0 gap-1.5 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200 border border-emerald-500 font-bold px-6"
                          >
                            {processingId === fine.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark Paid"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(fine.id, "NO")}
                            disabled={processingId === fine.id}
                            variant="outline"
                            className="shrink-0 gap-1.5 h-10 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 font-bold px-4 border-gray-200"
                          >
                            {processingId === fine.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Undo"}
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (!confirm("Delete this fine record? This cannot be undone.")) return
                              fetch(`/api/fines/student-fines/${fine.id}`, { method: "DELETE" })
                                .then(res => res.ok ? res.json() : Promise.reject())
                                .then(() => { toast.success("Fine deleted"); fetchFines() })
                                .catch(() => toast.error("Failed to delete fine"))
                            }}
                            className="shrink-0 h-10 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 px-3"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
          background-color: rgba(148, 163, 184, 0.4);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.7);
        }
      `}} />
    </div>
  )
}
