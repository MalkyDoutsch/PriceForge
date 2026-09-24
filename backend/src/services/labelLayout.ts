import { LabelSettings } from '../types'
import { UserInputError } from '../errors'

/** A4 page size in mm */
export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297

/** Default: the print shop's 70×35 mm label sheet (3 × 8) */
export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  labelWidth: 70,
  labelHeight: 35,
  marginX: 0,
  marginY: 8.5,
  gapX: 0,
  gapY: 0,
  fontSizes: { article: 12, description: 8, price: 16 },
  showBorder: false,
}

export interface LabelLayout {
  columns: number
  rows: number
  perPage: number
  /** Top-left corner of the label grid in mm */
  originX: number
  originY: number
}

/**
 * Computes how many labels fit on an A4 page and where the grid starts.
 * The grid is centered within the margins.
 *
 * NOTE: mirrored in frontend1/src/labelSettings.ts — keep both in sync.
 */
export function computeLayout(settings: LabelSettings): LabelLayout {
  const { labelWidth, labelHeight, marginX, marginY, gapX, gapY } = settings

  // Epsilon avoids losing a label to floating point rounding (e.g. 297 - 2 × 8.5)
  const fit = (page: number, margin: number, size: number, gap: number) =>
    Math.max(0, Math.floor((page - 2 * margin + gap) / (size + gap) + 1e-6))

  const columns = fit(PAGE_WIDTH, marginX, labelWidth, gapX)
  const rows = fit(PAGE_HEIGHT, marginY, labelHeight, gapY)

  const gridWidth = columns * labelWidth + Math.max(0, columns - 1) * gapX
  const gridHeight = rows * labelHeight + Math.max(0, rows - 1) * gapY

  return {
    columns,
    rows,
    perPage: columns * rows,
    originX: (PAGE_WIDTH - gridWidth) / 2,
    originY: (PAGE_HEIGHT - gridHeight) / 2,
  }
}

function readNumber(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new UserInputError(`${name} חייב להיות מספר בין ${min} ל-${max}`)
  }
  return value
}

/**
 * Validates label settings from a request body.
 * Returns the defaults when no settings were sent.
 * Throws UserInputError when a value is invalid or no label fits on the page.
 */
export function parseLabelSettings(input: unknown): LabelSettings {
  if (input === undefined || input === null) return DEFAULT_LABEL_SETTINGS

  const raw = input as Record<string, unknown>
  const fonts = (raw.fontSizes ?? {}) as Record<string, unknown>

  const settings: LabelSettings = {
    labelWidth: readNumber(raw.labelWidth, 'רוחב מדבקה', 5, PAGE_WIDTH),
    labelHeight: readNumber(raw.labelHeight, 'גובה מדבקה', 5, PAGE_HEIGHT),
    marginX: readNumber(raw.marginX, 'שוליים בצדדים', 0, 50),
    marginY: readNumber(raw.marginY, 'שוליים עליון ותחתון', 0, 50),
    gapX: readNumber(raw.gapX, 'רווח אופקי', 0, 20),
    gapY: readNumber(raw.gapY, 'רווח אנכי', 0, 20),
    fontSizes: {
      article: readNumber(fonts.article, 'גודל פונט קוד', 4, 72),
      description: readNumber(fonts.description, 'גודל פונט תיאור', 4, 72),
      price: readNumber(fonts.price, 'גודל פונט מחירים', 4, 72),
    },
    showBorder: raw.showBorder === true,
  }

  if (computeLayout(settings).perPage === 0) {
    throw new UserInputError('המדבקה לא נכנסת בעמוד A4 עם השוליים שהוגדרו')
  }

  return settings
}
