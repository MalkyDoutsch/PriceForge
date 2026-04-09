import { ExcelRow, LabelData, ProcessRequest } from '../types'
import { calculatePrices } from './priceCalculator'

/**
 * Converts parsed Excel rows into label data.
 * Each row produces one LabelData with quantity = pieces.
 */
export function buildLabels(rows: ExcelRow[], params: ProcessRequest): LabelData[] {
  return rows.map((row) => {
    const { clubPrice, regularPrice } = calculatePrices(
      row.price,
      params.euroRate,
      params.clubProfit,
      params.regularProfit
    )

    return {
      article: row.article,
      description: row.description,
      clubPrice,
      regularPrice,
      quantity: row.pieces,
    }
  })
}