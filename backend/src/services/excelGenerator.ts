import ExcelJS from 'exceljs'
import { LabelData } from '../types'

/**
 * Generates a price list Excel file: one row per article with
 * code, description, club price, regular price and quantity.
 *
 * @param labels - Array of label data objects (one per article)
 * @returns .xlsx file as a Buffer
 */
export async function generatePriceListExcel(labels: LabelData[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('מחירון', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  })

  worksheet.columns = [
    { header: 'קוד', key: 'article', width: 16 },
    { header: 'תיאור', key: 'description', width: 40 },
    { header: 'מחיר מועדון', key: 'clubPrice', width: 14 },
    { header: 'מחיר רגיל', key: 'regularPrice', width: 14 },
    { header: 'כמות', key: 'quantity', width: 10 },
  ]
  worksheet.getRow(1).font = { bold: true }

  labels.forEach((label) => {
    worksheet.addRow({
      article: label.article,
      description: label.description,
      clubPrice: label.clubPrice,
      regularPrice: label.regularPrice,
      quantity: label.quantity,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer as ArrayBuffer)
}
