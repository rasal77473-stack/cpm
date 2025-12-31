"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LogOut, ChevronLeft, Lock, Bell, Database, Eye } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export default function SystemSettings() {
  const router = useRouter()
  const [staffName, setStaffName] = useState("")
  const [settings, setSettings] = useState({
    systemName: "Hostel Phone Management",
    maintenanceMode: false,
    emailNotifications: true,
    phoneLogRetention: 90,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    backupEnabled: true,
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")
    const name = localStorage.getItem("staffName")

    if (!token || role !== "admin") {
      router.push("/login")
      return
    }

    setStaffName(name || "Admin")
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("staffId")
    localStorage.removeItem("staffName")
    localStorage.removeItem("role")
    router.push("/login")
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveSettings = () => {
    localStorage.setItem("systemSettings", JSON.stringify(settings))
    alert("Settings saved successfully!")
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
              <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* General Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              General Settings
            </CardTitle>
            <CardDescription>Configure basic system properties</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">System Name</label>
              <Input
                value={settings.systemName}
                onChange={(e) => handleSettingChange("systemName", e.target.value)}
                placeholder="System name"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Disable system access for maintenance</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange("maintenanceMode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Configure system notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send email alerts for important events</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange("emailNotifications", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
            <CardDescription>Configure data retention and backups</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Log Retention (days)</label>
              <Input
                type="number"
                value={settings.phoneLogRetention}
                onChange={(e) => handleSettingChange("phoneLogRetention", Number.parseInt(e.target.value))}
                placeholder="Days"
              />
              <p className="text-xs text-muted-foreground">How long to keep phone transaction logs</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automated Backups</p>
                <p className="text-sm text-muted-foreground">Automatically backup system data daily</p>
              </div>
              <Switch
                checked={settings.backupEnabled}
                onCheckedChange={(checked) => handleSettingChange("backupEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security Settings
            </CardTitle>
            <CardDescription>Configure security policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Login Attempts</label>
              <Input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => handleSettingChange("maxLoginAttempts", Number.parseInt(e.target.value))}
                placeholder="Attempts"
              />
              <p className="text-xs text-muted-foreground">Maximum failed login attempts before lockout</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Session Timeout (minutes)</label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => handleSettingChange("sessionTimeout", Number.parseInt(e.target.value))}
                placeholder="Minutes"
              />
              <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button onClick={handleSaveSettings} size="lg" className="flex-1">
            Save Settings
          </Button>
          <Button
            onClick={() => router.push("/admin")}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </main>
    </div>
  )
}
