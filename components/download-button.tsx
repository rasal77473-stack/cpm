"use client"

import { useState, useRef, useEffect } from "react"
import { Download, FileSpreadsheet, FileText } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface DownloadButtonProps {
    data: Record<string, any>[]
    columns: { key: string; header: string }[]
    filename?: string
    title?: string
}

export function DownloadButton({ data, columns, filename = "export", title = "Data Export" }: DownloadButtonProps) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleExcel = () => {
        const exportData = data.map(row => {
            const obj: Record<string, any> = {}
            columns.forEach(col => {
                obj[col.header] = row[col.key] ?? ""
            })
            return obj
        })

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1")
        XLSX.writeFile(wb, `${filename}.xlsx`)
        setOpen(false)
    }

    const handlePDF = () => {
        const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" })

        doc.setFontSize(16)
        doc.setTextColor(40, 40, 40)
        doc.text(title, 14, 20)

        doc.setFontSize(9)
        doc.setTextColor(120, 120, 120)
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 27)

        const headers = columns.map(col => col.header)
        const rows = data.map(row => columns.map(col => String(row[col.key] ?? "")))

        autoTable(doc, {
            head: [headers],
            body: rows,
            startY: 32,
            styles: {
                fontSize: 8,
                cellPadding: 3,
            },
            headStyles: {
                fillColor: [16, 185, 129],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 8,
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250],
            },
            margin: { top: 32 },
        })

        doc.save(`${filename}.pdf`)
        setOpen(false)
    }

    if (!data || data.length === 0) return null

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition-all active:scale-95"
                title="Download data"
            >
                <Download className="w-[18px] h-[18px]" />
            </button>

            {open && (
                <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-w-[180px] animate-in fade-in slide-in-from-top-1 duration-200">
                    <button
                        onClick={handleExcel}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Export as Excel</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    <button
                        onClick={handlePDF}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                    >
                        <FileText className="w-4 h-4 text-red-500" />
                        <span>Export as PDF</span>
                    </button>
                </div>
            )}
        </div>
    )
}
