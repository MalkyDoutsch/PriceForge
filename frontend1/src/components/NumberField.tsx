import { useId } from 'react'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
}

/** Numeric input; an empty field is reported as NaN */
export default function NumberField({ label, value, onChange, step = 0.5, min = 0 }: NumberFieldProps) {
  const id = useId()

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        step={step}
        min={min}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
    </div>
  )
}
