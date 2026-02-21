"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, ChevronLeft, Phone, Banknote, AlertCircle } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"

interface StudentData {
  id: number
  name: string
  admissionNumber: string
  class: string | null
  phoneNumber: string | null
  lockerNumber: string | null
}

interface PhoneHistoryEntry {
  id: number
  studentId: number
  status: string
  timestamp: string
  updatedBy: string | null
  notes: string | null
}

interface FineEntry {
  id: number
  studentId: number
  fineName: string
  amount: number
  isPaid: string
  issuedAt: string
  reason: string | null
}

interface TallyEntry {
  id: number
  studentId: number
  tallyTypeId: number
  tallyTypeName: string
  tallyType: string // 'NORMAL' or 'FIXED'
  count: number
  reason: string | null
  issuedBy: number
  issuedByName: string
  issuedAt: string
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentData | null>(null)
  const [phoneHistory, setPhoneHistory] = useState<PhoneHistoryEntry[]>([])
  const [fines, setFines] = useState<FineEntry[]>([])
  const [tallies, setTallies] = useState<TallyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"phone" | "fines" | "tallies">("phone")
  const [tallyFilter, setTallyFilter] = useState<"all" | "normal" | "fixed">("all")
  const [tallyStartDate, setTallyStartDate] = useState("")
  const [tallyEndDate, setTallyEndDate] = useState("")
  const [fineFilter, setFineFilter] = useState<"all" | "paid" | "pending">("all")
  const [fineStartDate, setFineStartDate] = useState("")
  const [fineEndDate, setFineEndDate] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetchStudentData()
  }, [router, studentId])

  const fetchStudentData = async () => {
    try {
      const [studentRes, phoneRes, finesRes, talliesRes] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetch(`/api/students/${studentId}/phone-history`),
        fetch(`/api/students/${studentId}/fines`),
        fetch(`/api/students/${studentId}/tallies`),
      ])

      if (studentRes.ok) {
        const data = await studentRes.json()
        setStudent(data)
      }

      if (phoneRes.ok) {
        const data = await phoneRes.json()
        setPhoneHistory(data)
      }

      if (finesRes.ok) {
        const data = await finesRes.json()
        setFines(data)
      }

      if (talliesRes.ok) {
        const data = await talliesRes.json()
        setTallies(data)
      }

      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch student data:", error)
      setLoading(false)
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Filter and calculate tallies
  const filteredTallies = tallies.filter((tally) => {
    const tallyDate = new Date(tally.issuedAt)
    const startDate = tallyStartDate ? new Date(tallyStartDate) : null
    const endDate = tallyEndDate ? new Date(tallyEndDate) : null

    // Check type filter
    let typeMatch = true
    if (tallyFilter === "normal" && tally.tallyType !== "NORMAL") typeMatch = false
    if (tallyFilter === "fixed" && tally.tallyType !== "FIXED") typeMatch = false

    // Check date filter
    let dateMatch = true
    if (startDate && tallyDate < startDate) dateMatch = false
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      if (tallyDate > endOfDay) dateMatch = false
    }

    return typeMatch && dateMatch
  })

  const tallyCounts = {
    total: filteredTallies.reduce((sum, t) => sum + t.count, 0),
    normal: filteredTallies.filter(t => t.tallyType === "NORMAL").reduce((sum, t) => sum + t.count, 0),
    fixed: filteredTallies.filter(t => t.tallyType === "FIXED").reduce((sum, t) => sum + t.count, 0),
    rupees: filteredTallies.reduce((sum, t) => sum + (t.count * 10), 0),
  }

  // Filter and calculate fines
  const filteredFines = fines.filter((fine) => {
    const fineDate = new Date(fine.issuedAt)
    const startDate = fineStartDate ? new Date(fineStartDate) : null
    const endDate = fineEndDate ? new Date(fineEndDate) : null

    // Check status filter
    let statusMatch = true
    if (fineFilter === "paid" && fine.isPaid !== "YES") statusMatch = false
    if (fineFilter === "pending" && fine.isPaid !== "NO") statusMatch = false

    // Check date filter
    let dateMatch = true
    if (startDate && fineDate < startDate) dateMatch = false
    if (endDate) {
      const endOfDay = new Date(endDate)
      endOfDay.setHours(23, 59, 59, 999)
      if (fineDate > endOfDay) dateMatch = false
    }

    return statusMatch && dateMatch
  })

  const fineTotals = {
    pending: filteredFines.filter(f => f.isPaid === "NO").reduce((sum, f) => sum + f.amount, 0),
    paid: filteredFines.filter(f => f.isPaid === "YES").reduce((sum, f) => sum + f.amount, 0),
    total: filteredFines.reduce((sum, f) => sum + f.amount, 0),
  }

  if (loading || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading student data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-green-900">{student.name}</h1>
              <p className="text-sm text-gray-600">Admission: {student.admissionNumber}</p>
            </div>
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
        {/* Student Info Card */}
        <Card className="mb-8 bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Student Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Admission Number</p>
                <p className="font-semibold text-gray-900">{student.admissionNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Class</p>
                <p className="font-semibold text-gray-900">{student.class || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Locker Number</p>
                <p className="font-semibold text-gray-900">{student.lockerNumber || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone Number</p>
                <p className="font-semibold text-gray-900">{student.phoneNumber || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("phone")}
            className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "phone"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Phone className="w-4 h-4 inline mr-2" />
            Phone History
          </button>
          <button
            onClick={() => setActiveTab("fines")}
            className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "fines"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <Banknote className="w-4 h-4 inline mr-2" />
            Fines
          </button>
          <button
            onClick={() => setActiveTab("tallies")}
            className={`pb-4 px-4 font-medium border-b-2 transition-colors ${
              activeTab === "tallies"
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Tallies ({tallies.length})
          </button>
        </div>

        {/* Phone History Tab */}
        {activeTab === "phone" && (
          <div className="space-y-4">
            {phoneHistory.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No phone history records
                </CardContent>
              </Card>
            ) : (
              phoneHistory.map((entry) => (
                <Card key={entry.id} className="bg-white">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          entry.status === "IN"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {entry.status}
                        </span>
                        <p className="text-sm text-gray-600">{formatDate(entry.timestamp)}</p>
                      </div>
                      <p className="text-sm text-gray-500">{entry.updatedBy || "Unknown"}</p>
                    </div>
                    {entry.notes && (
                      <p className="text-sm text-gray-700 mt-2">Notes: {entry.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Fines Tab */}
        {activeTab === "fines" && (
          <div className="space-y-4">
            {fines.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No fines issued
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Total Boxes */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Card className="bg-blue-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600">Total Fine</p>
                      <p className="font-bold text-2xl text-blue-600">₹{fineTotals.total.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="font-bold text-2xl text-yellow-600">₹{fineTotals.pending.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600">Paid</p>
                      <p className="font-bold text-2xl text-green-600">₹{fineTotals.paid.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">Fine Filters</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <select
                          value={fineFilter}
                          onChange={(e) => setFineFilter(e.target.value as any)}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="all">All Fines</option>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs font-medium">From</label>
                          <input
                            type="date"
                            value={fineStartDate}
                            onChange={(e) => setFineStartDate(e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium">To</label>
                          <input
                            type="date"
                            value={fineEndDate}
                            onChange={(e) => setFineEndDate(e.target.value)}
                            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                        </div>
                        {(fineStartDate || fineEndDate) && (
                          <button
                            onClick={() => {
                              setFineStartDate("")
                              setFineEndDate("")
                            }}
                            className="self-end px-3 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Fines List */}
                {filteredFines.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      No fines match the selected filters
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredFines.map((fine) => (
                      <Card key={fine.id} className="bg-white">
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900">{fine.fineName}</p>
                              <p className="text-sm text-gray-600">Amount: ₹{fine.amount.toFixed(2)}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              fine.isPaid === "YES"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {fine.isPaid === "YES" ? "Paid" : "Pending"}
                            </span>
                          </div>
                          {fine.reason && (
                            <p className="text-sm text-gray-700 mt-2">Reason: {fine.reason}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">{formatDate(fine.issuedAt)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tallies Tab */}
        {activeTab === "tallies" && (
          <div className="space-y-4">
            {tallies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No tallies issued
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="space-y-4">
                    <div>
                      <CardTitle>Tallies & Rule Violations</CardTitle>
                      <p className="text-sm text-gray-600 mt-2">Normal: {tallyCounts.normal} | Fixed: {tallyCounts.fixed} | Total: {tallyCounts.total} tallies = ₹{tallyCounts.rupees}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <select
                        value={tallyFilter}
                        onChange={(e) => setTallyFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm"
                      >
                        <option value="all">All Tallies</option>
                        <option value="normal">Normal</option>
                        <option value="fixed">Fixed/Other</option>
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-medium">From</label>
                        <input
                          type="date"
                          value={tallyStartDate}
                          onChange={(e) => setTallyStartDate(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium">To</label>
                        <input
                          type="date"
                          value={tallyEndDate}
                          onChange={(e) => setTallyEndDate(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      {(tallyStartDate || tallyEndDate) && (
                        <button
                          onClick={() => {
                            setTallyStartDate("")
                            setTallyEndDate("")
                          }}
                          className="self-end px-3 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTallies.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No tallies match the selected filters</p>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredTallies.map((tally) => (
                        <Card key={tally.id} className="bg-white">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-semibold text-gray-900">{tally.tallyTypeName}</p>
                                <p className="text-sm text-gray-600">Issued by: {tally.issuedByName}</p>
                              </div>
                              <div className="flex gap-2 items-center">
                                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  {tally.count} tally
                                </span>
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ₹{tally.count * 10}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  tally.tallyType === 'NORMAL'
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {tally.tallyType}
                                </span>
                              </div>
                            </div>
                            {tally.reason && (
                              <p className="text-sm text-gray-700 mt-2">Reason: {tally.reason}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">{formatDate(tally.issuedAt)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
