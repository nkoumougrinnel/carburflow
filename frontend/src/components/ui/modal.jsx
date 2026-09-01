import React, { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function Modal({
  open = true,
  onClose,
  title,
  titleId,
  kicker,
  subtitle,
  children,
  footer,
  variant = 'rapport',
  cardClassName = '',
  closeDisabled = false,
  closeLabel = 'Fermer',
  labelledBy,
}) {
  const cardRef = useRef(null)
  const generatedId = useId()
  const headingId = titleId || labelledBy || generatedId
  const trapFocus = variant === 'rapport' || variant === 'op'

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape' && !closeDisabled) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, closeDisabled])

  useEffect(() => {
    if (!open || !trapFocus) return undefined
    const root = cardRef.current
    if (!root) return undefined
    const nodes = Array.from(root.querySelectorAll(FOCUSABLE))
    nodes[0]?.focus()
    const onKey = (event) => {
      if (event.key !== 'Tab' || !nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKey)
    return () => root.removeEventListener('keydown', onKey)
  }, [open, trapFocus])

  if (!open) return null

  const backdropClass = variant === 'op' ? 'op-modal-backdrop' : 'rapport-modal-backdrop'
  const cardClass = variant === 'op' ? 'op-modal-card' : 'rapport-modal'
  const headClass = variant === 'op' ? 'op-modal-head' : 'rapport-modal-head'
  const closeClass = variant === 'op' ? 'op-modal-close' : 'rapport-modal-close'
  const kickerClass = variant === 'op' ? 'rapport-modal-kicker' : 'rapport-modal-kicker'

  return (
    <div
      className={backdropClass}
      role="presentation"
      onClick={() => { if (!closeDisabled) onClose?.() }}
    >
      <div
        ref={cardRef}
        className={`${cardClass} ${cardClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || kicker || subtitle) && (
          <div className={headClass}>
            <div>
              {kicker ? <p className={kickerClass}>{kicker}</p> : null}
              {title
                ? (variant === 'op'
                  ? <h3 id={headingId}>{title}</h3>
                  : <h2 id={headingId}>{title}</h2>)
                : <span id={headingId} className="sr-only">Dialogue</span>}
              {subtitle ? (variant === 'op' ? subtitle : <p>{subtitle}</p>) : null}
            </div>
            <button
              type="button"
              className={closeClass}
              onClick={onClose}
              aria-label={closeLabel}
              disabled={closeDisabled}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        {children}
        {footer ? (
          <div className={variant === 'op' ? 'op-modal-foot' : 'rapport-modal-actions'}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default Modal
