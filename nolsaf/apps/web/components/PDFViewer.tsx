"use client"

import React, { useEffect, useRef, useState } from "react"

type Props = {
  url: string
}

// Lightweight PDF.js viewer that loads pdf.js from a  at runtime.
export default function PDFViewer({ url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any | null>(null)
  const [pageNum, setPageNum] = useState<number>(1)
  const [numPages, setNumPages] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    const loadScript = async () => {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script")
          s.src = "https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.min.js"
          s.crossOrigin = "anonymous"
          s.onload = () => resolve()
          s.onerror = () => reject(new Error("Failed to load pdfjs"))
          document.body.appendChild(s)
        })
      }

      const pdfjsLib = (window as any).pdfjsLib
      if (!pdfjsLib) throw new Error("pdfjs not available")
      try {
        setLoading(true)
        const loadingTask = pdfjsLib.getDocument(url)
        const doc = await loadingTask.promise
        if (cancelled) return
        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setPageNum(1)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadScript().catch(() => {
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    let cancelled = false
    const renderPage = async (num: number) => {
      if (!pdfDoc || !canvasRef.current) return
      const page = await pdfDoc.getPage(num)
      if (cancelled) return
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      canvas.height = viewport.height
      canvas.width = viewport.width
      const renderContext = {
        canvasContext: context,
        viewport,
      }
      await page.render(renderContext).promise
    }

    renderPage(pageNum).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [pdfDoc, pageNum])

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">Page {pageNum} of {numPages || '—'}</div>
        <div className="flex items-center space-x-2">
          <button disabled={pageNum <= 1} onClick={() => setPageNum((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded text-sm">Prev</button>
          <button disabled={pageNum >= (numPages || 1)} onClick={() => setPageNum((p) => Math.min((numPages || 1), p + 1))} className="px-2 py-1 border rounded text-sm">Next</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">Loading PDF…</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <canvas ref={canvasRef} className="w-full block" />
        </div>
      )}
    </div>
  )
}
