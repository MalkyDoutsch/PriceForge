import type { LabelData, LabelSettings } from '../types'
import { getSettingsError } from '../labelSettings'
import LabelSettingsPanel from './LabelSettingsPanel'
import LabelPreview from './LabelPreview'
import PageLayoutPreview from './PageLayoutPreview'
import './LabelSetup.css'

interface LabelSetupProps {
  settings: LabelSettings
  onChange: (settings: LabelSettings) => void
  sampleLabel: LabelData
  totalLabels: number
}

/** Label settings with a live single-label preview and page layout */
export default function LabelSetup({ settings, onChange, sampleLabel, totalLabels }: LabelSetupProps) {
  const settingsError = getSettingsError(settings)

  return (
    <section className="section label-setup">
      <span className="section-label">הגדרות מדבקה</span>

      {settingsError ? (
        <div className="error-msg">{settingsError}</div>
      ) : (
        <div className="label-setup-previews">
          <LabelPreview label={sampleLabel} settings={settings} />
          <PageLayoutPreview settings={settings} totalLabels={totalLabels} />
        </div>
      )}

      <LabelSettingsPanel settings={settings} onChange={onChange} />
    </section>
  )
}
