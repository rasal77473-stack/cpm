"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, LogOut, Plus, Search, Filter } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

interface StudentTally {
  id: number
  studentId: number
  studentName: string
  studentClass: string | null
  admissionNumber: string
  tallyTypeName: string
  tallyType: string
  count: number
  reason: string | null
  issuedBy: number
  issuedByName: string
  issuedAt: string
}

interface StudentTallyCount {
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  count: number
  rupees: number
  issuedByName: string
  lastDate: string
}

export default function TallyManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [tallies, setTallies] = useState<StudentTally[]>([])
  const [tallyCountMap, setTallyCountMap] = useState<Map<number, StudentTallyCount>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])
  const [tallyTypes, setTallyTypes] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"summary" | "logs">("summary")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")
    fetchTallies()
  }, [router])

  const fetchTallies = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tallies")
      if (!res.ok) throw new Error("Failed to fetch tallies")
      const data: StudentTally[] = await res.json()
      setTallies(data)

      // Group tallies by student and calculate counts
      const countMap = new Map<number, StudentTallyCount>()
      
      data.forEach((tally) => {
        if (tally.tallyType !== 'NORMAL') return // Only NORMAL type
        
        if (!countMap.has(tally.studentId)) {
          countMap.set(tally.studentId, {
            studentId: tally.studentId,
            studentName: tally.studentName,
            admissionNumber: tally.admissionNumber,
            studentClass: tally.studentClass,
            count: 0,
            rupees: 0,
            issuedByName: tally.issuedByName,
            lastDate: tally.issuedAt,
          })
        }
        
        const entry = countMap.get(tally.studentId)!
        entry.count += tally.count || 1 // Sum the count from each tally entry
        entry.rupees = entry.count * 10
        entry.lastDate = tally.issuedAt
      })

      setTallyCountMap(countMap)

      // Extract unique classes and tally types
      const uniqueClasses = [...new Set(data.map((t) => t.studentClass).filter(Boolean))]
      const uniqueTypes = [...new Set(data.map((t) => t.tallyTypeName))]
      setClasses(uniqueClasses as string[])
      setTallyTypes(uniqueTypes as string[])
    } catch (error) {
      console.error("Failed to fetch tallies:", error)
      toast.error("Failed to load tallies")
    } finally {
      setLoading(false)
    }
  }

  const filteredTallies = Array.from(tallyCountMap.values()).filter((tally) => {
    const matchesSearch = 
      tally.studentName.toLowerCase().includes(search.toLowerCase()) ||
      tally.admissionNumber.toLowerCase().includes(search.toLowerCase())
    
    const matchesClass = classFilter === "all" || tally.studentClass === classFilter
    
    return matchesSearch && matchesClass
  }).sort((a, b) => b.count - a.count) // Sort by count descending

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tally Management</h1>
                <p className="text-sm text-gray-600">{staffName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/tally/manage">
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Manage Types
                </Button>
              </Link>
              <Link href="/admin/tally/add">
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                  Add Tally
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or admission..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "summary" ? "default" : "outline"}
                  onClick={() => setViewMode("summary")}
                  className="flex-1"
                >
                  Summary
                </Button>
                <Button
                  variant={viewMode === "logs" ? "default" : "outline"}
                  onClick={() => setViewMode("logs")}
                  className="flex-1"
                >
                  Detailed Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tallies Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2">Loading students tally...</p>
              </div>
            ) : viewMode === "summary" ? (
              // Summary View
              <>
                {filteredTallies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tallies found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold">Student</th>
                          <th className="text-left py-3 px-4 font-semibold">Admission#</th>
                          <th className="text-left py-3 px-4 font-semibold">Class</th>
                          <th className="text-center py-3 px-4 font-semibold">Tally Count</th>
                          <th className="text-center py-3 px-4 font-semibold">Rupees</th>
                          <th className="text-left py-3 px-4 font-semibold">Issued By</th>
                          <th className="text-left py-3 px-4 font-semibold">Last Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTallies.map((tally) => (
                          <tr key={tally.studentId} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{tally.studentName}</td>
                            <td className="py-3 px-4">{tally.admissionNumber}</td>
                            <td className="py-3 px-4">{tally.studentClass || "-"}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                {tally.count}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                ₹{tally.rupees}
                              </span>
                            </td>
                            <td className="py-3 px-4">{tally.issuedByName}</td>
                            <td className="py-3 px-4">{new Date(tally.lastDate).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              // Detailed Logs View
              <>
                {tallies.filter(t => t.tallyType === 'NORMAL').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tally logs found</div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tallies
                      .filter(t => t.tallyType === 'NORMAL')
                      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime())
                      .map((tally) => (
                        <div key={tally.id} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Student</p>
                              <p className="font-semibold text-gray-900">{tally.studentName}</p>
                              <p className="text-xs text-gray-600">{tally.admissionNumber}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Violation</p>
                              <p className="font-semibold text-gray-900">{tally.tallyTypeName}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Count & Amount</p>
                              <div className="flex gap-2">
                                <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  {tally.count} tallies
                                </span>
                                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                                  ₹{tally.count * 10}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium">Date & Staff</p>
                              <p className="font-semibold text-gray-900">{new Date(tally.issuedAt).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-600">{tally.issuedByName}</p>
                            </div>
                          </div>
                          {tally.reason && (
                            <div className="mt-2 pt-2 border-t">
                              <p className="text-xs text-gray-500 font-medium">Reason</p>
                              <p className="text-sm text-gray-700">{tally.reason}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-sm text-gray-600">
          Total Students with Tallies: <span className="font-semibold">{filteredTallies.length}</span>
          <span className="ml-4">Total Tallies: <span className="font-semibold text-green-600">{Array.from(tallyCountMap.values()).reduce((sum, t) => sum + t.count, 0)}</span></span>
          <span className="ml-4">Total Rupees: <span className="font-semibold text-blue-600">₹{Array.from(tallyCountMap.values()).reduce((sum, t) => sum + t.rupees, 0)}</span></span>
        </div>
      </main>
    </div>
  )
}
