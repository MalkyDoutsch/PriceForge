import type { LabelSettings } from '../types'
import { PAGE_HEIGHT, PAGE_WIDTH, computeLayout } from '../labelSettings'

interface PageLayoutPreviewProps {
  settings: LabelSettings
  totalLabels: number
}

/** Miniature A4 page showing the label grid, plus per-page and total counts */
export default function PageLayoutPreview({ settings, totalLabels }: PageLayoutPreviewProps) {
  const layout = computeLayout(settings)
  const pages = Math.ceil(totalLabels / layout.perPage)

  const cells = Array.from({ length: layout.perPage }, (_, i) => ({
    x: layout.originX + (i % layout.columns) * (settings.labelWidth + settings.gapX),
    y: layout.originY + Math.floor(i / layout.columns) * (settings.labelHeight + settings.gapY),
  }))

  return (
    <div className="page-preview">
      <svg
        className="page-preview-sheet"
        viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}
        role="img"
        aria-label="פריסת המדבקות בעמוד A4"
      >
        <rect className="page-preview-paper" width={PAGE_WIDTH} height={PAGE_HEIGHT} />
        {cells.map((cell, i) => (
          <rect
            key={i}
            className="page-preview-label"
            x={cell.x}
            y={cell.y}
            width={settings.labelWidth}
            height={settings.labelHeight}
          />
        ))}
      </svg>
      <div className="page-preview-summary">
        <span>
          {layout.columns} × {layout.rows} = <strong>{layout.perPage}</strong> מדבקות בעמוד
        </span>
        <span>
          {pages} עמודים · {totalLabels} מדבקות
        </span>
      </div>
    </div>
  )
}
