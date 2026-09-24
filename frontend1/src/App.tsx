import { useState, useRef, useCallback, useEffect } from 'react'
import type { LabelSettings, ProcessResult, SummaryFormat } from './types'
import { fetchLabelsPdf, fetchSummary, processFile } from './api'
import { saveBlob, showBlobInTab } from './download'
import { getSettingsError, loadLabelSettings, saveLabelSettings } from './labelSettings'
import LabelSetup from './components/LabelSetup'

const SUMMARY_FORMATS: { value: SummaryFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
]

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [euroRate, setEuroRate] = useState('')
  const [clubProfit, setClubProfit] = useState('')
  const [regularProfit, setRegularProfit] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summaryFormat, setSummaryFormat] = useState<SummaryFormat>('pdf')
  const [labelSettings, setLabelSettings] = useState<LabelSettings>(loadLabelSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Remember the label settings for next time
  useEffect(() => {
    saveLabelSettings(labelSettings)
  }, [labelSettings])

  const settingsError = getSettingsError(labelSettings)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped)
      setError(null)
    } else {
      setError('יש להעלות קובץ Excel בלבד (.xlsx / .xls)')
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (!file) return setError('נא לבחור קובץ Excel')
    if (!euroRate || !clubProfit || !regularProfit) return setError('נא למלא את כל השדות')

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      setResult(await processFile(file, { euroRate, clubProfit, regularProfit }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setEuroRate('')
    setClubProfit('')
    setRegularProfit('')
  }

  const handleDownloadLabels = async () => {
    if (!result) return
    setError(null)

    try {
      saveBlob(await fetchLabelsPdf(result.labels, labelSettings), `labels-${Date.now()}.pdf`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handlePreviewLabels = async () => {
    if (!result) return
    setError(null)

    // Open the tab before awaiting, otherwise the popup blocker stops it
    const tab = window.open('', '_blank')
    if (!tab) return setError('הדפדפן חסם פתיחת לשונית חדשה')

    try {
      showBlobInTab(await fetchLabelsPdf(result.labels, labelSettings), tab)
    } catch (err) {
      tab.close()
      setError((err as Error).message)
    }
  }

  const handleDownloadSummary = async () => {
    if (!result) return
    setError(null)

    try {
      const extension = summaryFormat === 'pdf' ? 'pdf' : 'xlsx'
      saveBlob(await fetchSummary(result.labels, summaryFormat), `summary-${Date.now()}.${extension}`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="app" dir="rtl">
      <header className="header">
        <div className="logo-mark" />
        <h1>PriceForge</h1>
        <p className="subtitle">מחולל מדבקות מחירים</p>
      </header>

      <main className="main">
        {!result ? (
          <div className="card">
            {/* File Upload */}
            <section className="section">
              <label className="section-label">קובץ Excel</label>
              <div
                className={`drop-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {file ? (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                ) : (
                  <div className="drop-hint">
                    <span className="drop-icon">⬆</span>
                    <span>גרור קובץ לכאן או לחץ לבחירה</span>
                    <span className="drop-sub">.xlsx / .xls בלבד</span>
                  </div>
                )}
              </div>
            </section>

            {/* Parameters */}
            <section className="section">
              <label className="section-label">פרמטרי חישוב</label>
              <div className="fields">
                <div className="field">
                  <label>שער יורו</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3.90"
                    value={euroRate}
                    onChange={(e) => setEuroRate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>רווח מחיר מועדון</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={clubProfit}
                    onChange={(e) => setClubProfit(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>רווח מחיר רגיל</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="3.0"
                    value={regularProfit}
                    onChange={(e) => setRegularProfit(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {error && <div className="error-msg">{error}</div>}

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'עבד קובץ'}
            </button>
          </div>
        ) : (
          <div className="card result-card">
            <div className="result-header">
              <div className="result-stats">
                <div className="stat">
                  <span className="stat-num">{result.totalRows}</span>
                  <span className="stat-label">פריטים</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">{result.totalLabels}</span>
                  <span className="stat-label">מדבקות</span>
                </div>
              </div>
              <button className="reset-btn" onClick={reset}>קובץ חדש</button>
            </div>

            <div className="labels-table">
              <div className="table-head">
                <span>מודל</span>
                <span>תיאור</span>
                <span>מחיר מועדון</span>
                <span>מחיר רגיל</span>
                <span>כמות</span>
              </div>
              <div className="table-body">
                {result.labels.map((label, i) => (
                  <div className="table-row" key={i}>
                    <span className="article">{label.article}</span>
                    <span className="desc">{label.description}</span>
                    <span className="price club">₪{label.clubPrice}</span>
                    <span className="price regular">₪{label.regularPrice}</span>
                    <span className="qty">×{label.quantity}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.labels.length > 0 && (
              <LabelSetup
                settings={labelSettings}
                onChange={setLabelSettings}
                sampleLabel={result.labels[0]}
                totalLabels={result.totalLabels}
              />
            )}

            {error && <div className="error-msg">{error}</div>}

            <div className="download-actions">
              <div className="download-group">
                <button
                  type="button"
                  className="preview-btn"
                  onClick={handlePreviewLabels}
                  disabled={!!settingsError}
                >
                  תצוגה מקדימה של עמוד
                </button>
                <button
                  className="download-btn"
                  onClick={handleDownloadLabels}
                  disabled={!!settingsError}
                >
                  הורד מדבקות (PDF)
                </button>
              </div>
              <div className="download-group">
                <div className="format-toggle">
                  {SUMMARY_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={`toggle-btn ${summaryFormat === f.value ? 'active' : ''}`}
                      onClick={() => setSummaryFormat(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button className="download-btn secondary" onClick={handleDownloadSummary}>
                  הורדת סיכום
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700&family=Space+Mono:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0f0f11;
          --surface: #1a1a1f;
          --surface2: #22222a;
          --border: #2e2e38;
          --accent: #e8c547;
          --accent2: #5b8def;
          --text: #f0efe8;
          --muted: #7a7a8a;
          --danger: #e85b5b;
          --radius: 12px;
        }

        body { background: var(--bg); color: var(--text); font-family: 'Heebo', sans-serif; }

        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          position: relative;
        }

        .logo-mark {
          width: 48px; height: 48px;
          background: var(--accent);
          border-radius: 10px;
          margin: 0 auto 16px;
          transform: rotate(12deg);
          position: relative;
        }
        .logo-mark::after {
          content: '';
          position: absolute;
          inset: 8px;
          background: var(--bg);
          border-radius: 4px;
          transform: rotate(-12deg);
        }

        h1 {
          font-family: 'Space Mono', monospace;
          font-size: 2rem;
          font-weight: 700;
          letter-spacing: -1px;
          color: var(--accent);
        }

        .subtitle {
          color: var(--muted);
          font-size: 0.9rem;
          margin-top: 4px;
          font-weight: 300;
        }

        .main { width: 100%; max-width: 580px; }

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .section { display: flex; flex-direction: column; gap: 10px; }

        .section-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .drop-zone {
          border: 1.5px dashed var(--border);
          border-radius: var(--radius);
          padding: 32px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: var(--surface2);
        }
        .drop-zone:hover, .drop-zone.dragging {
          border-color: var(--accent);
          background: rgba(232,197,71,0.05);
        }
        .drop-zone.has-file { border-style: solid; border-color: var(--accent2); }

        .drop-hint { display: flex; flex-direction: column; gap: 6px; color: var(--muted); font-size: 0.9rem; }
        .drop-icon { font-size: 1.5rem; }
        .drop-sub { font-size: 0.75rem; }

        .file-info { display: flex; align-items: center; gap: 12px; justify-content: center; }
        .file-icon { font-size: 1.4rem; }
        .file-name { font-weight: 500; color: var(--text); }
        .file-size { color: var(--muted); font-size: 0.8rem; }

        .fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label { font-size: 0.8rem; color: var(--muted); }
        .field input {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text);
          font-size: 0.95rem;
          font-family: 'Space Mono', monospace;
          transition: border-color 0.2s;
          width: 100%;
        }
        .field input:focus { outline: none; border-color: var(--accent); }
        .field input::placeholder { color: var(--muted); }

        .error-msg {
          background: rgba(232,91,91,0.1);
          border: 1px solid rgba(232,91,91,0.3);
          border-radius: 8px;
          padding: 12px 16px;
          color: var(--danger);
          font-size: 0.9rem;
        }

        .submit-btn {
          background: var(--accent);
          color: #0f0f11;
          border: none;
          border-radius: var(--radius);
          padding: 16px;
          font-size: 1rem;
          font-weight: 700;
          font-family: 'Heebo', sans-serif;
          cursor: pointer;
          transition: opacity 0.18s, transform 0.12s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(0,0,0,0.2);
          border-top-color: #000;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Result */
        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .result-stats { display: flex; align-items: center; gap: 20px; }
        .stat { display: flex; flex-direction: column; }
        .stat-num { font-family: 'Space Mono', monospace; font-size: 1.6rem; color: var(--accent); font-weight: 700; }
        .stat-label { font-size: 0.75rem; color: var(--muted); }
        .stat-divider { width: 1px; height: 36px; background: var(--border); }

        .reset-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 16px;
          color: var(--muted);
          cursor: pointer;
          font-family: 'Heebo', sans-serif;
          font-size: 0.85rem;
          transition: all 0.18s;
        }
        .reset-btn:hover { border-color: var(--text); color: var(--text); }

        .labels-table { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }

        .table-head {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr 1fr 0.6fr;
          padding: 10px 16px;
          background: var(--surface2);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          gap: 8px;
        }

        .table-body { max-height: 340px; overflow-y: auto; }
        .table-body::-webkit-scrollbar { width: 4px; }
        .table-body::-webkit-scrollbar-track { background: transparent; }
        .table-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .table-row {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr 1fr 0.6fr;
          padding: 12px 16px;
          gap: 8px;
          border-top: 1px solid var(--border);
          font-size: 0.88rem;
          align-items: center;
          transition: background 0.1s;
        }
        .table-row:hover { background: var(--surface2); }

        .article { font-family: 'Space Mono', monospace; font-size: 0.78rem; color: var(--muted); }
        .desc { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .price { font-family: 'Space Mono', monospace; font-weight: 700; }
        .price.club { color: var(--accent); }
        .price.regular { color: var(--accent2); }
        .qty { color: var(--muted); font-size: 0.8rem; }

        .download-btn {
          background: var(--accent);
          border: none;
          border-radius: var(--radius);
          padding: 14px;
          color: #0f0f11;
          font-size: 0.9rem;
          font-weight: 700;
          font-family: 'Heebo', sans-serif;
          cursor: pointer;
          transition: opacity 0.18s, transform 0.12s;
        }
        .download-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .download-btn.secondary { background: var(--accent2); }
        .download-btn:disabled, .preview-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .preview-btn {
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 7px;
          color: var(--text);
          font-family: 'Heebo', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .preview-btn:hover:not(:disabled) { border-color: var(--accent); }

        .download-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: end; }

        .download-group { display: flex; flex-direction: column; gap: 8px; }

        .format-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 3px;
          gap: 3px;
        }
        .toggle-btn {
          background: transparent;
          border: none;
          border-radius: 6px;
          padding: 6px;
          color: var(--muted);
          font-family: 'Heebo', sans-serif;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .toggle-btn:hover { color: var(--text); }
        .toggle-btn.active { background: var(--accent2); color: #0f0f11; }

        @media (max-width: 480px) {
          .fields { grid-template-columns: 1fr; }
          .download-actions { grid-template-columns: 1fr; }
          .table-head, .table-row { grid-template-columns: 1fr 1fr 1fr; }
          .table-head span:nth-child(2),
          .table-row .desc { display: none; }
          .table-head span:last-child,
          .table-row .qty { display: none; }
        }
      `}</style>
    </div>
  )
}