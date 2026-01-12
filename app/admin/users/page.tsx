"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const PERMISSIONS = [
  { id: "view_only", label: "View Only" },
  { id: "in_out_control", label: "In/Out Control" },
  { id: "manage_students", label: "Manage Students" },
  { id: "manage_special_pass", label: "Special Pass Authority" },
  { id: "manage_users", label: "User Management" },
  { id: "ban_unban", label: "Ban/Unban Students" },
];

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    role: "mentor",
    special_pass: "NO",
    permissions: ["view_only"],
  });

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const specialPass = localStorage.getItem("special_pass")
    if (!token || (role !== "admin" && specialPass !== "YES")) {
      window.location.href = token ? "/dashboard" : "/login"
      return
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      console.log("Users fetched:", data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch users error:", err);
      setUsers([]);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = "/api/users";
    const method = isEditing ? "PUT" : "POST";
    const body = isEditing ? { ...formData, id: editingId } : formData;

    const res = await fetch(url, {
      method,
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      toast.success(isEditing ? "User updated successfully" : "User created successfully");
      fetchUsers();
      resetForm();
    } else {
      toast.error(isEditing ? "Failed to update user" : "Failed to create user");
    }
  };

  const resetForm = () => {
    setFormData({ username: "", password: "", name: "", role: "mentor", special_pass: "NO", permissions: ["view_only"] });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (user: any) => {
    setFormData({
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      special_pass: user.special_pass || "NO",
      permissions: user.permissions || ["view_only"],
    });
    setIsEditing(true);
    setEditingId(user.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted successfully");
      fetchUsers();
    } else {
      toast.error("Failed to delete user");
    }
  };


  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Edit User" : "Create New User"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="special_pass" 
                  checked={formData.special_pass === "YES"}
                  onCheckedChange={(checked) => setFormData({...formData, special_pass: checked ? "YES" : "NO"})}
                />
                <Label htmlFor="special_pass" className="text-yellow-600 font-bold">Grant Special Pass (Admin Access)</Label>
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="grid grid-cols-1 gap-2">
                  {PERMISSIONS.map(perm => (
                    <div key={perm.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={perm.id} 
                        checked={formData.permissions.includes(perm.id)}
                        onCheckedChange={() => togglePermission(perm.id)}
                      />
                      <Label htmlFor={perm.id}>{perm.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{isEditing ? "Update User" : "Create User"}</Button>
                {isEditing && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{user.name} ({user.username})</p>
                      <p className="text-sm text-muted-foreground">Role: {user.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>Edit</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(user.id)}>Delete</Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {user.permissions?.map((p: string) => (
                      <span key={p} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}