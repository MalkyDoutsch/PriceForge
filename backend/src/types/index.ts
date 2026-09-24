/** A product row extracted from the uploaded sheet */
export interface ExcelRow {
  article: string
  description: string
  /** Price in EUR */
  price: number
  pieces: number
}

/** A non-empty sheet row; cells are the displayed texts, cells[0] is column A */
export interface SheetRow {
  rowNumber: number
  cells: string[]
}

export interface Sheet {
  columnCount: number
  rows: SheetRow[]
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

/** Mapping suggested from recognized header names */
export interface MappingSuggestion {
  headerRow: number | null
  columns: Partial<Record<MappedField, number>>
}

/** Returned by /api/inspect so the user can map the columns */
export interface InspectResult {
  columnCount: number
  /** First rows of the sheet (including the header row, if any) */
  rows: SheetRow[]
  suggestion: MappingSuggestion
}

export interface ProcessRequest {
  euroRate: number
  clubProfit: number
  regularProfit: number
}

export interface PriceResult {
  clubPrice: number
  regularPrice: number
}

export interface LabelData {
  article: string
  description: string
  clubPrice: number
  regularPrice: number
  quantity: number
}

export type SummaryFormat = 'pdf' | 'excel'

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