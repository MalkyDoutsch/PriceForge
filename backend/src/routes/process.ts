import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { parseExcel } from '../services/excelParser'
import { buildLabels } from '../services/labelBuilder'
import { ProcessRequest, LabelFormat } from '../types'

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
    const { euroRate, clubProfit, regularProfit, format } = req.body as {
      euroRate: string
      clubProfit: string
      regularProfit: string
      format: LabelFormat
    }

    if (!euroRate || !clubProfit || !regularProfit) {
      res.status(400).json({ error: 'Missing required parameters: euroRate, clubProfit, regularProfit' })
      return
    }

    const params: ProcessRequest = {
      euroRate: parseFloat(euroRate),
      clubProfit: parseFloat(clubProfit),
      regularProfit: parseFloat(regularProfit),
      format: format ?? 'pdf-a4',
    }

    // Parse Excel
    const rows = await parseExcel(req.file.path)

    // Build labels
    const labels = buildLabels(rows, params)

    // TODO: generate output file based on format
    // For now — return labels as JSON (useful for frontend dev)
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

export default router