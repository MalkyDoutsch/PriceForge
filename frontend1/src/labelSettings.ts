import type { LabelFontSizes, LabelSettings } from './types'

// Layout math and validation ranges mirror backend/src/services/labelLayout.ts — keep both in sync.

/** A4 page size in mm */
export const PAGE_WIDTH = 210
export const PAGE_HEIGHT = 297

type LayoutFields = Pick<LabelSettings, 'labelWidth' | 'labelHeight' | 'marginX' | 'marginY' | 'gapX' | 'gapY'>

export interface LabelPreset {
  id: string
  name: string
  layout: LayoutFields
  fontSizes: LabelFontSizes
}

/** The print shop's pre-cut A4 label sheets. The first one is the default. */
export const LABEL_PRESETS: LabelPreset[] = [
  {
    id: '70x25',
    name: '70×25 (דפוס)',
    layout: { labelWidth: 70, labelHeight: 25, marginX: 0, marginY: 11, gapX: 0, gapY: 0 },
    fontSizes: { article: 11, description: 7, price: 13 },
  },
  {
    id: '70x35',
    name: '70×35 (דפוס)',
    layout: { labelWidth: 70, labelHeight: 35, marginX: 0, marginY: 8.5, gapX: 0, gapY: 0 },
    fontSizes: { article: 12, description: 8, price: 16 },
  },
]

export const DEFAULT_LABEL_SETTINGS: LabelSettings = {
  ...LABEL_PRESETS[0].layout,
  fontSizes: LABEL_PRESETS[0].fontSizes,
  showBorder: false,
}

/** Returns the preset whose layout matches the settings, if any */
export function findPreset(settings: LabelSettings): LabelPreset | undefined {
  return LABEL_PRESETS.find((preset) =>
    (Object.keys(preset.layout) as (keyof LayoutFields)[]).every(
      (key) => preset.layout[key] === settings[key]
    )
  )
}

export interface LabelLayout {
  columns: number
  rows: number
  perPage: number
  /** Top-left corner of the label grid in mm */
  originX: number
  originY: number
}

/** Computes how many labels fit on an A4 page; the grid is centered within the margins */
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

const NUMBER_RULES: { name: string; min: number; max: number; get: (s: LabelSettings) => number }[] = [
  { name: 'רוחב מדבקה', min: 5, max: PAGE_WIDTH, get: (s) => s.labelWidth },
  { name: 'גובה מדבקה', min: 5, max: PAGE_HEIGHT, get: (s) => s.labelHeight },
  { name: 'שוליים בצדדים', min: 0, max: 50, get: (s) => s.marginX },
  { name: 'שוליים עליון ותחתון', min: 0, max: 50, get: (s) => s.marginY },
  { name: 'רווח אופקי', min: 0, max: 20, get: (s) => s.gapX },
  { name: 'רווח אנכי', min: 0, max: 20, get: (s) => s.gapY },
  { name: 'גודל פונט קוד', min: 4, max: 72, get: (s) => s.fontSizes.article },
  { name: 'גודל פונט תיאור', min: 4, max: 72, get: (s) => s.fontSizes.description },
  { name: 'גודל פונט מחירים', min: 4, max: 72, get: (s) => s.fontSizes.price },
]

/** Returns a user-facing error message, or null when the settings are valid */
export function getSettingsError(settings: LabelSettings): string | null {
  for (const rule of NUMBER_RULES) {
    const value = rule.get(settings)
    if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
      return `${rule.name} חייב להיות מספר בין ${rule.min} ל-${rule.max}`
    }
  }
  if (computeLayout(settings).perPage === 0) {
    return 'המדבקה לא נכנסת בעמוד A4 עם השוליים שהוגדרו'
  }
  return null
}

const STORAGE_KEY = 'priceforge.labelSettings'

/** Loads the last used settings; falls back to defaults when missing or invalid */
export function loadLabelSettings(): LabelSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!stored) return DEFAULT_LABEL_SETTINGS

    const settings: LabelSettings = {
      ...DEFAULT_LABEL_SETTINGS,
      ...stored,
      fontSizes: { ...DEFAULT_LABEL_SETTINGS.fontSizes, ...stored.fontSizes },
      showBorder: stored.showBorder === true,
    }
    return getSettingsError(settings) ? DEFAULT_LABEL_SETTINGS : settings
  } catch {
    return DEFAULT_LABEL_SETTINGS
  }
}

export function saveLabelSettings(settings: LabelSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (e.g. private mode) — settings just won't persist
  }
}
