import { useId } from 'react'
import type { InspectResult } from '../types'
import {
  MAPPED_FIELDS,
  type MappingDraft,
  columnLetter,
  getDataRows,
  getHeaderCells,
} from '../columnMapping'
import './ColumnMappingPanel.css'

/** Sample values shown next to each column in the dropdowns */
const SAMPLES_PER_COLUMN = 3
const MAX_SAMPLE_LENGTH = 18

interface ColumnMappingPanelProps {
  inspect: InspectResult
  mapping: MappingDraft
  onChange: (mapping: MappingDraft) => void
}

const truncate = (text: string) =>
  text.length > MAX_SAMPLE_LENGTH ? `${text.slice(0, MAX_SAMPLE_LENGTH)}…` : text

/** Lets the user choose which column holds each field, with a preview of the first rows */
export default function ColumnMappingPanel({ inspect, mapping, onChange }: ColumnMappingPanelProps) {
  const idPrefix = useId()
  const headers = getHeaderCells(inspect, mapping.headerRow)
  const dataRows = getDataRows(inspect, mapping.headerRow)
  const columns = Array.from({ length: inspect.columnCount }, (_, i) => i + 1)

  const optionLabel = (column: number) => {
    const header = headers[column - 1]
    const samples = dataRows
      .map((row) => row.cells[column - 1])
      .filter(Boolean)
      .slice(0, SAMPLES_PER_COLUMN)
      .map(truncate)
    return [columnLetter(column), header && `· ${truncate(header)}`, samples.length > 0 && `— ${samples.join(', ')}`]
      .filter(Boolean)
      .join(' ')
  }

  // Field name per mapped column, shown above the preview table
  const fieldNameByColumn = new Map<number, string>()
  for (const { field, name } of MAPPED_FIELDS) {
    const column = mapping[field]
    if (column !== null) fieldNameByColumn.set(column, name)
  }

  // When enabling headers, use the detected header row, or the first row
  const toggleHeaderRow = (hasHeaders: boolean) =>
    onChange({
      ...mapping,
      headerRow: hasHeaders ? (inspect.suggestion.headerRow ?? inspect.rows[0]?.rowNumber ?? 1) : null,
    })

  return (
    <div className="column-mapping">
      <div className="mapping-fields">
        {MAPPED_FIELDS.map(({ field, name, required }) => (
          <div className="field" key={field}>
            <label htmlFor={`${idPrefix}-${field}`}>
              {name}
              {required && <span className="required-mark"> *</span>}
            </label>
            <select
              id={`${idPrefix}-${field}`}
              value={mapping[field] ?? ''}
              onChange={(e) =>
                onChange({ ...mapping, [field]: e.target.value === '' ? null : Number(e.target.value) })
              }
            >
              <option value="">
                {required ? 'בחירת עמודה' : field === 'pieces' ? 'אין (מדבקה אחת לכל שורה)' : 'אין'}
              </option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {optionLabel(column)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mapping-options">
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={mapping.headerRow !== null}
            onChange={(e) => toggleHeaderRow(e.target.checked)}
          />
          בקובץ יש שורת כותרות
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={mapping.priceInCents}
            onChange={(e) => onChange({ ...mapping, priceInCents: e.target.checked })}
          />
          המחיר בסנטים (960 = 9.60)
        </label>
      </div>

      <div className="mapping-preview" dir="ltr">
        <table>
          <thead>
            <tr className="mapping-preview-fields">
              {columns.map((column) => (
                <th key={column} className={fieldNameByColumn.has(column) ? 'mapped' : ''}>
                  {fieldNameByColumn.get(column) ?? ''}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((column) => (
                <th key={column} className={fieldNameByColumn.has(column) ? 'mapped' : ''}>
                  {columnLetter(column)}
                  {headers[column - 1] && <span className="mapping-preview-header">{headers[column - 1]}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row) => (
              <tr key={row.rowNumber}>
                {columns.map((column) => (
                  <td key={column} className={fieldNameByColumn.has(column) ? 'mapped' : ''}>
                    {row.cells[column - 1]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
