import { PriceResult } from '../types'

/**
 * Calculates club and regular prices from a base Euro price.
 * Formula: price (EUR) × euroRate × profitMultiplier
 * Result is rounded UP to the nearest whole number.
 */
export function calculatePrices(
  priceEur: number,
  euroRate: number,
  clubProfit: number,
  regularProfit: number
): PriceResult {
  const base = priceEur * euroRate

  const clubPrice = Math.ceil(base * clubProfit)
  const regularPrice = Math.ceil(base * regularProfit)

  return { clubPrice, regularPrice }
}