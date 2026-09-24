import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { parseExcel } from '../services/excelParser'
import { buildLabels } from '../services/labelBuilder'
import { generateLabelsPDF } from '../services/pdfGenerator'
import { generatePriceListExcel } from '../services/excelGenerator'
import { ProcessRequest, LabelData } from '../types'

const router = Router()

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

router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' })
    return
  }

  try {
    const { euroRate, clubProfit, regularProfit } = req.body as {
      euroRate: string
      clubProfit: string
      regularProfit: string
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

    // Parse Excel
    const rows = await parseExcel(req.file.path)

    // Build labels
    const labels = buildLabels(rows, params)

    // Files are generated on demand via /generate-pdf and /generate-excel
    res.json({
      success: true,
      totalRows: rows.length,
      totalLabels: labels.reduce((sum, l) => sum + l.quantity, 0),
      labels,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Processing failed', details: (err as Error).message })
  } finally {
    // Clean up uploaded file
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {})
    }
  }
})

/**
 * POST /api/generate-pdf
 * Generates a PDF file from label data
 * Body: { labels: LabelData[] }
 * Returns: PDF file as binary
 */
router.post('/generate-pdf', (req: Request, res: Response) => {
  try {
    const { labels } = req.body as { labels: LabelData[] }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ error: 'Invalid or empty labels array' })
      return
    }

    // Generate PDF
    const pdfBytes = generateLabelsPDF(labels)

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Length', pdfBytes.length)
    res.setHeader('Content-Disposition', 'attachment; filename="labels.pdf"')

    // Send PDF as binary data
    res.end(Buffer.from(pdfBytes))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'PDF generation failed', details: (err as Error).message })
  }
})

/**
 * POST /api/generate-excel
 * Generates a price list Excel file from label data
 * Body: { labels: LabelData[] }
 * Returns: .xlsx file as binary
 */
router.post('/generate-excel', async (req: Request, res: Response) => {
  try {
    const { labels } = req.body as { labels: LabelData[] }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ error: 'Invalid or empty labels array' })
      return
    }

    const buffer = await generatePriceListExcel(labels)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Length', buffer.length)
    res.setHeader('Content-Disposition', 'attachment; filename="prices.xlsx"')

    res.end(buffer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Excel generation failed', details: (err as Error).message })
  }
})

export default router