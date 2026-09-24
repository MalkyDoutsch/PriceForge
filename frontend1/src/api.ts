import type { LabelData, LabelSettings, ProcessParams, ProcessResult, SummaryFormat } from './types'

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

export async function processFile(file: File, params: ProcessParams): Promise<ProcessResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('euroRate', params.euroRate)
  formData.append('clubProfit', params.clubProfit)
  formData.append('regularProfit', params.regularProfit)

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
