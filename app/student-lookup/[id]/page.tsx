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
              fines.map((fine) => (
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
              ))
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
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Card className="bg-blue-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600">Normal Tallies</p>
                      <p className="font-bold text-2xl text-blue-600">
                        {tallies.filter(t => t.tallyType === 'NORMAL').length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Can be reduced by stars</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50">
                    <CardContent className="py-4">
                      <p className="text-sm text-gray-600">Fixed Tallies</p>
                      <p className="font-bold text-2xl text-red-600">
                        {tallies.filter(t => t.tallyType === 'FIXED').length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Cannot be reduced</p>
                    </CardContent>
                  </Card>
                </div>
                {tallies.map((tally) => (
                  <Card key={tally.id} className="bg-white">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{tally.tallyTypeName}</p>
                          <p className="text-sm text-gray-600">Issued by: {tally.issuedByName}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          tally.tallyType === 'NORMAL'
                            ? "bg-blue-100 text-blue-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {tally.tallyType}
                        </span>
                      </div>
                      {tally.reason && (
                        <p className="text-sm text-gray-700 mt-2">Reason: {tally.reason}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(tally.issuedAt)}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
