import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { readSheet, extractRows } from '../services/excelParser'
import { resolveMapping, suggestMapping } from '../services/columnMapping'
import { buildLabels } from '../services/labelBuilder'
import { parseLabelSettings } from '../services/labelLayout'
import { generateLabelsPDF, generateSummaryPDF } from '../services/pdfGenerator'
import { UserInputError } from '../errors'
import { generateSummaryExcel } from '../services/excelGenerator'
import { ProcessRequest, LabelData, SummaryFormat, InspectResult } from '../types'

const router = Router()

/** Data rows returned by /inspect after the header row, for the mapping preview */
const PREVIEW_DATA_ROWS = 5

/** Sends 400 with the message for user input errors, 500 otherwise */
function sendError(res: Response, err: unknown, message: string): void {
  if (err instanceof UserInputError) {
    res.status(400).json({ error: err.message })
    return
  }
  console.error(err)
  res.status(500).json({ error: message, details: (err as Error).message })
}

function removeUploadedFile(req: Request): void {
  if (req.file?.path) {
    fs.unlink(req.file.path, () => {})
  }
}

/** Parses a JSON-encoded multipart field; undefined when the field is absent */
function parseJsonField(value: unknown, name: string): unknown {
  if (value === undefined || value === '') return undefined
  try {
    return JSON.parse(String(value))
  } catch {
    throw new UserInputError(`השדה ${name} לא תקין`)
  }
}

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed'))
    }
  },
})

/**
 * POST /api/inspect
 * Reads an uploaded sheet so the user can map its columns
 * Body: multipart with `file`
 * Returns: InspectResult (column count, first rows, mapping suggested from headers)
 */
router.post('/inspect', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  try {
    const sheet = await readSheet(req.file.path)
    const suggestion = suggestMapping(sheet)
    const headerIndex = sheet.rows.findIndex((row) => row.rowNumber === suggestion.headerRow)

    const result: InspectResult = {
      columnCount: sheet.columnCount,
      rows: sheet.rows.slice(0, headerIndex + 1 + PREVIEW_DATA_ROWS),
      suggestion,
    }
    res.json(result)
  } catch (err) {
    sendError(res, err, 'Reading file failed')
  } finally {
    removeUploadedFile(req)
  }
})

/**
 * POST /api/process
 * Body: multipart with `file`, euroRate, clubProfit, regularProfit and
 * optional `mapping` (JSON ColumnMapping; suggested from headers when omitted)
 */
router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  try {
    const { euroRate, clubProfit, regularProfit, mapping } = req.body as {
      euroRate: string
      clubProfit: string
      regularProfit: string
      mapping?: string
    }

    if (!euroRate || !clubProfit || !regularProfit) {
      res.status(400).json({ error: 'Missing required parameters: euroRate, clubProfit, regularProfit' })
      return
    }

    const params: ProcessRequest = {
      euroRate: parseFloat(euroRate),
      clubProfit: parseFloat(clubProfit),
      regularProfit: parseFloat(regularProfit),
    }

    const sheet = await readSheet(req.file.path)
    const rows = extractRows(sheet, resolveMapping(sheet, parseJsonField(mapping, 'mapping')))
    const labels = buildLabels(rows, params)

    // Files are generated on demand via /generate-pdf and /generate-summary
    res.json({
      success: true,
      totalRows: rows.length,
      totalLabels: labels.reduce((sum, l) => sum + l.quantity, 0),
      labels,
    })
  } catch (err) {
    sendError(res, err, 'Processing failed')
  } finally {
    removeUploadedFile(req)
  }
})

/**
 * POST /api/generate-pdf
 * Generates a labels PDF file from label data
 * Body: { labels: LabelData[], settings?: LabelSettings } (defaults used when settings are omitted)
 * Returns: PDF file as binary
 */
router.post('/generate-pdf', (req: Request, res: Response) => {
  try {
    const { labels, settings } = req.body as { labels: LabelData[]; settings?: unknown }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ error: 'Invalid or empty labels array' })
      return
    }

    const pdfBytes = generateLabelsPDF(labels, parseLabelSettings(settings))

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBytes.length)
    res.setHeader('Content-Disposition', 'attachment; filename="labels.pdf"')

    // Send PDF as binary data
    res.end(Buffer.from(pdfBytes))
  } catch (err) {
    sendError(res, err, 'PDF generation failed')
  }
})

/**
 * POST /api/generate-summary
 * Generates a summary file (code, description, prices, quantity) from label data
 * Body: { labels: LabelData[], format: 'pdf' | 'excel' }
 * Returns: .pdf or .xlsx file as binary
 */
router.post('/generate-summary', async (req: Request, res: Response) => {
  try {
    const { labels, format } = req.body as { labels: LabelData[]; format: SummaryFormat }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ error: 'Invalid or empty labels array' })
      return
    }

    if (format !== 'pdf' && format !== 'excel') {
      res.status(400).json({ error: 'Invalid format, expected "pdf" or "excel"' })
      return
    }

    if (format === 'excel') {
      const buffer = await generateSummaryExcel(labels)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Length', buffer.length)
      res.setHeader('Content-Disposition', 'attachment; filename="summary.xlsx"')
      res.end(buffer)
      return
    }

    const pdfBytes = generateSummaryPDF(labels)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBytes.length)
    res.setHeader('Content-Disposition', 'attachment; filename="summary.pdf"')
    res.end(Buffer.from(pdfBytes))
  } catch (err) {
    sendError(res, err, 'Summary generation failed')
  }
})

export default router