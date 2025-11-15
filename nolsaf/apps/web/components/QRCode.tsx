"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import QRCodeLib from "qrcode"

export default function QRCode({ value, size = 140, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await QRCodeLib.toDataURL(value, { width: size })
        if (!cancelled) setSrc(d)
      } catch (e) {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [value, size])

  if (!src) return <div className={`w-[${size}px] h-[${size}px] bg-gray-100 ${className}`} />

  // next/image can accept data URLs if unoptimized is used
  return <Image src={src} width={size} height={size} alt="QR code" unoptimized className={className} />
}
