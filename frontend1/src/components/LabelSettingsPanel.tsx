import type { LabelFontSizes, LabelSettings } from '../types'
import { LABEL_PRESETS, findPreset } from '../labelSettings'
import NumberField from './NumberField'

interface LabelSettingsPanelProps {
  settings: LabelSettings
  onChange: (settings: LabelSettings) => void
}

export default function LabelSettingsPanel({ settings, onChange }: LabelSettingsPanelProps) {
  const activePreset = findPreset(settings)

  const update = (patch: Partial<LabelSettings>) => onChange({ ...settings, ...patch })
  const updateFont = (key: keyof LabelFontSizes, value: number) =>
    update({ fontSizes: { ...settings.fontSizes, [key]: value } })

  return (
    <div className="label-settings">
      <div className="preset-row">
        {LABEL_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-btn ${activePreset?.id === preset.id ? 'active' : ''}`}
            onClick={() => onChange({ ...settings, ...preset.layout, fontSizes: preset.fontSizes })}
          >
            {preset.name}
          </button>
        ))}
        <span className={`preset-btn custom ${activePreset ? '' : 'active'}`}>מותאם אישית</span>
      </div>

      <div className="settings-group">
        <span className="settings-group-title">מידות מדבקה (מ"מ)</span>
        <div className="fields settings-fields-2">
          <NumberField label="רוחב" value={settings.labelWidth} onChange={(v) => update({ labelWidth: v })} />
          <NumberField label="גובה" value={settings.labelHeight} onChange={(v) => update({ labelHeight: v })} />
        </div>
      </div>

      <div className="settings-group">
        <span className="settings-group-title">גודל פונט (pt)</span>
        <div className="fields">
          <NumberField label="קוד" value={settings.fontSizes.article} onChange={(v) => updateFont('article', v)} />
          <NumberField
            label="תיאור"
            value={settings.fontSizes.description}
            onChange={(v) => updateFont('description', v)}
          />
          <NumberField label="מחירים" value={settings.fontSizes.price} onChange={(v) => updateFont('price', v)} />
        </div>
      </div>

      <details className="settings-advanced">
        <summary>שוליים ורווחים (מ"מ)</summary>
        <div className="fields settings-fields-2">
          <NumberField label="שוליים בצדדים" value={settings.marginX} onChange={(v) => update({ marginX: v })} />
          <NumberField label="שוליים למעלה ולמטה" value={settings.marginY} onChange={(v) => update({ marginY: v })} />
          <NumberField label="רווח אופקי בין מדבקות" value={settings.gapX} onChange={(v) => update({ gapX: v })} />
          <NumberField label="רווח אנכי בין מדבקות" value={settings.gapY} onChange={(v) => update({ gapY: v })} />
        </div>
      </details>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={settings.showBorder}
          onChange={(e) => update({ showBorder: e.target.checked })}
        />
        הדפס מסגרת סביב כל מדבקה
      </label>
    </div>
  )
}
