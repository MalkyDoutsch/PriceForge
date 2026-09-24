import jsPDF from 'jspdf'
import { LabelData } from '../types'

/**
 * Configuration for label layout and PDF generation
 */
interface LabelConfig {
  /** Label dimensions in mm */
  labelWidth: number
  labelHeight: number
  /** Number of columns per row */
  columnsPerRow: number
  /** Margins in mm */
  marginTop: number
  marginLeft: number
  marginRight: number
  marginBottom: number
  /** Spacing between labels in mm */
  gapBetweenLabels: number
}

/**
 * Default configuration for A4 labels
 * 3cm x 2.5cm stickers (30mm x 25mm), 4 stickers per column
 */
const DEFAULT_LABEL_CONFIG: LabelConfig = {
  labelWidth: 30,
  labelHeight: 25,
  columnsPerRow: 6,
  marginTop: 10,
  marginLeft: 10,
  marginRight: 10,
  marginBottom: 10,
  gapBetweenLabels: 2,
}

/**
 * Generates a printable PDF of product labels
 *
 * @param labels - Array of label data objects (one per physical label)
 * @param config - Optional configuration for label layout
 * @returns PDF document as bytes (Uint8Array)
 *
 * @example
 * const labels = [
 *   { article: 'ART001', description: 'Widget', clubPrice: 10, regularPrice: 15 },
 *   { article: 'ART002', description: 'Gadget', clubPrice: 20, regularPrice: 25 }
 * ];
 * const pdf = generateLabelsPDF(labels);
 * // Save to file or send to client
 */
export function generateLabelsPDF(
  labels: LabelData[],
  config: Partial<LabelConfig> = {}
): Uint8Array {
  // Merge custom config with defaults
  const finalConfig = { ...DEFAULT_LABEL_CONFIG, ...config }

  // Initialize PDF with A4 size (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  // Calculate available space and layout
  const availableWidth =
    pageWidth - finalConfig.marginLeft - finalConfig.marginRight
  const availableHeight =
    pageHeight - finalConfig.marginTop - finalConfig.marginBottom

  // Calculate how many rows can fit per page
  const labelWithGap = finalConfig.labelHeight + finalConfig.gapBetweenLabels
  const rowsPerPage = Math.floor(availableHeight / labelWithGap)
  const labelsPerPage = rowsPerPage * finalConfig.columnsPerRow

  // Process each label
  labels.forEach((label, index) => {
    // Calculate if we need a new page
    if (index > 0 && index % labelsPerPage === 0) {
      pdf.addPage()
    }

    // Calculate position within current page
    const positionInPage = index % labelsPerPage
    const rowIndex = Math.floor(positionInPage / finalConfig.columnsPerRow)
    const colIndex = positionInPage % finalConfig.columnsPerRow

    // Calculate x and y coordinates
    const x =
      finalConfig.marginLeft +
      colIndex * (finalConfig.labelWidth + finalConfig.gapBetweenLabels)
    const y =
      finalConfig.marginTop +
      rowIndex * (finalConfig.labelHeight + finalConfig.gapBetweenLabels)

    // Draw label
    drawLabel(pdf, label, x, y, finalConfig)
  })

  // Return PDF as bytes
  return new Uint8Array(pdf.output('arraybuffer') as ArrayBuffer)
}

/**
 * Draws a single label on the PDF at the specified coordinates
 *
 * @param pdf - jsPDF instance
 * @param label - Label data to draw
 * @param x - X coordinate in mm
 * @param y - Y coordinate in mm
 * @param config - Label configuration
 */
function drawLabel(
  pdf: jsPDF,
  label: LabelData,
  x: number,
  y: number,
  config: LabelConfig
): void {
  // Draw border
  drawBorder(pdf, x, y, config.labelWidth, config.labelHeight)

  // Calculate text positions
  const centerX = x + config.labelWidth / 2
  const padding = 0.5 // mm

  // Draw article ID (bold, small font, top) - moved down slightly
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  pdf.text(label.article, centerX, y + padding + 3.5, { align: 'center' })

  // Draw description (regular font, small size)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5)
  const descriptionY = y + padding + 4.5
  // Split description if it's too long
  const descriptionLines = pdf.splitTextToSize(
    label.description,
    config.labelWidth - padding * 2
  )
  pdf.text(descriptionLines, centerX, descriptionY, { align: 'center' })

  // Draw regular price and club price with same size
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  const regularPriceY = y + padding + 12
  const clubPriceY = y + padding + 15.5
  pdf.text(`${label.regularPrice.toFixed(2)}`, centerX, regularPriceY, {
    align: 'center',
  })

  // Draw club price with same font size as regular price
  pdf.text(`${label.clubPrice.toFixed(2)}`, centerX, clubPriceY, {
    align: 'center',
  })
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
  // Set line width to thin (0.5mm)
  pdf.setLineWidth(0.5)
  // Set stroke color to black
  pdf.setDrawColor(0, 0, 0)
  // Draw rectangle
  pdf.rect(x, y, width, height, 'S')
}
