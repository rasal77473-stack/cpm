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

export default function GrantGatePassPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params?.id

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mentorName, setMentorName] = useState("")
  const [mentorId, setMentorId] = useState("")

  const [formData, setFormData] = useState({
    purpose: "",
    returnDate: "",
    returnTime: "",
  })

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
    
    if (!formData.purpose.trim()) {
      toast.error("Please enter purpose/remarks")
      return
    }

    if (!formData.returnDate || !formData.returnTime) {
      toast.error("Please set return date and time")
      return
    }

    if (!mentorId) {
      toast.error("Mentor info not found. Please login again.")
      return
    }

    setSubmitting(true)

    // Create return time from date and time
    const returnDateTime = new Date(`${formData.returnDate}T${formData.returnTime}`)

    const payload = {
      studentId: parseInt(studentId as string),
      mentorId: parseInt(mentorId),
      mentorName: mentorName || "Staff",
      purpose: formData.purpose.trim(),
      returnTime: returnDateTime.toISOString(),
      submissionTime: new Date().toISOString(),
      staffId: mentorId,
    }

    console.log("📤 Sending Gate Pass Request:", payload)

    try {
      const res = await fetch("/api/gate-pass/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      console.log("📥 Response Status:", res.status)
      console.log("📥 Response Data:", data)

      if (!res.ok) {
        const errorMsg = data.details || data.error || "Failed to grant pass"
        console.error("❌ API Error Details:", errorMsg)
        throw new Error(errorMsg)
      }

      // Update SWR cache
      await mutate("/api/special-pass/all")
      
      toast.success("Gate pass granted successfully!")
      console.log("✅ Gate pass created successfully")
      setTimeout(() => router.push("/gate-pass"), 500)
    } catch (error: any) {
      console.error("❌ Error granting pass:", error)
      const errorMessage = error?.message || "Failed to grant gate pass"
      toast.error(errorMessage)
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
        <h1 className="text-lg font-bold">Grant Gate Pass</h1>
      </header>

      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Student Details Card */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Student Name</p>
                <p className="font-bold text-gray-900">{student.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Admission No</p>
                <p className="font-bold text-gray-900">{student.admission_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Locker</p>
                <p className="font-bold text-gray-900">{student.locker_number || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Class</p>
                <p className="font-bold text-gray-900">{student.class_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Roll No</p>
                <p className="font-bold text-gray-900">{student.roll_no || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase">Mentor</p>
                <p className="font-bold text-gray-900">{mentorName || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 font-medium uppercase">Issue Time</p>
                <p className="font-bold text-gray-900">{new Date().toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Gate Pass Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Purpose */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Purpose / Remarks *</label>
                <Textarea
                  placeholder="Reason for gate pass (e.g., Sick, Early leave, Parent meeting, etc.)"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                  className="min-h-20"
                />
              </div>

              {/* Return Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Return Date *</label>
                <Input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                  required
                  className="bg-white border-green-200"
                />
              </div>

              {/* Return Time */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Return Time *</label>
                <Input
                  type="time"
                  value={formData.returnTime}
                  onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                  required
                  className="bg-white border-green-200"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4">
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
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-11"
                  disabled={submitting || !formData.purpose.trim() || !formData.returnDate || !formData.returnTime}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    "Grant Gate Pass"
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
