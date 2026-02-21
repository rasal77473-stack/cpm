"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Check, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { handleLogout } from "@/lib/auth-utils"
import { Checkbox } from "@/components/ui/checkbox"

interface TallyType {
  id: number
  name: string
  type: string
  description: string | null
  isActive: string
  createdAt: string | null
}

interface Student {
  id: number
  name: string
  admission_number: string
  class_name?: string
}

const emptyForm = {
  name: "",
  type: "FIXED",
  description: "",
}

export default function ManageOtherTallyTypesPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [staffId, setStaffId] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [tallyTypes, setTallyTypes] = useState<TallyType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Modal for type management
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState("")

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeleteId] = useState<number | null>(null)
  const [deletingName, setDeletingName] = useState("")

  // Custom tally form
  const [customTallyName, setCustomTallyName] = useState("")
  const [customTallyCount, setCustomTallyCount] = useState(1)
  const [tallyReason, setTallyReason] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [studentSearch, setStudentSearch] = useState("")
  const [studentPage, setStudentPage] = useState(1)
  const [studentPagination, setStudentPagination] = useState({ total: 0, totalPages: 0, hasMore: false })
  const [studentLoading, setStudentLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")
    const id = localStorage.getItem("staffId")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Admin")
    setStaffId(id || "")
    fetchTallyTypes()
    fetchStudents(1, "")
  }, [router])

  const fetchTallyTypes = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/tally-types")
      if (!res.ok) throw new Error("Failed to fetch tally types")
      const data = await res.json()
      setTallyTypes(data)
    } catch (error) {
      console.error("Failed to fetch tally types:", error)
      toast.error("Failed to load tally types")
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (page: number = 1, search: string = "") => {
    try {
      setStudentLoading(true)
      const params = new URLSearchParams()
      params.append("page", String(page))
      if (search) params.append("search", search)

      const res = await fetch(`/api/students/paginated?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch students")
      }

      const data = await res.json()
      setStudents(data.data || [])
      setStudentPagination(data.pagination || { total: 0, totalPages: 0, hasMore: false })
      setStudentPage(page)
    } catch (error) {
      console.error("Failed to fetch students:", error)
      toast.error("Failed to load students")
    } finally {
      setStudentLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents(1, studentSearch)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [studentSearch])

  const handleStudentToggle = (studentId: number) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleOpenModal = (tallyType?: TallyType) => {
    if (tallyType) {
      setIsEditing(true)
      setEditingId(tallyType.id)
      setForm({
        name: tallyType.name,
        type: tallyType.type,
        description: tallyType.description || "",
      })
    } else {
      setIsEditing(false)
      setEditingId(null)
      setForm(emptyForm)
    }
    setFormError("")
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Tally type name is required")
      return
    }

    setSaving(true)
    try {
      const url = isEditing ? `/api/tally-types/${editingId}` : "/api/tally-types"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to save tally type")
      }

      toast.success(isEditing ? "Other tally type updated!" : "Other tally type created!")
      setShowModal(false)
      fetchTallyTypes()
    } catch (error) {
      console.error("Error saving tally type:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save tally type")
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (id: number, currentStatus: string) => {
    try {
      const res = await fetch(`/api/tally-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: currentStatus === "YES" ? "NO" : "YES" }),
      })

      if (!res.ok) throw new Error("Failed to update status")
      toast.success("Status updated!")
      fetchTallyTypes()
    } catch (error) {
      console.error("Error updating tally type:", error)
      toast.error("Failed to update status")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return

    try {
      const res = await fetch(`/api/tally-types/${deletingId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      toast.success("Other tally type deleted!")
      setShowDeleteModal(false)
      fetchTallyTypes()
    } catch (error) {
      console.error("Error deleting tally type:", error)
      toast.error("Failed to delete tally type")
    }
  }
  const handleAddCustomTally = async () => {
    if (!customTallyName.trim()) {
      toast.error("Please enter a tally name")
      return
    }
    if (customTallyCount < 1 || customTallyCount > 10) {
      toast.error("Tally count must be between 1 and 10")
      return
    }

    if (selectedStudents.size === 0) {
      toast.error("Please select at least one student")
      return
    }

    setSubmitting(true)

    try {
      // Create custom tally type first
      const createRes = await fetch("/api/tally-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customTallyName,
          type: "FIXED",
          description: "Custom other tally"
        })
      })

      if (!createRes.ok) {
        const error = await createRes.json()
        throw new Error(error.error || "Failed to create custom tally type")
      }

      const tallyType = await createRes.json()

      // Now add the tally to students (multiple times if count > 1)
      for (let i = 0; i < customTallyCount; i++) {
        const res = await fetch("/api/tallies/add-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentIds: Array.from(selectedStudents),
            tallyTypeId: tallyType.id,
            tallyTypeName: tallyType.name,
            tallyType: tallyType.type,
            reason: tallyReason || null,
            issuedByName: staffName,
            issuedById: parseInt(staffId),
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error)
        }
      }

      toast.success(`${customTallyCount} other tally(ies) added to ${selectedStudents.size} student(s)`)
      
      // Reset form
      setCustomTallyName("")
      setCustomTallyCount(1)
      setTallyReason("")
      setSelectedStudents(new Set())
      setStudentSearch("")
      setStudentPage(1)
      
      fetchTallyTypes()
    } catch (error) {
      console.error("Failed to add tallies:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add tallies")
    } finally {
      setSubmitting(false)
    }
  }
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Other Tally Types</h1>
                <p className="text-sm text-gray-600">{staffName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenModal()} className="gap-2 bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4" />
                Add Type
              </Button>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Tally Types List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tally Types (Fixed)</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : tallyTypes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No tally types yet</div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {tallyTypes.filter(t => t.type === 'FIXED').map((tallyType) => (
                      <div
                        key={tallyType.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{tallyType.name}</p>
                          {tallyType.description && <p className="text-xs text-gray-500 mt-1 truncate">{tallyType.description}</p>}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(tallyType.id, tallyType.isActive)}
                          >
                            {tallyType.isActive === "YES" ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(tallyType)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteId(tallyType.id)
                              setDeletingName(tallyType.name)
                              setShowDeleteModal(true)
                            }}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Add Custom Tally Form */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-8">
              {/* Custom Tally Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add Custom Other Tally</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Tally Name*</label>
                      <Input
                        placeholder="Enter tally name"
                        value={customTallyName}
                        onChange={(e) => setCustomTallyName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Tallies*</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomTallyCount(Math.max(1, customTallyCount - 1))}
                        >
                          −
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={customTallyCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val) && val >= 1 && val <= 10) {
                              setCustomTallyCount(val)
                            }
                          }}
                          className="text-center w-16"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomTallyCount(Math.min(10, customTallyCount + 1))}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Maximum 10 tallies at once</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Reason (Optional)</label>
                      <textarea
                        placeholder="Describe the violation..."
                        value={tallyReason}
                        onChange={(e) => setTallyReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Students Section */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Select Students ({selectedStudents.size})</label>
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="flex-1"
                      />
                    </div>

                    <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {studentLoading ? (
                        <div className="text-center py-4">Loading students...</div>
                      ) : students.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">No students found</div>
                      ) : (
                        students.map((student) => (
                          <div key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              checked={selectedStudents.has(student.id)}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.admission_number}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {studentPagination.totalPages > 1 && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(studentPage - 1, studentSearch)}
                          disabled={studentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600 self-center">
                          Page {studentPage} of {studentPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchStudents(studentPage + 1, studentSearch)}
                          disabled={!studentPagination.hasMore}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600">Tally Name</p>
                      <p className="font-semibold text-gray-900">{customTallyName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Count</p>
                      <p className="font-semibold text-gray-900">{customTallyCount}x</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Students</p>
                      <p className="font-semibold text-gray-900">{selectedStudents.size}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleAddCustomTally}
                    disabled={submitting || !customTallyName.trim() || selectedStudents.size === 0}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Add {customTallyCount}x Other Tally to {selectedStudents.size} Student{selectedStudents.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Other Tally Type" : "Add Other Tally Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name*</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Uniform violation"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type*</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled
              >
                <option value="NORMAL">Normal (Can be reduced by stars)</option>
                <option value="FIXED">Fixed (Cannot be reduced)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Other tallies are always FIXED type</p>
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      {showDeleteModal && (
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Other Tally Type?</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">
              Are you sure you want to delete <strong>{deletingName}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
