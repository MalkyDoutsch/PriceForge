import jsPDF from 'jspdf'
import { LabelData, LabelSettings } from '../types'
import { computeLayout } from './labelLayout'

/** 1pt in mm */
const PT_TO_MM = 0.3528
/** Line height as a multiple of font size */
const LINE_HEIGHT = 1.2
/** Horizontal padding inside a label in mm */
const LABEL_PADDING = 1.5
const MAX_DESCRIPTION_LINES = 2

/**
 * Generates a printable A4 PDF of product labels.
 * Columns/rows per page are computed from the label settings.
 *
 * @param labels - Array of label data objects; each is printed `quantity` times
 * @param settings - Label size, margins, gaps, font sizes and border
 * @returns PDF document as bytes (Uint8Array)
 */
export function generateLabelsPDF(labels: LabelData[], settings: LabelSettings): Uint8Array {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const layout = computeLayout(settings)

  // One physical label per unit of quantity
  const physicalLabels = labels.flatMap((label) =>
    Array.from({ length: label.quantity || 1 }, () => label)
  )

  physicalLabels.forEach((label, index) => {
    if (index > 0 && index % layout.perPage === 0) {
      pdf.addPage()
    }

    const positionInPage = index % layout.perPage
    const rowIndex = Math.floor(positionInPage / layout.columns)
    const colIndex = positionInPage % layout.columns

    const x = layout.originX + colIndex * (settings.labelWidth + settings.gapX)
    const y = layout.originY + rowIndex * (settings.labelHeight + settings.gapY)

    drawLabel(pdf, label, x, y, settings)
  })

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer)
}

/**
 * Draws a single label: code, description (up to 2 lines), regular price, club price.
 * Lines are stacked and vertically centered within the label.
 *
 * NOTE: frontend1/src/components/LabelPreview.tsx mirrors this layout — keep both in sync.
 */
function drawLabel(
  pdf: jsPDF,
  label: LabelData,
  x: number,
  y: number,
  settings: LabelSettings
): void {
  const { labelWidth, labelHeight, fontSizes } = settings

  if (settings.showBorder) {
    drawBorder(pdf, x, y, labelWidth, labelHeight)
  }

  // Wrap description with its own font size to measure correctly
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(fontSizes.description)
  const descriptionLines: string[] = label.description
    ? (pdf.splitTextToSize(label.description, labelWidth - LABEL_PADDING * 2) as string[]).slice(
        0,
        MAX_DESCRIPTION_LINES
      )
    : []

  const lines = [
    { text: label.article, size: fontSizes.article, bold: true },
    ...descriptionLines.map((text) => ({ text, size: fontSizes.description, bold: false })),
    { text: label.regularPrice.toFixed(2), size: fontSizes.price, bold: true },
    { text: label.clubPrice.toFixed(2), size: fontSizes.price, bold: true },
  ]

  const lineHeight = (size: number) => size * PT_TO_MM * LINE_HEIGHT
  const contentHeight = lines.reduce((sum, line) => sum + lineHeight(line.size), 0)

  const centerX = x + labelWidth / 2
  let lineTop = y + Math.max(0, (labelHeight - contentHeight) / 2)

  for (const line of lines) {
    pdf.setFont('helvetica', line.bold ? 'bold' : 'normal')
    pdf.setFontSize(line.size)
    // Center the glyphs within the line box
    const textTop = lineTop + (lineHeight(line.size) - line.size * PT_TO_MM) / 2
    pdf.text(line.text, centerX, textTop, { align: 'center', baseline: 'top' })
    lineTop += lineHeight(line.size)
  }
}

/**
 * Summary table columns (widths in mm, total 190 = A4 width minus margins)
 */
const SUMMARY_COLUMNS: { header: string; width: number; align: 'left' | 'right' }[] = [
  { header: 'Code', width: 35, align: 'left' },
  { header: 'Description', width: 85, align: 'left' },
  { header: 'Club', width: 25, align: 'right' },
  { header: 'Regular', width: 25, align: 'right' },
  { header: 'Qty', width: 20, align: 'right' },
]

/**
 * Generates a summary PDF: a table with one row per article
 * (code, description, club price, regular price, quantity) and a total row.
 * Headers are in English because the built-in PDF fonts do not support Hebrew.
 *
 * @param labels - Array of label data objects (one per article)
 * @returns PDF document as bytes (Uint8Array)
 */
export function generateSummaryPDF(labels: LabelData[]): Uint8Array {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const rowHeight = 7
  const cellPadding = 1.5
  const tableWidth = SUMMARY_COLUMNS.reduce((sum, col) => sum + col.width, 0)
  let y = margin

  const drawRow = (cells: string[]) => {
    let x = margin
    SUMMARY_COLUMNS.forEach((col, i) => {
      const textX = col.align === 'right' ? x + col.width - cellPadding : x + cellPadding
      const text = pdf.splitTextToSize(cells[i], col.width - cellPadding * 2)[0] ?? ''
      pdf.text(text, textX, y + 5, { align: col.align })
      x += col.width
    })
    y += rowHeight
  }

  const drawHeader = () => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    drawRow(SUMMARY_COLUMNS.map((col) => col.header))
    pdf.setLineWidth(0.3)
    pdf.line(margin, y, margin + tableWidth, y)
    pdf.setFont('helvetica', 'normal')
  }

  // Title
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text('Price Summary', margin, y + 6)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text(new Date().toLocaleDateString('en-GB'), margin + tableWidth, y + 6, { align: 'right' })
  y += 12

  drawHeader()

  labels.forEach((label) => {
    if (y + rowHeight > pageHeight - margin) {
      pdf.addPage()
      y = margin
      drawHeader()
    }
    drawRow([
      label.article,
      label.description,
      label.clubPrice.toFixed(2),
      label.regularPrice.toFixed(2),
      String(label.quantity),
    ])
  })

  // Total row
  if (y + rowHeight > pageHeight - margin) {
    pdf.addPage()
    y = margin
  }
  pdf.setLineWidth(0.3)
  pdf.line(margin, y, margin + tableWidth, y)
  pdf.setFont('helvetica', 'bold')
  const totalQuantity = labels.reduce((sum, label) => sum + label.quantity, 0)
  drawRow(['Total', `${labels.length} items`, '', '', String(totalQuantity)])

  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer)
}

/**
 * Draws a rectangular border around the label area
 *
 * @param pdf - jsPDF instance
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param width - Width in mm
 * @param height - Height in mm
 */
function drawBorder(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  // Set line width to thin (0.3mm)
  pdf.setLineWidth(0.3)
  // Set stroke color to black
  pdf.setDrawColor(0, 0, 0)
  // Draw rectangle
  pdf.rect(x, y, width, height, 'S')
}
