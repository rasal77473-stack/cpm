"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Search, Star, LogOut, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SpecialPassPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [returningPassId, setReturningPassId] = useState<number | null>(null)

  // Fetch all students
  const { data: studentsData = [], isLoading: studentLoading } = useSWR("/api/students", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600000,
  })

  const students = Array.isArray(studentsData) ? studentsData : []

  // Fetch all special passes
  const { data: allPasses = [], isLoading: passesLoading } = useSWR("/api/special-pass/all", fetcher, {
    refreshInterval: 30000,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    setStaffName(localStorage.getItem("staffName") || "Staff")
  }, [router])

  // Filter students with special pass (if needed based on your schema)
  const specialStudents = useMemo(() => {
    return students.filter((s: any) => s.special_pass === "YES")
  }, [students])

  // Filter passes based on search
  const filteredPasses = useMemo(() => {
    if (!searchQuery.trim()) return allPasses
    const q = searchQuery.toLowerCase()
    return allPasses.filter((p: any) =>
      p.studentName?.toLowerCase().includes(q) ||
      p.admissionNumber?.toLowerCase().includes(q) ||
      p.mentorName?.toLowerCase().includes(q) ||
      p.purpose?.toLowerCase().includes(q)
    )
  }, [allPasses, searchQuery])

  const handleReturnPass = async (passId: number) => {
    setReturningPassId(passId)
    try {
      const response = await fetch(`/api/special-pass/return/${passId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to return pass")
      }

      toast.success("Special pass returned successfully")
      mutate("/api/special-pass/all")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return pass")
    } finally {
      setReturningPassId(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard")}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Special Pass Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search Special Passes</CardTitle>
            <CardDescription>Find and manage special pass grants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, admission, mentor, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Special Passes Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Special Pass Records ({filteredPasses.length})
            </CardTitle>
            <CardDescription>View and manage all special pass grants</CardDescription>
          </CardHeader>
          <CardContent>
            {passesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading passes...</div>
            ) : filteredPasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No matching passes found" : "No special passes yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission</TableHead>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPasses.map((pass: any) => (
                      <TableRow key={pass.id}>
                        <TableCell className="font-medium">{pass.studentName || "Unknown"}</TableCell>
                        <TableCell className="text-sm">{pass.admissionNumber}</TableCell>
                        <TableCell className="text-sm">{pass.mentorName}</TableCell>
                        <TableCell className="text-sm max-w-xs truncate">{pass.purpose}</TableCell>
                        <TableCell className="text-sm">
                          {pass.issueTime ? new Date(pass.issueTime).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {pass.returnTime ? new Date(pass.returnTime).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {pass.status === "ACTIVE" && (
                              <>
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-500">Active</span>
                              </>
                            )}
                            {pass.status === "COMPLETED" && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                                <span className="text-sm font-medium text-green-600 dark:text-green-500">Completed</span>
                              </>
                            )}
                            {pass.status === "EXPIRED" && (
                              <>
                                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-500" />
                                <span className="text-sm font-medium text-red-600 dark:text-red-500">Expired</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {pass.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReturnPass(pass.id)}
                              disabled={returningPassId === pass.id}
                            >
                              {returningPassId === pass.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Return"
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
