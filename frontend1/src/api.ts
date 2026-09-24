import type {
  ColumnMapping,
  InspectResult,
  LabelData,
  LabelSettings,
  ProcessParams,
  ProcessResult,
  SummaryFormat,
} from './types'

const API_BASE = 'http://localhost:3001/api'

async function toError(res: Response): Promise<Error> {
  try {
    const data = await res.json()
    return new Error(data.error || 'שגיאה בשרת')
  } catch {
    return new Error('שגיאה בשרת')
  }
}

async function postForFile(endpoint: string, body: object): Promise<Blob> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await toError(res)
  return res.blob()
}

/** Reads the sheet's first rows and the mapping suggested from its headers */
export async function inspectFile(file: File): Promise<InspectResult> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/inspect`, { method: 'POST', body: formData })
  if (!res.ok) throw await toError(res)
  return res.json()
}

export async function processFile(
  file: File,
  params: ProcessParams,
  mapping: ColumnMapping
): Promise<ProcessResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('euroRate', params.euroRate)
  formData.append('clubProfit', params.clubProfit)
  formData.append('regularProfit', params.regularProfit)
  formData.append('mapping', JSON.stringify(mapping))

  const res = await fetch(`${API_BASE}/process`, { method: 'POST', body: formData })
  if (!res.ok) throw await toError(res)
  return res.json()
}

export function fetchLabelsPdf(labels: LabelData[], settings: LabelSettings): Promise<Blob> {
  return postForFile('generate-pdf', { labels, settings })
}

export function fetchSummary(labels: LabelData[], format: SummaryFormat): Promise<Blob> {
  return postForFile('generate-summary', { labels, format })
}
