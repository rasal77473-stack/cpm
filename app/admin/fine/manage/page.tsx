"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChevronLeft, LogOut, Plus, Edit2, Trash2, Banknote, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "sonner"
import { handleLogout } from "@/lib/auth-utils"

interface FineType {
    id: number
    name: string
    amount: number
    description: string | null
    isActive: string
    createdAt: string | null
    updatedAt: string | null
}

const emptyForm = {
    name: "",
    amount: "",
    description: "",
}

export default function ManageFineTypesPage() {
    const router = useRouter()
    const [staffName, setStaffName] = useState("")
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [fines, setFines] = useState<FineType[]>([])
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
        setStaffName(name || "Staff")
        fetchFines()
    }, [router])

    const fetchFines = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/fines/all")
            const data = await res.json()
            setFines(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch fines:", err)
            toast.error("Failed to load fine types")
        } finally {
            setLoading(false)
        }
    }

    const openAddModal = () => {
        setForm(emptyForm)
        setFormError("")
        setIsEditing(false)
        setEditingId(null)
        setShowModal(true)
    }

    const openEditModal = (fine: FineType) => {
        setForm({
            name: fine.name,
            amount: String(fine.amount),
            description: fine.description || "",
        })
        setFormError("")
        setIsEditing(true)
        setEditingId(fine.id)
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setIsEditing(false)
        setEditingId(null)
        setForm(emptyForm)
        setFormError("")
    }

    const handleSave = async () => {
        setFormError("")

        if (!form.name.trim()) {
            setFormError("Fine name is required.")
            return
        }

        const amount = parseFloat(form.amount)
        if (isNaN(amount) || amount < 0) {
            setFormError("Please enter a valid amount (0 or more).")
            return
        }

        setSaving(true)

        const payload = {
            name: form.name.trim(),
            amount,
            description: form.description.trim() || null,
        }

        try {
            let res: Response

            if (isEditing && editingId !== null) {
                res = await fetch(`/api/fines/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
            } else {
                res = await fetch("/api/fines/all", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                })
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || "Failed to save fine type")
            }

            const saved: FineType = await res.json()

            if (isEditing) {
                setFines((prev) => prev.map((f) => (f.id === editingId ? saved : f)))
                toast.success("Fine type updated successfully!")
            } else {
                setFines((prev) => [...prev, saved])
                toast.success("Fine type added successfully!")
            }

            closeModal()
        } catch (err: any) {
            console.error("Save error:", err)
            setFormError(err.message || "Failed to save fine type")
            toast.error(err.message || "Failed to save fine type")
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = (fine: FineType) => {
        setDeletingId(fine.id)
        setDeletingName(fine.name)
        setShowDeleteModal(true)
    }

    const handleDelete = async () => {
        if (!deletingId) return

        // Optimistic removal
        const prev = [...fines]
        setFines((f) => f.filter((x) => x.id !== deletingId))
        setShowDeleteModal(false)

        try {
            const res = await fetch(`/api/fines/${deletingId}`, { method: "DELETE" })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err?.error || "Failed to delete fine")
            }
            toast.success(`"${deletingName}" deleted successfully`)
        } catch (err: any) {
            console.error("Delete error:", err)
            setFines(prev) // rollback
            toast.error(err.message || "Failed to delete fine")
        } finally {
            setDeletingId(null)
            setDeletingName("")
        }
    }

    const handleToggleActive = async (fine: FineType) => {
        const newStatus = fine.isActive === "YES" ? "NO" : "YES"

        // Optimistic update
        setFines((prev) =>
            prev.map((f) => (f.id === fine.id ? { ...f, isActive: newStatus } : f))
        )

        try {
            const res = await fetch(`/api/fines/${fine.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: fine.name,
                    amount: fine.amount,
                    description: fine.description,
                    isActive: newStatus,
                }),
            })
            if (!res.ok) throw new Error("Failed to toggle status")
            toast.success(`Fine "${fine.name}" is now ${newStatus === "YES" ? "active" : "inactive"}`)
        } catch (err: any) {
            // Rollback
            setFines((prev) =>
                prev.map((f) => (f.id === fine.id ? { ...f, isActive: fine.isActive } : f))
            )
            toast.error("Failed to update fine status")
        }
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground animate-pulse">Checking permissions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push("/admin/fine")}
                            className="rounded-full"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Fine Types</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Logged in as: {staffName}</p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Manage Fine Types</CardTitle>
                                <CardDescription className="mt-1">
                                    Create and manage the fine categories used in this system.
                                </CardDescription>
                            </div>
                            <Button onClick={openAddModal} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Fine Type
                            </Button>
                        </div>
                    </CardHeader>
                </Card>

                {loading ? (
                    <div className="text-center py-16 text-muted-foreground">Loading fine types...</div>
                ) : fines.length === 0 ? (
                    <Card>
                        <CardContent className="pt-16 pb-16 text-center">
                            <Banknote className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">No fine types yet</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Click "Add Fine Type" to create your first fine category.
                            </p>
                            <Button className="mt-6 gap-2" onClick={openAddModal}>
                                <Plus className="w-4 h-4" />
                                Add Fine Type
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent className="pt-4 px-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount (₹)</th>
                                            <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">
                                                Description
                                            </th>
                                            <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                                            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fines.map((fine) => (
                                            <tr
                                                key={fine.id}
                                                className={`border-b hover:bg-muted/40 transition-colors ${fine.isActive === "NO" ? "opacity-60" : ""
                                                    }`}
                                            >
                                                <td className="py-3 px-4 font-medium">{fine.name}</td>
                                                <td className="py-3 px-4 text-green-700 font-semibold">
                                                    ₹{fine.amount.toFixed(2)}
                                                </td>
                                                <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                                                    {fine.description || <span className="italic text-muted-foreground/50">—</span>}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button
                                                        onClick={() => handleToggleActive(fine)}
                                                        title={fine.isActive === "YES" ? "Click to deactivate" : "Click to activate"}
                                                        className="inline-flex items-center gap-1 transition-opacity"
                                                    >
                                                        {fine.isActive === "YES" ? (
                                                            <>
                                                                <ToggleRight className="w-6 h-6 text-green-600" />
                                                                <span className="text-xs font-bold text-green-600">Active</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                                                                <span className="text-xs font-bold text-muted-foreground">Inactive</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditModal(fine)}
                                                            className="gap-1"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => confirmDelete(fine)}
                                                            className="gap-1"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                            <span className="hidden sm:inline">Delete</span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Add / Edit Modal */}
            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit Fine Type" : "Add Fine Type"}</DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? "Update the fine type details below."
                                : "Fill in the details to create a new fine type."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        {formError && (
                            <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-md px-3 py-2">
                                {formError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Fine Name *</label>
                            <Input
                                placeholder="e.g. Late Fee, Phone Violation"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount (₹) *</label>
                            <Input
                                type="number"
                                placeholder="e.g. 50"
                                min="0"
                                step="0.01"
                                value={form.amount}
                                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (optional)</label>
                            <Input
                                placeholder="Short description of this fine"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleSave} className="flex-1" disabled={saving}>
                                {saving ? "Saving..." : isEditing ? "Update Fine" : "Add Fine"}
                            </Button>
                            <Button variant="outline" onClick={closeModal} className="flex-1" disabled={saving}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Fine Type</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>"{deletingName}"</strong>? This action cannot be
                            undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 pt-2">
                        <Button variant="destructive" onClick={handleDelete} className="flex-1">
                            Yes, Delete
                        </Button>
                        <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="flex-1">
                            Cancel
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
