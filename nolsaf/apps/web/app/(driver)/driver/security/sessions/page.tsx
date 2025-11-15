"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Sessions page removed: redirect back to Security landing
export default function SessionsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/driver/security') }, [router])
  return null
}
