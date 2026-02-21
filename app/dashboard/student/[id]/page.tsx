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
            <h1 className="text-2xl font-bold text-foreground">Manage Phone Status</h1>
            <p className="text-sm text-muted-foreground mt-1">{student.name}</p>
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

        {/* Tallies Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tallies & Rule Violations</CardTitle>
                <CardDescription>Total: {tallies.reduce((sum, t) => sum + t.count, 0)} tallies = ₹{tallies.reduce((sum, t) => sum + (t.count * 10), 0)}</CardDescription>
              </div>
              <div className="flex gap-2">
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
            </div>
          </CardHeader>
          <CardContent>
            {tallies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No tallies recorded</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tallies.map((tally) => (
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

        {/* Fines Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fines to Pay</CardTitle>
                <CardDescription>
                  Pending: ₹{fines.filter(f => f.isPaid === 'NO').reduce((sum, f) => sum + f.amount, 0)} | Paid: ₹{fines.filter(f => f.isPaid === 'YES').reduce((sum, f) => sum + f.amount, 0)}
                </CardDescription>
              </div>
              <div className="flex gap-2">
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
            </div>
          </CardHeader>
          <CardContent>
            {fines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No fines recorded</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {fines
                  .filter((fine) => {
                    if (fineFilter === "paid") return fine.isPaid === "YES"
                    if (fineFilter === "pending") return fine.isPaid === "NO"
                    return true
                  })
                  .map((fine) => (
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
      </main>
    </div>
  )
}
