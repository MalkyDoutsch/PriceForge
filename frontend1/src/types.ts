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
