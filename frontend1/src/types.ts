// Mirrors backend/src/types — keep both in sync.

export interface LabelData {
  article: string
  description: string
  clubPrice: number
  regularPrice: number
  quantity: number
}

export interface ProcessResult {
  success: boolean
  totalRows: number
  totalLabels: number
  labels: LabelData[]
}

export interface ProcessParams {
  euroRate: string
  clubProfit: string
  regularProfit: string
}

export type SummaryFormat = 'pdf' | 'excel'

/** A non-empty sheet row; cells are the displayed texts, cells[0] is column A */
export interface SheetRow {
  rowNumber: number
  cells: string[]
}

export type MappedField = 'article' | 'description' | 'price' | 'pieces'

/** Which sheet column holds each field. Columns are 1-based (A = 1). */
export interface ColumnMapping {
  article: number
  price: number
  description: number | null
  /** null: each row is one piece */
  pieces: number | null
  /** Row number of the header row; null when the sheet has no headers */
  headerRow: number | null
  /** Price column is in cents (960 = 9.60) */
  priceInCents: boolean
}

/** Mapping suggested by the server from recognized header names */
export interface MappingSuggestion {
  headerRow: number | null
  columns: Partial<Record<MappedField, number>>
}

export interface InspectResult {
  columnCount: number
  /** First rows of the sheet (including the header row, if any) */
  rows: SheetRow[]
  suggestion: MappingSuggestion
}

/** Font sizes in pt */
export interface LabelFontSizes {
  article: number
  description: number
  price: number
}

/** User-adjustable label layout. All lengths are in mm. */
export interface LabelSettings {
  labelWidth: number
  labelHeight: number
  /** Minimum page margins (left/right, top/bottom); the grid is centered within them */
  marginX: number
  marginY: number
  /** Gaps between labels (horizontal, vertical) */
  gapX: number
  gapY: number
  fontSizes: LabelFontSizes
  showBorder: boolean
}
