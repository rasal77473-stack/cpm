"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, LogOut, Plus, Search, Star } from "lucide-react"
import { handleLogout } from "@/lib/auth-utils"
import { toast } from "sonner"

interface StudentStar {
  id: number
  studentId: number
  studentName: string
  admissionNumber: string
  studentClass: string | null
  stars: number
  awardedBy: number
  awardedByName: string
  reason: string | null
  awardedAt: string
}

export default function RewardsManagementPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [stars, setStars] = useState<StudentStar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [classes, setClasses] = useState<string[]>([])
  const [awardingStars, setAwardingStars] = useState<number | null>(null)
  const [removingStars, setRemovingStars] = useState<number | null>(null)

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
    fetchStars()
  }, [router])

  const fetchStars = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/students/with-stars")
      if (!res.ok) throw new Error("Failed to fetch stars")
      const data: StudentStar[] = await res.json()
      setStars(data.filter(s => s.stars > 0)) // Only show students with stars

      // Extract unique classes
      const uniqueClasses = [...new Set(data.map((s) => s.studentClass).filter(Boolean))]
      setClasses(uniqueClasses as string[])
    } catch (error) {
      console.error("Failed to fetch stars:", error)
      toast.error("Failed to load stars")
    } finally {
      setLoading(false)
    }
  }

  const awardStar = async (studentId: number, studentName: string) => {
    try {
      setAwardingStars(studentId)
      const token = localStorage.getItem("token")
      
      const res = await fetch(`/api/students/${studentId}/stars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "award",
          stars: 1,
          awardedBy: parseInt(localStorage.getItem("userId") || "0"),
          awardedByName: staffName,
          reason: "Awarded for good behavior",
        }),
      })

      if (res.ok) {
        toast.success(`⭐ Star awarded to ${studentName}!`)
        fetchStars()
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to award star")
      }
    } catch (error) {
      console.error("Error awarding star:", error)
      toast.error("Failed to award star")
    } finally {
      setAwardingStars(null)
    }
  }

  const removeStar = async (studentId: number, studentName: string) => {
    try {
      setRemovingStars(studentId)
      const token = localStorage.getItem("token")
      
      const res = await fetch(`/api/students/${studentId}/stars`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "remove",
          stars: 1,
          awardedBy: parseInt(localStorage.getItem("userId") || "0"),
          awardedByName: staffName,
          reason: "Star removed",
        }),
      })

      if (res.ok) {
        toast.success(`⭐ Star removed from ${studentName}`)
        fetchStars()
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to remove star")
      }
    } catch (error) {
      console.error("Error removing star:", error)
      toast.error("Failed to remove star")
    } finally {
      setRemovingStars(null)
    }
  }

  const filteredStars = stars.filter((star) => {
    const matchesSearch = 
      star.studentName.toLowerCase().includes(search.toLowerCase()) ||
      star.admissionNumber.toLowerCase().includes(search.toLowerCase())
    
    const matchesClass = classFilter === "all" || star.studentClass === classFilter
    
    return matchesSearch && matchesClass
  })

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Verifying credentials...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">Rewards & Achievements</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{staffName}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-1 p-2" size="icon">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-20 sm:pb-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Stars Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2">Loading stars...</p>
              </div>
            ) : filteredStars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No stars awarded yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Student</th>
                      <th className="text-left py-3 px-4 font-semibold">Admission#</th>
                      <th className="text-left py-3 px-4 font-semibold">Class</th>
                      <th className="text-center py-3 px-4 font-semibold">Stars</th>
                      <th className="text-left py-3 px-4 font-semibold">Awarded By</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-center py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStars.map((star) => (
                      <tr key={star.studentId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{star.studentName}</td>
                        <td className="py-3 px-4">{star.admissionNumber}</td>
                        <td className="py-3 px-4">{star.studentClass || "-"}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-semibold flex items-center justify-center gap-1 w-full">
                            <Star className="w-4 h-4 fill-amber-500" />
                            {star.stars}
                          </span>
                        </td>
                        <td className="py-3 px-4">{star.awardedByName}</td>
                        <td className="py-3 px-4">{new Date(star.awardedAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => awardStar(star.studentId, star.studentName)}
                              disabled={awardingStars === star.studentId}
                              className="gap-1 text-xs"
                            >
                              <Star className="w-3 h-3" />
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeStar(star.studentId, star.studentName)}
                              disabled={removingStars === star.studentId}
                              className="gap-1 text-xs text-red-600 hover:text-red-800"
                            >
                              <Star className="w-3 h-3" />
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
