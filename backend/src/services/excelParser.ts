import ExcelJS from 'exceljs'
import { ExcelRow } from '../types'

const COLUMNS = [
  'article',
  'description',
  'colorCode',
  'colorDescription',
  'size',
  'family',
  'price',
  'ean',
  'pieces',
  'segment',
  'articleType',
] as const

export async function parseExcel(filePath: string): Promise<ExcelRow[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)

  const worksheet = workbook.worksheets[0]
  const rows: ExcelRow[] = []

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const values = row.values as (string | number | null)[]
    // ExcelJS row.values is 1-indexed
    const [, article, description, colorCode, colorDescription, size, family, price, ean, pieces, segment, articleType] = values

    if (!article || !price) return // skip empty rows

    rows.push({
      article: String(article ?? ''),
      description: String(description ?? ''),
      colorCode: String(colorCode ?? ''),
      colorDescription: String(colorDescription ?? ''),
      size: String(size ?? ''),
      family: String(family ?? ''),
      price: Number(price),
      ean: String(ean ?? ''),
      pieces: Number(pieces ?? 1),
      segment: String(segment ?? ''),
      articleType: String(articleType ?? ''),
    })
  })

  return rows
}