"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { LogOut, ChevronLeft, Plus, Upload, X, Trash2 } from "lucide-react"
import * as XLSX from "xlsx"

interface Student {
  id: number
  admission_number: string
  name: string
  locker_number: string
  phone?: string
  class_name?: string
  roll_no?: string
}

export default function ManageStudents() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])

  // Add Student Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({
    admission_number: "",
    name: "",
    locker_number: "",
    phone: "",
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
      setStudents(data)
      setFilteredStudents(data)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredStudents(students)
    } else {
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(query.toLowerCase()) ||
          student.admission_number.toLowerCase().includes(query.toLowerCase()) ||
          student.locker_number.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredStudents(filtered)
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.admission_number || !newStudent.name || !newStudent.locker_number) {
      alert("Please fill in required fields (Name, Admission No, Locker No)")
      return
    }

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      })

      if (!response.ok) throw new Error("Failed to add student")

      const savedStudent = await response.json()
      setStudents([...students, savedStudent])
      setFilteredStudents([...students, savedStudent])
      setNewStudent({
        admission_number: "",
        name: "",
        locker_number: "",
        phone: "",
        class_name: "",
        roll_no: "",
      })
      setShowAddModal(false)
      alert("Student added successfully!")
    } catch (error) {
      console.error(error)
      alert("Failed to add student")
    }
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
        const importedStudents = data.map((row) => ({
          admission_number: String(row.admission_number || row["Admission Number"] || row["admission_number"] || "").trim(),
          name: String(row.name || row["Name"] || row["name"] || "").trim(),
          locker_number: String(row.locker_number || row["Locker Number"] || row["locker_number"] || "").trim(),
          phone: String(row.phone || row["Phone"] || row["phone"] || "").trim(),
          class_name: String(row.class_name || row["Class"] || row["class"] || "").trim(),
          roll_no: String(row.roll_no || row["Roll No"] || row["roll_no"] || "").trim(),
        })).filter(s => s.admission_number && s.name && s.locker_number)

        if (importedStudents.length === 0) {
          alert("No valid students found in Excel. Make sure columns are: admission_number, name, locker_number, phone, class, roll_no")
          return
        }

        // Send to backend in chunks or one by one
        let successCount = 0
        const promises = importedStudents.map(async (student) => {
          try {
            const response = await fetch("/api/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(student),
            })
            if (response.ok) successCount++
          } catch (err) {
            console.error("Failed to import student:", student.name, err)
          }
        })

        await Promise.all(promises)
        
        fetchStudents() // Refresh list from DB
        setShowBulkModal(false)
        alert(`Successfully imported ${successCount} out of ${importedStudents.length} students!`)
      }
      fileReader.readAsArrayBuffer(file)
    } catch (error) {
      console.error("Error importing file:", error)
      alert("Error importing file. Please check the format.")
    }

    // Reset input
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
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name, admission number, or locker number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="flex-1"
                />
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => handleSearch("")}
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
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4">{student.name}</td>
                        <td className="py-3 px-4">{student.admission_number}</td>
                        <td className="py-3 px-4">{student.locker_number}</td>
                        <td className="py-3 px-4">{student.class_name || "-"}</td>
                        <td className="py-3 px-4">{student.roll_no || "-"}</td>
                        <td className="py-3 px-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteStudent(student.id)}
                            className="gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
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

      {/* Add Student Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>Enter the student details below</DialogDescription>
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
              <label className="text-sm font-medium">Phone</label>
              <Input
                placeholder="Enter phone number"
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
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
                Add Student
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
                <li>phone (optional)</li>
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
