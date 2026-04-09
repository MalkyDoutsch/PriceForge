export interface ExcelRow {
  article: string
  description: string
  colorCode: string
  colorDescription: string
  size: string
  family: string
  price: number
  ean: string
  pieces: number
  segment: string
  articleType: string
}

export interface ProcessRequest {
  euroRate: number
  clubProfit: number
  regularProfit: number
  format: LabelFormat
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

export type LabelFormat = 'pdf-a4' | 'excel'