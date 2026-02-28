"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LogOut, ChevronLeft, Plus, Upload, Trash2, Edit2, Search, Users, GraduationCap, X, FileSpreadsheet } from "lucide-react"
import * as XLSX from "xlsx"
import { handleLogout } from "@/lib/auth-utils"
import { BackToDashboard } from "@/components/back-to-dashboard"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
  phone_name?: string
  class_name?: string
  roll_no?: string
  special_pass: string
}

export default function ManageStudents() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [selectedLocker, setSelectedLocker] = useState("all")
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])

  // Add/Edit Student Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newStudent, setNewStudent] = useState({
    admission_number: "",
    name: "",
    locker_number: "",
    phone_name: "",
    class_name: "",
    roll_no: "",
    special_pass: "NO",
  })

  // Bulk Import
  const [showBulkModal, setShowBulkModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isAuthorized, setIsAuthorized] = useState(false)

  // Calculate memos BEFORE early returns (Rules of Hooks)
  const { lockers, classes } = useMemo(() => {
    const classSet = new Set<string>()
    const lockerSet = new Set<string>()
    students.forEach((s) => {
      if (s.class_name) classSet.add(s.class_name)
      if (s.locker_number) lockerSet.add(s.locker_number)
    })
    return {
      classes: ["all", ...Array.from(classSet).sort()],
      lockers: ["all", ...Array.from(lockerSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))]
    }
  }, [students])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const permissions = JSON.parse(localStorage.getItem("permissions") || "[]")
    const name = localStorage.getItem("staffName")

    if (!token || (role !== "admin" && !permissions.includes("manage_students"))) {
      router.replace(token ? "/dashboard" : "/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Staff")

    fetchStudents()
  }, [router])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()
      const studentList = Array.isArray(data) ? data : []
      setStudents(studentList)
      setFilteredStudents(studentList)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      setLoading(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse tracking-wide">Checking permissions...</p>
        </div>
    </div>
    )
  }

  const handleSearch = (query: string, className: string = selectedClass, lockerNo: string = selectedLocker) => {
    setSearchQuery(query)
    setSelectedClass(className)
    setSelectedLocker(lockerNo)

    let filtered = students

    if (className !== "all") {
      filtered = filtered.filter((s) => s.class_name === className)
    }

    if (lockerNo !== "all") {
      filtered = filtered.filter((s) => s.locker_number === lockerNo)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(q) ||
          student.admission_number.toLowerCase().includes(q) ||
          student.locker_number.toLowerCase().includes(q) ||
          (student.class_name && student.class_name.toLowerCase().includes(q)) ||
          (student.roll_no && student.roll_no.toLowerCase().includes(q))
      )
    }

    setFilteredStudents(filtered)
  }

  const handleAddStudent = async () => {
    if (!newStudent.admission_number || !newStudent.name || !newStudent.locker_number) {
      alert("Please fill in required fields (Name, Admission No, Locker No)")
      return
    }

    const oldStudents = [...students]
    const tempId = Date.now()
    const studentToSave = { ...newStudent, id: isEditing ? editingId! : tempId }

    // Optimistic Update
    if (isEditing) {
      const updated = students.map(s => s.id === editingId ? studentToSave : s)
      setStudents(updated)
      setFilteredStudents(updated)
    } else {
      const updated = [...students, studentToSave]
      setStudents(updated)
      setFilteredStudents(updated)
    }

    setShowAddModal(false)

    try {
      const url = "/api/students"
      const method = isEditing ? "PUT" : "POST"
      const body = isEditing ? { ...newStudent, id: editingId } : newStudent

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let errorMessage = `Failed to ${isEditing ? 'update' : 'add'} student`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = `Failed to ${isEditing ? 'update' : 'add'} student: ${errorData.error}`
          }
        } catch (e) {
          errorMessage = `Failed to ${isEditing ? 'update' : 'add'} student: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const savedStudent = await response.json()

      // Update with real data from server
      const finalStudents = isEditing
        ? students.map(s => s.id === editingId ? savedStudent : s)
        : oldStudents.concat(savedStudent)

      setStudents(finalStudents)
      setFilteredStudents(finalStudents)

      setNewStudent({
        admission_number: "",
        name: "",
        locker_number: "",
        phone_name: "",
        class_name: "",
        roll_no: "",
        special_pass: "NO",
      })
      setIsEditing(false)
      setEditingId(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'add'} student`
      setStudents(oldStudents)
      setFilteredStudents(oldStudents)
      alert(errorMessage)
    }
  }

  const handleEditClick = (student: Student) => {
    setNewStudent({
      admission_number: student.admission_number,
      name: student.name,
      locker_number: student.locker_number,
      phone_name: student.phone_name || "",
      class_name: student.class_name || "",
      roll_no: student.roll_no || "",
      special_pass: (student as any).special_pass || "NO",
    })
    setEditingId(student.id)
    setIsEditing(true)
    setShowAddModal(true)
  }

  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const fileReader = new FileReader()
      fileReader.onload = async (e) => {
        const buffer = e.target?.result
        const workbook = XLSX.read(buffer, { type: "array" })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(worksheet) as any[]

        if (data.length === 0) {
          alert("No data found in Excel file")
          return
        }

        // Parse Excel data
        const importedStudents = data.map((row) => {
          const findValue = (possibleKeys: string[]) => {
            const key = Object.keys(row).find(k => {
              const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              return possibleKeys.some(pk =>
                cleanKey === pk.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                cleanKey.includes(pk.toLowerCase().replace(/[^a-z0-9]/g, ''))
              );
            });
            return key ? String(row[key]).trim() : "";
          };

          return {
            admission_number: findValue(["admissionnumber", "admissionno", "admno", "admission"]),
            name: findValue(["name", "studentname", "fullname"]),
            locker_number: findValue(["lockernumber", "lockerno", "locker"]),
            phone_name: findValue(["phonename", "phonenumber", "handset", "model", "phone", "phonemodel", "handsetname", "phone_name"]),
            class_name: findValue(["classname", "class", "grade", "class_name"]),
            roll_no: findValue(["rollno", "rollnumber", "roll", "roll_no"]),
            special_pass: "NO",
          };
        }).filter(s => s.admission_number && s.name && s.locker_number)

        if (importedStudents.length === 0) {
          alert("No valid students found in Excel. Make sure columns are: admission_number, name, locker_number, phone, class, roll_no")
          return
        }

        // Optimistically update UI instantly
        const tempIdStart = Date.now();
        const optimisticStudents = importedStudents.map((s, index) => ({
          ...s,
          id: tempIdStart + index,
          special_pass: "NO"
        }));

        setStudents(prev => [...prev, ...optimisticStudents]);
        setFilteredStudents(prev => [...prev, ...optimisticStudents]);
        setShowBulkModal(false);

        // Background bulk import with client-side batching
        const BATCH_SIZE = 25;
        let completed = 0;
        let failed = false;

        (async () => {
          try {
            for (let i = 0; i < optimisticStudents.length; i += BATCH_SIZE) {
              if (failed) break;

              const batch = optimisticStudents.slice(i, i + BATCH_SIZE);

              const response = await fetch("/api/students/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(batch),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Batch failed: ${response.statusText}`);
              }

              const result = await response.json();
              completed += result.count;
            }

            fetchStudents(); // Refresh to get real IDs
          } catch (err) {
            failed = true;
            const errorMessage = err instanceof Error ? err.message : "Failed to import students. Please try again.";
            alert(errorMessage);
            fetchStudents(); // Rollback on error
          }
        })();
      }
      fileReader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error reading file:", error)
      alert("Error reading file. Please check the format.")
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDeleteStudent = async (id: number) => {
    if (confirm("Are you sure you want to delete this student?")) {
      const oldStudents = [...students]
      const updated = students.filter((s) => s.id !== id)
      setStudents(updated)
      setFilteredStudents(updated)

      try {
        const response = await fetch(`/api/students?id=${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          let errorMessage = "Failed to delete student"
          try {
            const errorData = await response.json()
            if (errorData.error) {
              errorMessage = `Failed to delete student: ${errorData.error}`
            }
          } catch (e) {
            errorMessage = `Failed to delete student: ${response.statusText}`
          }
          throw new Error(errorMessage)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete student"
        setStudents(oldStudents)
        setFilteredStudents(oldStudents)
        alert(errorMessage)
      }
    }
  }

  const handleDeleteAllStudents = async () => {
    if (confirm("Are you sure you want to delete ALL students? This action cannot be undone!")) {
      const oldStudents = [...students]
      setStudents([])
      setFilteredStudents([])

      try {
        const response = await fetch("/api/students?action=deleteAll", {
          method: "PATCH",
        })

        if (!response.ok) {
          let errorMessage = "Failed to delete all students"
          try {
            const errorData = await response.json()
            if (errorData.error) {
              errorMessage = `Failed to delete all students: ${errorData.error}`
            }
          } catch (e) {
            errorMessage = `Failed to delete all students: ${response.statusText}`
          }
          throw new Error(errorMessage)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete all students"
        setStudents(oldStudents)
        setFilteredStudents(oldStudents)
        alert(errorMessage)
      }
    }
  }

  return (
    <div className="min-h-screen relative bg-[#fafafa] overflow-x-hidden font-sans pb-24 text-slate-800">

      {/* Subtle Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-10%] w-[500px] h-[500px] rounded-full bg-slate-100/50 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div
            className="flex items-center gap-3 w-full sm:w-auto cursor-pointer group hover:opacity-80 transition-opacity"
            onClick={() => {
              const role = localStorage.getItem("role")
              const specialPass = localStorage.getItem("special_pass")
              if (role === "admin" || specialPass === "YES") {
                router.push("/admin")
              } else {
                router.push("/dashboard")
              }
            }}
          >
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="rounded-xl shrink-0 group-hover:bg-slate-100 pointer-events-none"
            >
              <div><ChevronLeft className="w-5 h-5 text-slate-700" /></div>
            </Button>
              <BackToDashboard />
            <div className="min-w-0 pointer-events-none">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                Manage Students
              </h1>
              <p className="text-xs sm:text-sm font-medium text-slate-500 truncate mt-0.5">
                Logged in as: {staffName}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl gap-2 font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Controls Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Student Management</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Manage all students in the system</p>
          </div>

          <div className="space-y-4">
            {/* Search & Select Bars */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, admission, locker, or roll..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-slate-200 shadow-none text-sm transition-colors"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  value={selectedClass}
                  onChange={(e) => handleSearch(searchQuery, e.target.value, selectedLocker)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors text-slate-700 font-medium"
                >
                  <option value="all">All Classes</option>
                  {classes.filter((c: string) => c !== "all").map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3 relative flex gap-2">
                <select
                  value={selectedLocker}
                  onChange={(e) => handleSearch(searchQuery, selectedClass, e.target.value)}
                  className="w-full h-11 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 focus:bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors text-slate-700 font-medium"
                >
                  <option value="all">All Lockers</option>
                  {lockers.filter((l: string) => l !== "all").map((l: string) => (
                    <option key={l} value={l}>Locker {l}</option>
                  ))}
                </select>
                {(searchQuery || selectedClass !== "all" || selectedLocker !== "all") && (
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => handleSearch("", "all", "all")}
                    className="shrink-0 h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 mt-2">
              <Button
                onClick={() => setShowAddModal(true)}
                className="w-full h-11 rounded-xl bg-[#1e1e1e] hover:bg-black text-white font-semibold shadow-none transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
              <Button
                onClick={() => setShowBulkModal(true)}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-none transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
              <Button
                onClick={handleDeleteAllStudents}
                className="w-full h-11 rounded-xl font-semibold bg-[#e10000] hover:bg-[#c80000] text-white shadow-none transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All
              </Button>
            </div>
          </div>
        </div>

        {/* Student Data Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)] min-h-[400px]">
          <div className="mb-5 pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Students ({filteredStudents.length})</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Total: {students.length} students</p>
          </div>

          <div className="w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-medium text-slate-400">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GraduationCap className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-base font-medium text-slate-400">
                  {students.length === 0 ? "No students added yet." : "No matching students found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Minimalist Mobile List Layout for smaller screens, responsive table for desktop */}
                <div className="hidden sm:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="py-3 pr-4 font-semibold text-slate-900 text-sm">Name</th>
                        <th className="py-3 px-4 font-semibold text-slate-900 text-sm">Admission No.</th>
                        <th className="py-3 px-4 font-semibold text-slate-900 text-sm">Class / Roll</th>
                        <th className="py-3 px-4 font-semibold text-slate-900 text-sm">Locker</th>
                        <th className="py-3 px-4 font-semibold text-slate-900 text-sm">Phone/Pass</th>
                        <th className="py-3 pl-4 font-semibold text-slate-900 text-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredStudents.map((student) => {
                        const hasNoPhone = !student.phone_name || student.phone_name.toLowerCase() === "nill" || student.phone_name.toLowerCase() === "nil" || student.phone_name.toLowerCase() === "none"

                        return (
                          <tr key={student.id} className={`group hover:bg-slate-50 transition-colors ${hasNoPhone ? 'bg-[#fffae5]/30' : ''}`}>
                            <td className="py-3 pr-4">
                              <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm font-medium text-slate-600">{student.admission_number}</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                  {student.class_name || "-"}
                                </span>
                                <span className="text-xs font-semibold text-slate-500">
                                  R: {student.roll_no || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200/50">
                                {student.locker_number}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${hasNoPhone ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {student.phone_name || "Nill"}
                                </span>
                                {student.special_pass === "YES" && (
                                  <span className="text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded uppercase">Special Pass</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pl-4 text-right">
                              <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg" onClick={() => handleEditClick(student)}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteStudent(student.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Clean List Layout */}
                <div className="sm:hidden flex flex-col">
                  <div className="flex text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 mb-2 px-1">
                    <div className="flex-1">Name</div>
                    <div className="w-24 text-right">Admission No.</div>
                  </div>
                  <div className="space-y-1">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="relative group p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 pr-3">
                            <p className="font-bold text-slate-900 text-sm leading-snug">{student.name}</p>
                            <div className="mt-1 flex gap-1.5 flex-wrap">
                              {student.class_name && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">{student.class_name}</span>}
                              <span className="text-[10px] text-slate-400 font-medium">L: {student.locker_number}</span>
                              {!student.phone_name || student.phone_name.toLowerCase() === "nill" || student.phone_name.toLowerCase() === "nil" || student.phone_name.toLowerCase() === "none" ? (
                                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-semibold border border-amber-100/50">No Phone</span>
                              ) : null}
                              {student.special_pass === "YES" && (
                                <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-semibold border border-green-100/50">Pass</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end pt-0.5">
                            <p className="text-sm font-medium text-slate-700">{student.admission_number}</p>
                            <div className="flex gap-1 mt-2">
                              <button onClick={() => handleEditClick(student)} className="p-1 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-200 rounded-md transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteStudent(student.id)} className="p-1 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Student Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open)
        if (!open) {
          setIsEditing(false)
          setEditingId(null)
          setNewStudent({
            admission_number: "",
            name: "",
            locker_number: "",
            phone_name: "",
            class_name: "",
            roll_no: "",
            special_pass: "NO",
          })
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {isEditing ? 'Update the student details below' : 'Enter the student details below'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500 ml-1">Name *</label>
              <Input
                placeholder="Student name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Admission No *</label>
                <Input
                  placeholder="Admission number"
                  value={newStudent.admission_number}
                  onChange={(e) => setNewStudent({ ...newStudent, admission_number: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Locker No *</label>
                <Input
                  placeholder="Locker number"
                  value={newStudent.locker_number}
                  onChange={(e) => setNewStudent({ ...newStudent, locker_number: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2">
              <input
                type="checkbox"
                id="phone_active"
                checked={!(!newStudent.phone_name || newStudent.phone_name.toLowerCase() === "nill" || newStudent.phone_name.toLowerCase() === "nil" || newStudent.phone_name.toLowerCase() === "none")}
                onChange={(e) => setNewStudent({ ...newStudent, phone_name: e.target.checked ? "" : "NIL" })}
                className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <label htmlFor="phone_active" className="text-sm font-bold text-slate-700 cursor-pointer">
                Phone Active <span className="text-xs font-medium text-slate-400 block">(Checked if student has a registered phone)</span>
              </label>
            </div>

            {!(!newStudent.phone_name || newStudent.phone_name.toLowerCase() === "nill" || newStudent.phone_name.toLowerCase() === "nil" || newStudent.phone_name.toLowerCase() === "none") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Phone Name</label>
                <Input
                  placeholder="Phone model"
                  value={newStudent.phone_name === "NIL" ? "" : newStudent.phone_name}
                  onChange={(e) => setNewStudent({ ...newStudent, phone_name: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Class</label>
                <Input
                  placeholder="e.g. 10A"
                  value={newStudent.class_name}
                  onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 ml-1">Roll No</label>
                <Input
                  placeholder="Roll number"
                  value={newStudent.roll_no}
                  onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })}
                  className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2">
              <input
                type="checkbox"
                id="special_pass"
                checked={newStudent.special_pass === "YES"}
                onChange={(e) => setNewStudent({ ...newStudent, special_pass: e.target.checked ? "YES" : "NO" })}
                className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <label htmlFor="special_pass" className="text-sm font-bold text-slate-700 cursor-pointer">
                Special Phone Pass <span className="text-xs font-medium text-slate-400 block">(Admin override)</span>
              </label>
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
              <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1 h-11 rounded-xl font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-none transition-colors">
                Cancel
              </Button>
              <Button onClick={handleAddStudent} className="flex-1 h-11 rounded-xl font-bold bg-[#1e1e1e] hover:bg-black text-white shadow-none transition-colors">
                {isEditing ? 'Save Changes' : 'Add Student'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="sm:max-w-md rounded-3xl border-slate-200 p-6">
          <DialogHeader className="mb-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 border border-blue-100/50">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">Import Students</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">Build your database quickly using Excel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-sm font-bold text-slate-700 mb-2">
                Required Columns:
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md">admission_number</span>
                <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md">name</span>
                <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md">locker_number</span>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Optional: phone_name, class, roll_no
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-900">Select File</label>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleBulkImport}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer border border-slate-200 rounded-xl bg-white p-1"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <Button onClick={() => setShowBulkModal(false)} variant="outline" className="w-full h-11 rounded-xl font-bold bg-white hover:bg-slate-50 border-slate-200 shadow-none transition-colors">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
