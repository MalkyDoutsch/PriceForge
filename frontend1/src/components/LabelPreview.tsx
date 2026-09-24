import { useMemo } from 'react'
import type { LabelData, LabelSettings } from '../types'
import { PT_TO_MM, buildLabelContent, lineHeightMm } from '../labelContent'

/** Maximum on-screen size of the preview in px */
const MAX_WIDTH_PX = 300
const MAX_HEIGHT_PX = 170

interface LabelPreviewProps {
  label: LabelData
  settings: LabelSettings
}

/** Scaled on-screen rendering of a single label, laid out like the PDF */
export default function LabelPreview({ label, settings }: LabelPreviewProps) {
  const { lines, contentHeight, overflow } = useMemo(
    () => buildLabelContent(label, settings),
    [label, settings]
  )

  // px per mm
  const scale = Math.min(MAX_WIDTH_PX / settings.labelWidth, MAX_HEIGHT_PX / settings.labelHeight)

  return (
    <div className="label-preview">
      <div
        className={`label-preview-sticker ${settings.showBorder ? 'with-border' : ''}`}
        style={{
          width: settings.labelWidth * scale,
          height: settings.labelHeight * scale,
          paddingTop: Math.max(0, (settings.labelHeight - contentHeight) / 2) * scale,
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className="label-preview-line"
            style={{
              fontSize: line.size * PT_TO_MM * scale,
              lineHeight: `${lineHeightMm(line.size) * scale}px`,
              fontWeight: line.bold ? 700 : 400,
            }}
          >
            {line.text}
          </div>
        ))}
      </div>
      <span className="label-preview-caption">
        {settings.labelWidth}×{settings.labelHeight} מ"מ · דוגמה: {label.article}
      </span>
      {overflow && (
        <div className="label-preview-warning">הטקסט חורג מגבולות המדבקה, כדאי להקטין את הפונט</div>
      )}
    </div>
  )
}
