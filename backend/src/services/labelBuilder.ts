import { ExcelRow, LabelData, ProcessRequest } from '../types'
import { calculatePrices } from './priceCalculator'

/**
 * Converts parsed Excel rows into label data.
 * Rows sharing the same article are merged into one LabelData,
 * with quantity = sum of their pieces. Prices are taken from the first row.
 */
export function buildLabels(rows: ExcelRow[], params: ProcessRequest): LabelData[] {
  const byArticle = new Map<string, LabelData>()

  for (const row of rows) {
    const quantity = row.pieces || 1
    const existing = byArticle.get(row.article)
    if (existing) {
      existing.quantity += quantity
      continue
    }

    const { clubPrice, regularPrice } = calculatePrices(
      row.price,
      params.euroRate,
      params.clubProfit,
      params.regularProfit
    )

    byArticle.set(row.article, {
      article: row.article,
      description: row.description,
      clubPrice,
      regularPrice,
      quantity,
    })
  }

  return [...byArticle.values()]
}
