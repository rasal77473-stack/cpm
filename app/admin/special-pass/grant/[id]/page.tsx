"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function GrantSpecialPassPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params?.id

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [mentorName, setMentorName] = useState("")
  const [mentorId, setMentorId] = useState("")

  useEffect(() => {
    // Get mentor info from localStorage
    const name = localStorage.getItem("staffName")
    const id = localStorage.getItem("staffId")
    if (name) setMentorName(name)
    if (id) setMentorId(id)

    // Fetch student details
    if (!studentId) {
      setLoading(false)
      return
    }

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students`)
        if (!res.ok) throw new Error("Failed to fetch students")
        const students = await res.json()
        const found = students.find((s: any) => s.id === parseInt(studentId as string))
        
        if (!found) {
          toast.error("Student not found")
          setTimeout(() => router.back(), 1000)
          return
        }
        setStudent(found)
      } catch (error) {
        console.error("Error fetching student:", error)
        toast.error("Failed to load student details")
        setTimeout(() => router.back(), 1000)
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
      toast.error("Mentor info not found. Please login again.")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch("/api/special-pass/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: parseInt(studentId as string),
          mentorId: parseInt(mentorId),
          mentorName: mentorName || "Staff",
          purpose: purpose.trim(),
          staffId: mentorId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to grant pass")
      }

      toast.success("Special pass granted successfully!")
      setTimeout(() => router.push("/special-pass"), 500)
    } catch (error: any) {
      console.error("Error granting pass:", error)
      toast.error(error.message || "Failed to grant special pass")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p className="text-muted-foreground mb-4">Student not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
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
                  <p className="font-semibold text-gray-900">{student.admission_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Class</p>
                  <p className="font-semibold text-gray-900">{student.class_name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Locker</p>
                  <p className="font-semibold text-gray-900">{student.locker_number || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Phone</p>
                  <p className="font-semibold text-gray-900">{student.phone_name || student.phone_number || "-"}</p>
                </div>
              </div>
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
                  disabled={submitting || !purpose.trim()}
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
