"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in, otherwise redirect to login
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    } else {
      router.push("/dashboard")
    }
  }, [router])

  return <div />
}
