"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { mutate } from "swr"

export default function GrantSpecialPassPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const studentId = resolvedParams.id

  const [student, setStudent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [mentorName, setMentorName] = useState("")
  const [mentorId, setMentorId] = useState("")

  const [formData, setFormData] = useState({
    purpose: "",
    returnTime: "",
  })

  useEffect(() => {
    const name = localStorage.getItem("staffName")
    const id = localStorage.getItem("staffId")
    if (name) setMentorName(name)
    if (id) setMentorId(id)

    fetch(`/api/students?id=${studentId}`)
      .then(res => res.json())
      .then(data => {
        setStudent(data)
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load student details")
        setLoading(false)
      })
  }, [studentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Check if student already has an active or out pass before submitting
      const activeRes = await fetch("/api/special-pass/active")
      const activePasses = await activeRes.json()
      const hasActivePass = activePasses.some((p: any) => p.student_id === Number(studentId))

      if (hasActivePass) {
        toast.error("Student already has an active special pass")
        setSubmitting(false)
        return
      }

      const res = await fetch("/api/special-pass/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(studentId),
          mentorId: parseInt(mentorId) || 0, // Ensure mentorId is sent as number
          mentorName,
          purpose: formData.purpose,
          returnTime: formData.returnTime,
          staffId: mentorId // for logging
        })
      })

      if (res.ok) {
        toast.success("Special pass granted successfully! Redirecting to dashboard...")
        // Force revalidation of student data and special passes
        await mutate("/api/students")
        await mutate("/api/special-pass/all")
        // Add a small delay before redirect for better UX
        setTimeout(() => {
          router.push("/dashboard")
        }, 500)
      } else {
        throw new Error("Failed to grant pass")
      }
    } catch (err) {
      toast.error("An error occurred")
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8" /></div>
  if (!student) return <div className="p-8 text-center">Student not found</div>

  return (
    <div className="max-w-2xl mx-auto p-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Grant Special Pass</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-accent/50 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Student Name</Label>
                <p className="font-bold">{student.name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Admission No</Label>
                <p className="font-bold">{student.admission_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Locker No</Label>
                <p className="font-bold">{student.locker_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Mentor</Label>
                <p className="font-bold">{mentorName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Issue Time</Label>
                <p className="font-bold">{new Date().toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expected Return Time</Label>
              <Input
                type="datetime-local"
                required
                value={formData.returnTime}
                onChange={e => setFormData({ ...formData, returnTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea
                placeholder="Reason for granting special pass..."
                required
                value={formData.purpose}
                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
              {submitting ? "Processing..." : "Grant Pass Now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
