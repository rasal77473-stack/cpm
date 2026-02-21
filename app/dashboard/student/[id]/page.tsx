"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
  phone_name: string
  class_name: string
  roll_no: string
}

interface PhoneStatus {
  student_id: number
  status: string
  last_updated: string
}

interface StudentTally {
  id: number
  tallyTypeName: string
  count: number
  issuedAt: string
}

interface StudentFine {
  id: number
  fineName: string
  amount: number
  isPaid: string
  issuedAt: string
}

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = Number.parseInt(params.id as string)

  const [student, setStudent] = useState<Student | null>(null)
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus | null>(null)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState("")
  const [tallies, setTallies] = useState<StudentTally[]>([])
  const [fines, setFines] = useState<StudentFine[]>([])
  const [tallyFilter, setTallyFilter] = useState<"all" | "normal" | "fixed">("all")
  const [fineFilter, setFineFilter] = useState<"all" | "paid" | "pending">("all")
  const [tallyStartDate, setTallyStartDate] = useState("")
  const [tallyEndDate, setTallyEndDate] = useState("")
  const [fineStartDate, setFineStartDate] = useState("")
  const [fineEndDate, setFineEndDate] = useState("")
  const [activeTab, setActiveTab] = useState<"phone" | "fines" | "tallies">("phone")

  useEffect(() => {
    fetchStudentData()
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      const [studentRes, statusRes, talliesRes, finesRes] = await Promise.all([
        fetch(`/api/students?id=${studentId}`),
        fetch(`/api/phone-status/${studentId}`),
        fetch(`/api/students/${studentId}/tallies`),
        fetch(`/api/students/${studentId}/fines`),
      ])

      if (studentRes.ok) {
        const student = await studentRes.json()
        setStudent(student)
      }

      if (statusRes.ok) {
        const status = await statusRes.json()
        setPhoneStatus(status)
      }

      if (talliesRes.ok) {
        const data = await talliesRes.json()
        setTallies(data)
      }

      if (finesRes.ok) {
        const data = await finesRes.json()
        setFines(data)
      }

      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch student:", error)
      setLoading(false)
    }
  }

  const handleToggleStatus = async (newStatus: string) => {
    setUpdating(true)
    setMessage("")

    try {
      const staffId = localStorage.getItem("staffId")
      const response = await fetch(`/api/phone-status/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          staffId: Number.parseInt(staffId || "1"),
          notes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPhoneStatus(data.status)
        setMessage(`Status updated to ${newStatus}`)
        setNotes("")
      }
    } catch (error) {
      setMessage("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  // Filter tallies by type and date
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

  // Filter fines by status and date
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

  // Calculate totals
  const tallyCounts = {
    total: filteredTallies.reduce((sum, t) => sum + t.count, 0),
    rupees: filteredTallies.reduce((sum, t) => sum + (t.count * 10), 0),
    normal: filteredTallies.filter(t => t.tallyType === "NORMAL").reduce((sum, t) => sum + t.count, 0),
    fixed: filteredTallies.filter(t => t.tallyType === "FIXED").reduce((sum, t) => sum + t.count, 0),
  }

  const fineTotals = {
    pending: filteredFines.filter(f => f.isPaid === "NO").reduce((sum, f) => sum + f.amount, 0),
    paid: filteredFines.filter(f => f.isPaid === "YES").reduce((sum, f) => sum + f.amount, 0),
    total: filteredFines.reduce((sum, f) => sum + f.amount, 0),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Student not found</div>
      </div>
    )
  }

  const isPhoneIn = phoneStatus?.status === "IN"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">Admission: {student.admission_number}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-border px-4">
          <div className="flex gap-8 max-w-3xl mx-auto">
            <button
              onClick={() => setActiveTab("phone")}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === "phone"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Phone History
            </button>
            <button
              onClick={() => setActiveTab("fines")}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === "fines"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Fines
            </button>
            <button
              onClick={() => setActiveTab("tallies")}
              className={`py-3 px-1 border-b-2 font-medium transition ${
                activeTab === "tallies"
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tallies ({filteredTallies.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Student Info */}
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <p className="font-medium">{student.name}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Admission No.</label>
                <p className="font-medium">{student.admission_number}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Locker No.</label>
                <p className="font-medium">{student.locker_number}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Phone Name</label>
                <p className="font-medium">{student.phone_name || "-"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Class</label>
                <p className="font-medium">{student.class_name || "-"}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Roll No.</label>
                <p className="font-medium">{student.roll_no || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === "phone" && (
          <>
            {/* Phone Status */}
            <Card>
              <CardHeader>
                <CardTitle>Current Phone Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`p-4 rounded-lg flex items-center gap-3 ${
                    isPhoneIn
                      ? "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100"
                      : "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
                  }`}
                >
                  {isPhoneIn ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <div>
                    <div className="font-bold text-lg">{phoneStatus?.status || "UNKNOWN"}</div>
                    <div className="text-sm">
                      Last updated:{" "}
                      {phoneStatus?.last_updated ? new Date(phoneStatus.last_updated).toLocaleString() : "N/A"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Toggle Status */}
            <Card>
              <CardHeader>
                <CardTitle>Update Phone Status</CardTitle>
                <CardDescription>Change the phone status and add optional notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      message.includes("updated")
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <div>
                  <label htmlFor="notes" className="text-sm font-medium">
                    Notes (Optional)
                  </label>
                  <Input
                    id="notes"
                    placeholder="Add any notes about this transaction"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleToggleStatus("IN")}
                    disabled={updating || isPhoneIn}
                    className={isPhoneIn ? "opacity-50" : ""}
                    variant={isPhoneIn ? "outline" : "default"}
                  >
                    {updating ? "Updating..." : "Mark Phone IN"}
                  </Button>
                  <Button
                    onClick={() => handleToggleStatus("OUT")}
                    disabled={updating || !isPhoneIn}
                    className={!isPhoneIn ? "opacity-50" : ""}
                    variant={!isPhoneIn ? "outline" : "default"}
                  >
                    {updating ? "Updating..." : "Mark Phone OUT"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tallies Section */}
        {activeTab === "tallies" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>Tallies & Rule Violations</CardTitle>
                <CardDescription>Total: {tallyCounts.total} tallies = ₹{tallyCounts.rupees}</CardDescription>
              </div>
              <select
                value={tallyFilter}
                onChange={(e) => setTallyFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
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
          </CardHeader>
          <CardContent>
            {filteredTallies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No tallies found</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredTallies.map((tally) => (
                  <div key={tally.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div>
                      <p className="font-medium">{tally.tallyTypeName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tally.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mr-2">
                        {tally.count} tally
                      </span>
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ₹{tally.count * 10}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Fines Section */}
        {activeTab === "fines" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle>Fines to Pay</CardTitle>
                <CardDescription>
                  Total: ₹{fineTotals.total} | Pending: ₹{fineTotals.pending} | Paid: ₹{fineTotals.paid}
                </CardDescription>
              </div>
              <select
                value={fineFilter}
                onChange={(e) => setFineFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded text-sm"
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
          </CardHeader>
          <CardContent>
            {filteredFines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No fines found</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFines.map((fine) => (
                  <div key={fine.id} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                    <div className="flex-1">
                      <p className="font-medium">{fine.fineName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(fine.issuedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-semibold">₹{fine.amount}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          fine.isPaid === "YES"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {fine.isPaid === "YES" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </main>
    </div>
  )
}
