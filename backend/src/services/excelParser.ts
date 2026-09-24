import ExcelJS from 'exceljs'
import { ExcelRow } from '../types'

const COLUMNS = [
  'article',
  'article description',
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

    // const values = row.values as (string | number | null)[]
    // // ExcelJS row.values is 1-indexed
    // const [, article, description, colorCode, colorDescription, size, family, price, ean, pieces, segment, articleType] = values

    // if (!article || !price) return // skip empty rows
    const values = row.values as (string | number | null)[]

    // חילוץ לפי הסדר בתמונה:
    const [
        , 
        article,          // A
        description,      // B
        colorCode,        // C
        colorDescription, // D
        size,             // E
        family,           // F
        ,                 // G (מדלגים על עמודה ריקה)
        price,            // H
        ean,              // I
        pieces,           // J
        segment,          // K
        articleType       // L
    ] = values

if (!article || price === undefined) return
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