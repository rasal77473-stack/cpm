"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { handleLogout } from "@/lib/auth-utils"

interface TallyType {
  id: number
  name: string
  type: string // 'NORMAL' or 'FIXED'
  description: string | null
  isActive: string
  createdAt: string | null
}

const emptyForm = {
  name: "",
  type: "FIXED",
  description: "",
}

export default function ManageOtherTallyTypesPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [tallyTypes, setTallyTypes] = useState<TallyType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState("")

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingName, setDeletingName] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const name = localStorage.getItem("staffName")

    if (!token) {
      router.replace("/login")
      return
    }

    setIsAuthorized(true)
    setStaffName(name || "Admin")
    fetchTallyTypes()
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
        <div className="max-w-6xl mx-auto px-6 py-4">
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Other Tally Types (Fixed)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : tallyTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No tally types yet</div>
            ) : (
              <div className="space-y-3">
                {tallyTypes.filter(t => t.type === 'FIXED').map((tallyType) => (
                  <div
                    key={tallyType.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{tallyType.name}</p>
                      <div className="flex gap-3 mt-1 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded ${
                          tallyType.type === 'FIXED' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {tallyType.type}
                        </span>
                        {tallyType.description && <span>{tallyType.description}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(tallyType.id, tallyType.isActive)}
                      >
                        {tallyType.isActive === "YES" ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenModal(tallyType)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingId(tallyType.id)
                          setDeletingName(tallyType.name)
                          setShowDeleteModal(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
