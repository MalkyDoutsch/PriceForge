import type { ColumnMapping, InspectResult, MappedField, SheetRow } from './types'

export const MAPPED_FIELDS: { field: MappedField; name: string; required: boolean }[] = [
  { field: 'article', name: 'קוד', required: true },
  { field: 'description', name: 'תיאור', required: false },
  { field: 'price', name: 'מחיר', required: true },
  { field: 'pieces', name: 'כמות', required: false },
]

/** Data rows shown in the mapping preview */
const PREVIEW_DATA_ROWS = 5

/** Mapping being edited in the UI; required columns may still be unselected */
export type MappingDraft = Omit<ColumnMapping, 'article' | 'price'> & {
  article: number | null
  price: number | null
}

/** 1 → 'A', 26 → 'Z', 27 → 'AA' */
export function columnLetter(column: number): string {
  let letter = ''
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter
  }
  return letter
}

/** Header cells of the chosen header row (empty when there is none) */
export function getHeaderCells(inspect: InspectResult, headerRow: number | null): string[] {
  return inspect.rows.find((row) => row.rowNumber === headerRow)?.cells ?? []
}

/** First data rows, i.e. the rows after the header row */
export function getDataRows(inspect: InspectResult, headerRow: number | null): SheetRow[] {
  return inspect.rows
    .filter((row) => headerRow === null || row.rowNumber > headerRow)
    .slice(0, PREVIEW_DATA_ROWS)
}

/** Returns a user-facing error message, or null when the mapping is complete */
export function getMappingError(draft: MappingDraft): string | null {
  const missing = MAPPED_FIELDS.find(({ field, required }) => required && draft[field] === null)
  return missing ? `יש לבחור עמודת ${missing.name}` : null
}

/** Returns the final mapping, or null when a required column is missing */
export function toColumnMapping(draft: MappingDraft): ColumnMapping | null {
  const { article, price } = draft
  return article === null || price === null ? null : { ...draft, article, price }
}

const STORAGE_KEY = 'priceforge.columnMappings'
const MAX_SAVED_MAPPINGS = 20

/** Identifies a file layout: its header names, or its column count when it has no headers */
function layoutSignature(inspect: InspectResult): string {
  const headers = getHeaderCells(inspect, inspect.suggestion.headerRow)
  return headers.length > 0 ? `headers:${headers.join('|')}` : `columns:${inspect.columnCount}`
}

function loadSavedMappings(): Record<string, ColumnMapping> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

function fitsSheet(mapping: ColumnMapping, columnCount: number): boolean {
  return [mapping.article, mapping.price, mapping.description, mapping.pieces].every(
    (column) => column === null || (Number.isInteger(column) && column >= 1 && column <= columnCount)
  )
}

/**
 * Initial mapping for a file: the one saved for the same file layout,
 * otherwise the suggestion from its headers.
 */
export function initialMapping(inspect: InspectResult): MappingDraft {
  const saved = loadSavedMappings()[layoutSignature(inspect)]
  if (saved && fitsSheet(saved, inspect.columnCount)) return saved

  const { headerRow, columns } = inspect.suggestion
  return {
    article: columns.article ?? null,
    price: columns.price ?? null,
    description: columns.description ?? null,
    pieces: columns.pieces ?? null,
    headerRow,
    priceInCents: false,
  }
}

/** Remembers the mapping for files with the same layout */
export function saveMapping(inspect: InspectResult, mapping: ColumnMapping): void {
  try {
    const signature = layoutSignature(inspect)
    const others = Object.entries(loadSavedMappings()).filter(([key]) => key !== signature)
    // Keep the most recent mappings only
    const entries = [...others.slice(-(MAX_SAVED_MAPPINGS - 1)), [signature, mapping]]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // Storage unavailable (e.g. private mode) — the mapping just won't be remembered
  }
}
