"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LogOut, ChevronLeft, Plus, Upload, X, Trash2, Edit2 } from "lucide-react"
import * as XLSX from "xlsx"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
  phone_name?: string
  class_name?: string
  roll_no?: string
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
  })

  // Bulk Import
  const [showBulkModal, setShowBulkModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token || role !== "admin") {
      router.push("/login")
      return
    }

    setStaffName(name || "Admin")
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

    try {
      const url = "/api/students"
      const method = isEditing ? "PUT" : "POST"
      const body = isEditing ? { ...newStudent, id: editingId } : newStudent

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'add'} student`)

      const savedStudent = await response.json()
      
      if (isEditing) {
        const updatedStudents = students.map(s => s.id === editingId ? savedStudent : s)
        setStudents(updatedStudents)
        setFilteredStudents(updatedStudents)
      } else {
        const updatedStudents = [...students, savedStudent]
        setStudents(updatedStudents)
        setFilteredStudents(updatedStudents)
      }

      setNewStudent({
        admission_number: "",
        name: "",
        locker_number: "",
        phone_name: "",
        class_name: "",
        roll_no: "",
      })
      setShowAddModal(false)
      setIsEditing(false)
      setEditingId(null)
      alert(`Student ${isEditing ? 'updated' : 'added'} successfully!`)
    } catch (error) {
      console.error(error)
      alert(`Failed to ${isEditing ? 'update' : 'add'} student`)
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
          id: tempIdStart + index
        }));
        
        setStudents(prev => [...prev, ...optimisticStudents]);
        setFilteredStudents(prev => [...prev, ...optimisticStudents]);
        setShowBulkModal(false);

        // Background bulk import
        fetch("/api/students/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(importedStudents),
        }).then(response => {
          if (!response.ok) throw new Error("Bulk import failed")
          return response.json()
        }).then(result => {
          fetchStudents() // Refresh to get real IDs in background
          alert(`Successfully imported ${result.count} students!`)
        }).catch(err => {
          console.error("Bulk import error:", err)
          alert("Failed to import students. Please try again.")
          fetchStudents(); // Rollback on error
        });
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
      try {
        const response = await fetch(`/api/students?id=${id}`, {
          method: "DELETE",
        })

        if (!response.ok) throw new Error("Failed to delete student")

        const updated = students.filter((s) => s.id !== id)
        setStudents(updated)
        setFilteredStudents(updated)
        alert("Student deleted successfully!")
      } catch (error) {
        console.error(error)
        alert("Failed to delete student")
      }
    }
  }

  const handleDeleteAllStudents = async () => {
    if (confirm("Are you sure you want to delete ALL students? This action cannot be undone!")) {
      try {
        const response = await fetch("/api/students?action=deleteAll", {
          method: "PATCH",
        })

        if (!response.ok) throw new Error("Failed to delete all students")

        setStudents([])
        setFilteredStudents([])
        alert("All students deleted successfully!")
      } catch (error) {
        console.error(error)
        alert("Failed to delete all students")
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
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
              onClick={() => router.push("/admin")}
              className="rounded-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Manage Students</h1>
              <p className="text-sm text-muted-foreground mt-1">Logged in as: {staffName}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Action Buttons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Student Management</CardTitle>
            <CardDescription>Manage all students in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  placeholder="Search by name, admission, locker, or roll..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1"
                />
                <select
                  value={selectedClass}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSearch(searchQuery, e.target.value, selectedLocker)}
                  className="w-full md:w-48 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Classes</option>
                  {classes.filter((c: string) => c !== "all").map((c: string) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={selectedLocker}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSearch(searchQuery, selectedClass, e.target.value)}
                  className="w-full md:w-48 h-10 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All Lockers</option>
                  {lockers.filter((l: string) => l !== "all").map((l: string) => (
                    <option key={l} value={l}>Locker {l}</option>
                  ))}
                </select>
                {(searchQuery || selectedClass !== "all" || selectedLocker !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => handleSearch("", "all", "all")}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Single Student
                </Button>
                <Button
                  onClick={() => setShowBulkModal(true)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Import (Excel)
                </Button>
                <Button
                  onClick={handleDeleteAllStudents}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Students
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Students ({filteredStudents.length})</CardTitle>
            <CardDescription>Total: {students.length} students</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {students.length === 0 ? "No students added yet" : "No students match your search"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-4 font-medium">Admission No.</th>
                      <th className="text-left py-3 px-4 font-medium">Locker No.</th>
                      <th className="text-left py-3 px-4 font-medium">Class</th>
                      <th className="text-left py-3 px-4 font-medium">Roll No.</th>
                      <th className="text-left py-3 px-4 font-medium">Phone Name</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const hasNoPhone = !student.phone_name || student.phone_name.toLowerCase() === "nill" || student.phone_name.toLowerCase() === "nil" || student.phone_name.toLowerCase() === "none"
                      
                      return (
                        <tr key={student.id} className={`border-b hover:bg-muted/50 transition-colors ${hasNoPhone ? "bg-yellow-50/50 dark:bg-yellow-900/10" : ""}`}>
                          <td className="py-3 px-4 font-medium">{student.name}</td>
                          <td className="py-3 px-4">{student.admission_number}</td>
                          <td className="py-3 px-4">{student.locker_number}</td>
                          <td className="py-3 px-4">{student.class_name || "-"}</td>
                          <td className="py-3 px-4">{student.roll_no || "-"}</td>
                          <td className={`py-3 px-4 font-medium ${hasNoPhone ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                            {student.phone_name || "Nill"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(student)}
                                className="gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteStudent(student.id)}
                                className="gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
          })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the student details below' : 'Enter the student details below'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Enter student name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admission Number</label>
              <Input
                placeholder="Enter admission number"
                value={newStudent.admission_number}
                onChange={(e) => setNewStudent({ ...newStudent, admission_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Locker Number</label>
              <Input
                placeholder="Enter locker number"
                value={newStudent.locker_number}
                onChange={(e) => setNewStudent({ ...newStudent, locker_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Name</label>
              <Input
                placeholder="Enter phone name"
                value={newStudent.phone_name}
                onChange={(e) => setNewStudent({ ...newStudent, phone_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Input
                placeholder="Enter class"
                value={newStudent.class_name}
                onChange={(e) => setNewStudent({ ...newStudent, class_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Roll No</label>
              <Input
                placeholder="Enter roll number"
                value={newStudent.roll_no}
                onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddStudent} className="flex-1">
                {isEditing ? 'Update Student' : 'Add Student'}
              </Button>
              <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
            <DialogDescription>Import students from an Excel file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-3">
                Upload an Excel file with the following columns:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>admission_number</li>
                <li>name</li>
                <li>locker_number</li>
                <li>phone_name (optional)</li>
                <li>class (optional)</li>
                <li>roll_no (optional)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Excel File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkImport}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Supports .xlsx, .xls, and .csv files</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => setShowBulkModal(false)} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
