import React from 'react'

export function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR')
  } catch {
    return String(value)
  }
}

export function Spinner({ size = 18, label }) {
  return (
    <span className="reports-spinner" style={{ width: size, height: size }} role="status" aria-label={label || 'Chargement'}>
      <span className="reports-spinner-ring" />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

export function LoadingButton({
  children,
  loading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      className={`reports-btn ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="reports-btn-loading">
          <Spinner size={16} />
          <span>{loadingText || 'Patientez…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  )
}
