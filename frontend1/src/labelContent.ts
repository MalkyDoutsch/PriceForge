import type { LabelData, LabelSettings } from './types'

// Mirrors drawLabel in backend/src/services/pdfGenerator.ts — keep both in sync.

/** 1pt in mm */
export const PT_TO_MM = 0.3528
/** Line height as a multiple of font size */
const LINE_HEIGHT = 1.2
/** Horizontal padding inside a label in mm */
const LABEL_PADDING = 1.5
const MAX_DESCRIPTION_LINES = 2

const PX_PER_MM = 96 / 25.4

export interface LabelLine {
  text: string
  /** Font size in pt */
  size: number
  bold: boolean
}

export interface LabelContent {
  lines: LabelLine[]
  /** Total height of all lines in mm */
  contentHeight: number
  /** True when the text doesn't fit within the label */
  overflow: boolean
}

export const lineHeightMm = (size: number) => size * PT_TO_MM * LINE_HEIGHT

let canvasContext: CanvasRenderingContext2D | null = null

/** Measures text width in mm using a Helvetica-compatible font, like the PDF */
function measureMm(text: string, size: number, bold: boolean): number {
  canvasContext ??= document.createElement('canvas').getContext('2d')
  if (!canvasContext) return 0
  canvasContext.font = `${bold ? 'bold ' : ''}${size}pt Helvetica, Arial, sans-serif`
  return canvasContext.measureText(text).width / PX_PER_MM
}

/** Greedy word wrap, like jsPDF's splitTextToSize */
function wrapText(text: string, maxWidth: number, size: number): string[] {
  const lines: string[] = []
  let current = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measureMm(candidate, size, false) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)

  return lines
}

/** Builds the lines printed on a label and checks whether they fit */
export function buildLabelContent(label: LabelData, settings: LabelSettings): LabelContent {
  const { labelWidth, labelHeight, fontSizes } = settings
  const maxWidth = labelWidth - LABEL_PADDING * 2

  const descriptionLines = wrapText(label.description, maxWidth, fontSizes.description).slice(
    0,
    MAX_DESCRIPTION_LINES
  )

  const lines: LabelLine[] = [
    { text: label.article, size: fontSizes.article, bold: true },
    ...descriptionLines.map((text) => ({ text, size: fontSizes.description, bold: false })),
    { text: label.regularPrice.toFixed(2), size: fontSizes.price, bold: true },
    { text: label.clubPrice.toFixed(2), size: fontSizes.price, bold: true },
  ]

  const contentHeight = lines.reduce((sum, line) => sum + lineHeightMm(line.size), 0)
  const overflow =
    contentHeight > labelHeight ||
    lines.some((line) => measureMm(line.text, line.size, line.bold) > maxWidth)

  return { lines, contentHeight, overflow }
}
