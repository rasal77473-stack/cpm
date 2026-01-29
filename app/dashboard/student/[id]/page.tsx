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

  useEffect(() => {
    fetchStudentData()
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      const [studentRes, statusRes] = await Promise.all([
        fetch(`/api/students?id=${studentId}`),
        fetch(`/api/phone-status/${studentId}`),
      ])

      if (studentRes.ok) {
        const student = await studentRes.json()
        setStudent(student)
      }

      if (statusRes.ok) {
        const status = await statusRes.json()
        setPhoneStatus(status)
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
