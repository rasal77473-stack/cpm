"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"

export default function GrantSpecialPassPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params?.id

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [mentorName, setMentorName] = useState("")
  const [mentorId, setMentorId] = useState("")
  const [expectedReturnDate, setExpectedReturnDate] = useState("")
  const [expectedReturnTime, setExpectedReturnTime] = useState("")

  // Ensure we only access localStorage on client side
  useEffect(() => {
    // Get mentor info from localStorage
    const name = localStorage.getItem("staffName")
    const id = localStorage.getItem("staffId")

    // Explicitly check for "0" or invalid ID
    if (!id || id === "0" || id === "undefined" || id === "null") {
      toast.error("Invalid session detected. Please login again.")
      localStorage.removeItem("staffId")
      localStorage.removeItem("staffName")
      localStorage.removeItem("token")
      localStorage.removeItem("role")
      localStorage.removeItem("permissions")

      setTimeout(() => router.push("/login"), 1000)
      return
    }

    if (name) setMentorName(name)
    setMentorId(id)
  }, [router])

  // Fetch student details - try sessionStorage first for instant load
  useEffect(() => {
    if (!studentId) {
      setLoading(false)
      return
    }

    // Try sessionStorage first (instant - set by the previous page)
    const cached = sessionStorage.getItem(`student_${studentId}`)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        // Transform snake_case keys from the list API to camelCase
        setStudent({
          id: parsed.id,
          name: parsed.name,
          admissionNumber: parsed.admissionNumber || parsed.admission_number,
          lockerNumber: parsed.lockerNumber || parsed.locker_number,
          phoneNumber: parsed.phoneNumber || parsed.phone_number,
          phoneName: parsed.phoneName || parsed.phone_name,
          className: parsed.className || parsed.class_name,
          rollNo: parsed.rollNo || parsed.roll_no,
          specialPass: parsed.specialPass || parsed.special_pass,
        })
        setLoading(false)
        return
      } catch (e) {
        // If parsing fails, fall through to API
      }
    }

    // Fallback: fetch from API
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${studentId}`)
        if (!res.ok) throw new Error("Failed to fetch student")
        const found = await res.json()

        if (!found || !found.id) {
          setError("Student not found")
          setTimeout(() => router.back(), 500)
          return
        }
        setStudent(found)
        setError(null)
      } catch (error) {
        console.error("Error fetching student:", error)
        setError("Failed to load student details")
        setTimeout(() => router.back(), 500)
      } finally {
        setLoading(false)
      }
    }

    fetchStudent()
  }, [studentId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!purpose.trim()) {
      toast.error("Please enter purpose/remarks")
      return
    }

    if (!mentorId) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    if (!expectedReturnDate) {
      toast.error("Please enter expected return date")
      return
    }

    if (!expectedReturnTime) {
      toast.error("Please enter expected return time")
      return
    }

    const parsedMentorId = parseInt(mentorId)
    if (isNaN(parsedMentorId) || parsedMentorId <= 0) {
      toast.error("Invalid staff ID. Please login again.")
      router.push("/login")
      return
    }

    const payload = {
      studentId: parseInt(studentId as string),
      mentorId: parsedMentorId,
      mentorName: mentorName || "Staff",
      purpose: purpose.trim(),
      staffId: parsedMentorId,
      expectedReturnDate,
      expectedReturnTime,
    }

    // INSTANT: Show success
    toast.success("Phone pass granted!")

    // Optimistic UI update using global SWR cache before redirecting
    // We create a fake "optimistic" pass that will be immediately visible on the list page
    const fakePassId = -Date.now()
    const optimisticPass = {
      id: fakePassId,
      studentId: student.id,
      studentName: student.name,
      admissionNumber: student.admission_number,
      className: student.class_name,
      lockerNumber: student.locker_number,
      rollNo: student.roll_no,
      phoneName: student.phone_name,
      mentorName: mentorName || "Staff",
      purpose: `PHONE: ${purpose.trim()}`,
      issueTime: new Date().toISOString(),
      returnTime: null,
      submissionTime: null,
      status: "ACTIVE"
    }

    mutate("/api/special-pass/all", (current: any[] = []) => {
      // Put the new fake pass at the top of the list
      return [optimisticPass, ...current]
    }, { revalidate: false }) // Don't trigger a background fetch yet

    // Also optimistically update the student's phone status to OUT
    mutate("/api/phone-status", (current: any[] = []) => {
      const existing = current.find(s => s.studentId === student.id)
      return existing
        ? current.map(s => s.studentId === student.id ? { ...s, status: "ACTIVE" } : s)
        : [...current, { studentId: student.id, status: "ACTIVE" }]
    }, { revalidate: false })

    // Redirect to list page instantly
    router.push("/special-pass")

    // Fire API in background and sync the real IDs silently afterwards
    fetch("/api/special-pass/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error || data?.details || "Grant failed - please try again")

        // Revert UI on failure
        mutate("/api/special-pass/all", (current: any[] = []) => current.filter(p => p.id !== fakePassId), { revalidate: false })
      } else {
        // Fetch the real pass IDs in background
        mutate("/api/special-pass/all")
        mutate("/api/phone-status")
      }
    }).catch(() => {
      toast.error("Network error - please check and try again")
      // Revert UI on failure
      mutate("/api/special-pass/all", (current: any[] = []) => current.filter(p => p.id !== fakePassId), { revalidate: false })
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!student || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="-ml-2">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Grant Special Pass</h1>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Student Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-medium">Student Name</p>
                <p className="font-bold text-lg text-gray-900">{student.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Admission Number</p>
                  <p className="font-semibold text-gray-900">{student.admissionNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Class</p>
                  <p className="font-semibold text-gray-900">{student.className || student.class || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Locker</p>
                  <p className="font-semibold text-gray-900">{student.lockerNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="font-semibold text-gray-900">{student.phoneName || student.phoneNumber || "-"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issued By Card */}
        <Card className={`border-blue-200 ${!mentorName ? "bg-red-50 border-red-200" : "bg-blue-50"}`}>
          <CardContent className="pt-6">
            <div>
              <p className="text-xs text-gray-500 font-medium">Issued By</p>
              {mentorName ? (
                <p className="font-semibold text-gray-900">{mentorName}</p>
              ) : (
                <p className="font-semibold text-red-600">⚠️ Not logged in</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pass Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Purpose / Remarks *</label>
                <Textarea
                  placeholder="Enter reason for special pass (e.g., Medical appointment, Emergency, etc.)"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="min-h-24 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Expected Return Date *</label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Expected Return Time *</label>
                  <Input
                    type="time"
                    value={expectedReturnTime}
                    onChange={(e) => setExpectedReturnTime(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitting || !purpose.trim() || !expectedReturnDate || !expectedReturnTime || !mentorId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    "Grant Pass"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
