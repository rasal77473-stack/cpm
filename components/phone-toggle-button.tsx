"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff } from "lucide-react"

interface PhoneToggleButtonProps {
  studentId: number
  currentStatus: string
  onStatusChange: (newStatus: string) => Promise<void>
  disabled?: boolean
}

export function PhoneToggleButton({
  studentId,
  currentStatus,
  onStatusChange,
  disabled = false,
}: PhoneToggleButtonProps) {
  const [loading, setLoading] = useState(false)
  const isPhoneIn = currentStatus === "IN"

  const handleToggle = async () => {
    const newStatus = isPhoneIn ? "OUT" : "IN"
    setLoading(true)
    try {
      await onStatusChange(newStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={loading || disabled}
      className={`gap-2 transition-all ${
        isPhoneIn ? "bg-green-600 hover:bg-green-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"
      }`}
    >
      {loading ? (
        <span>Updating...</span>
      ) : isPhoneIn ? (
        <>
          <Phone className="w-4 h-4" />
          Mark OUT
        </>
      ) : (
        <>
          <PhoneOff className="w-4 h-4" />
          Mark IN
        </>
      )}
    </Button>
  )
}
