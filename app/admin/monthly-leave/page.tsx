"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChevronLeft, Search, Calendar, LogOut, Users, Check, X, Loader2, Clock, CalendarDays, Gift } from "lucide-react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function MonthlyLeavePage() {
    const router = useRouter()
    const [staffName, setStaffName] = useState("")
    const [staffId, setStaffId] = useState<number | null>(null)
    const [isAuthorized, setIsAuthorized] = useState(false)

    // Form states
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("18:00")
    const [excludedStudents, setExcludedStudents] = useState<Set<number>>(new Set())
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedClass, setSelectedClass] = useState("all")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [activeLeaveToGrant, setActiveLeaveToGrant] = useState<number | null>(null)

    // Fetch students
    const { data: studentsData = [], isLoading: studentsLoading } = useSWR("/api/students", fetcher)
    const students = Array.isArray(studentsData) ? studentsData : []

    // Fetch existing monthly leaves
    const { data: leavesData = [], isLoading: leavesLoading } = useSWR("/api/monthly-leave", fetcher)
    const leaves = Array.isArray(leavesData) ? leavesData : []

    useEffect(() => {
        const token = localStorage.getItem("token")
        const role = localStorage.getItem("role")
        const name = localStorage.getItem("staffName")
        const id = localStorage.getItem("staffId")

        if (!token) {
            router.push("/login")
            return
        }

        // Only admin can access this page
        if (role !== "admin") {
            router.replace("/dashboard")
            return
        }

        setIsAuthorized(true)
        setStaffName(name || "Admin")
        
        // Parse staffId safely
        if (id && !isNaN(parseInt(id))) {
            setStaffId(parseInt(id))
        } else {
            // If no valid staffId, try to get from a default or set to 0
            setStaffId(0)
        }
    }, [router])

    // Get unique classes for filtering
    const classes = useMemo(() => {
        const uniqueClasses = new Set(students.map((s: any) => s.class_name).filter(Boolean))
        return ["all", ...Array.from(uniqueClasses).sort()]
    }, [students])

    // Filter students
    const filteredStudents = useMemo(() => {
        let filtered = students

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter((s: any) =>
                s.name?.toLowerCase().includes(q) ||
                s.admission_number?.toLowerCase().includes(q)
            )
        }

        if (selectedClass !== "all") {
            filtered = filtered.filter((s: any) => s.class_name === selectedClass)
        }

        return filtered.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
    }, [students, searchQuery, selectedClass])

    // Toggle student eligibility
    const toggleExclusion = (studentId: number) => {
        setExcludedStudents((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(studentId)) {
                newSet.delete(studentId)
            } else {
                newSet.add(studentId)
            }
            return newSet
        })
    }

    // Handle form submission
    const handleSubmit = async () => {
        if (!startDate || !endDate || !startTime || !endTime) {
            toast.error("Please fill in all required fields")
            return
        }

        if (staffId === null || staffId === undefined || !staffName) {
            toast.error("Admin info not loaded. Please refresh the page and login again.")
            console.error("Missing admin info:", { staffId, staffName })
            return
        }

        // Convert date strings to ISO datetime strings with time component
        const startDateTime = new Date(`${startDate}T${startTime}:00`)
        const endDateTime = new Date(`${endDate}T${endTime}:00`)

        if (startDateTime > endDateTime) {
            toast.error("Start date cannot be after end date")
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch("/api/monthly-leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startDate: startDateTime.toISOString(),
                    endDate: endDateTime.toISOString(),
                    startTime,
                    endTime,
                    createdBy: staffId,
                    createdByName: staffName,
                    excludedStudents: Array.from(excludedStudents),
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || "Failed to create monthly leave")
            }

            const data = await response.json()
            toast.success("Monthly leave created successfully!")

            // Reset form
            setStartDate("")
            setEndDate("")
            setStartTime("09:00")
            setEndTime("18:00")
            setExcludedStudents(new Set())

            // Refresh leaves list
            mutate("/api/monthly-leave")

            // Ask to grant passes now
            setActiveLeaveToGrant(data.id)
            setShowConfirmDialog(true)
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to create monthly leave"
            console.error("Error creating monthly leave:", error)
            toast.error(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Grant passes for a leave
    const handleGrantPasses = async (leaveId: number) => {
        try {
            const response = await fetch(`/api/monthly-leave/${leaveId}/grant`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mentorId: staffId,
                    mentorName: staffName,
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to grant passes")
            }

            const data = await response.json()
            toast.success(`${data.granted} special passes granted!`)
            mutate("/api/monthly-leave")
            mutate("/api/special-pass/all")
        } catch (error) {
            toast.error("Failed to grant passes")
        } finally {
            setShowConfirmDialog(false)
            setActiveLeaveToGrant(null)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("staffId")
        localStorage.removeItem("staffName")
        localStorage.removeItem("role")
        localStorage.removeItem("permissions")
        router.push("/login")
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Verifying admin access...</p>
                </div>
            </div>
        )
    }

    const eligibleCount = students.length - excludedStudents.size

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/dashboard")}
                            className="rounded-full shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                                <CalendarDays className="w-6 h-6 text-purple-600" />
                                Monthly Leave Management
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Create leave schedules and auto-grant passes</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Form */}
                    <div className="space-y-6">
                        {/* Leave Schedule Form */}
                        <Card className="border-2 border-purple-200 dark:border-purple-900">
                            <CardHeader className="bg-purple-50 dark:bg-purple-900/20">
                                <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-400">
                                    <Calendar className="w-5 h-5" />
                                    Create Monthly Leave
                                </CardTitle>
                                <CardDescription>Set the leave dates and times for auto-granting passes</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date *</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date *</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Time Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startTime">Start Time *</Label>
                                        <Input
                                            id="startTime"
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endTime">End Time *</Label>
                                        <Input
                                            id="endTime"
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Reason (Fixed) */}
                                <div className="space-y-2">
                                    <Label>Reason</Label>
                                    <Input value="Monthly Leave" disabled className="bg-muted" />
                                </div>

                                {/* Summary */}
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-green-800 dark:text-green-400">Eligible Students</p>
                                            <p className="text-sm text-green-600 dark:text-green-500">Will receive special pass</p>
                                        </div>
                                        <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                                            {eligibleCount}
                                        </div>
                                    </div>
                                </div>

                                {excludedStudents.size > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-red-800 dark:text-red-400">Ineligible Students</p>
                                                <p className="text-sm text-red-600 dark:text-red-500">Will NOT receive pass</p>
                                            </div>
                                            <div className="text-3xl font-bold text-red-700 dark:text-red-400">
                                                {excludedStudents.size}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !startDate || !endDate || staffId === null || staffId === undefined || !staffName}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-lg"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Creating Leave...
                                        </>
                                    ) : (
                                        <>
                                            <Gift className="w-5 h-5 mr-2" />
                                            <span className="hidden sm:inline">Create Monthly Leave & Select Students</span>
                                            <span className="sm:hidden">Create Leave</span>
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Existing Leaves */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Recent Monthly Leaves
                                </CardTitle>
                                <CardDescription>Previous leave schedules</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {leavesLoading ? (
                                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                                ) : leaves.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No monthly leaves created yet</div>
                                ) : (
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {leaves.slice(0, 10).map((leave: any) => (
                                            <div
                                                key={leave.id}
                                                className="p-3 rounded-lg border bg-muted/50 flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">
                                                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {leave.startTime} - {leave.endTime} • Created by {leave.createdByName}
                                                    </p>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${leave.status === "ACTIVE"
                                                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                                    : leave.status === "COMPLETED"
                                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                        : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                                                    }`}>
                                                    {leave.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Student Selection */}
                    <div>
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    Select Eligible Students
                                </CardTitle>
                                <CardDescription>
                                    All students are eligible by default. Click to mark as ineligible.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search & Filter */}
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search students..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                                        <SelectTrigger className="w-[150px]">
                                            <SelectValue placeholder="Class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map((cls) => (
                                                <SelectItem key={cls} value={cls}>
                                                    {cls === "all" ? "All Classes" : cls}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExcludedStudents(new Set())}
                                        className="flex-1"
                                    >
                                        <Check className="w-4 h-4 mr-1" />
                                        All Eligible
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setExcludedStudents(new Set(students.map((s: any) => s.id)))}
                                        className="flex-1"
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        All Ineligible
                                    </Button>
                                </div>

                                {/* Student List */}
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {studentsLoading ? (
                                            <div className="text-center py-8 text-muted-foreground">Loading students...</div>
                                        ) : filteredStudents.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">No students found</div>
                                        ) : (
                                            <table className="w-full">
                                                <thead className="bg-muted sticky top-0">
                                                    <tr>
                                                        <th className="text-left p-3 text-sm font-medium">Student</th>
                                                        <th className="text-left p-3 text-sm font-medium">Class</th>
                                                        <th className="text-center p-3 text-sm font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredStudents.map((student: any) => {
                                                        const isExcluded = excludedStudents.has(student.id)
                                                        return (
                                                            <tr
                                                                key={student.id}
                                                                className={`border-t cursor-pointer transition-colors ${isExcluded
                                                                    ? "bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20"
                                                                    : "hover:bg-muted/50"
                                                                    }`}
                                                                onClick={() => toggleExclusion(student.id)}
                                                            >
                                                                <td className="p-3">
                                                                    <p className="font-medium">{student.name}</p>
                                                                    <p className="text-xs text-muted-foreground">{student.admission_number}</p>
                                                                </td>
                                                                <td className="p-3 text-sm">{student.class_name || "-"}</td>
                                                                <td className="p-3 text-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant={isExcluded ? "destructive" : "default"}
                                                                        className={`w-24 ${!isExcluded ? "bg-green-600 hover:bg-green-700" : ""}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            toggleExclusion(student.id)
                                                                        }}
                                                                    >
                                                                        {isExcluded ? (
                                                                            <>
                                                                                <X className="w-3 h-3 mr-1" />
                                                                                Ineligible
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Check className="w-3 h-3 mr-1" />
                                                                                Eligible
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Confirmation Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Grant Special Passes Now?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Monthly leave created successfully! Would you like to grant special passes to all eligible students now?
                            <br /><br />
                            <strong>{eligibleCount} students</strong> will receive a special pass with reason "Monthly Leave".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Grant Later</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => activeLeaveToGrant && handleGrantPasses(activeLeaveToGrant)}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            <Gift className="w-4 h-4 mr-2" />
                            Grant Passes Now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
