import React, { useId } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

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
  const generatedId = useId()
  const headingId = titleId || labelledBy || generatedId
  const backdropClass = variant === 'op' ? 'op-modal-backdrop' : 'rapport-modal-backdrop'
  const cardClass = variant === 'op' ? 'op-modal-card' : 'rapport-modal'
  const headClass = variant === 'op' ? 'op-modal-head' : 'rapport-modal-head'
  const closeClass = variant === 'op' ? 'op-modal-close' : 'rapport-modal-close'
  const kickerClass = 'rapport-modal-kicker'
  const hasHead = Boolean(title || kicker || subtitle)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !closeDisabled) onClose?.()
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName={cn(backdropClass, '!z-[80]')}
        aria-labelledby={headingId}
        className={cn(
          'max-w-none sm:max-w-none w-auto p-0 gap-0 border-0 bg-transparent shadow-none !z-[90]',
          cardClass,
          cardClassName,
        )}
        onPointerDownOutside={(event) => {
          if (closeDisabled) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (closeDisabled) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (closeDisabled) event.preventDefault()
        }}
      >
        {hasHead ? (
          <div className={headClass}>
            <div>
              {kicker ? <p className={kickerClass}>{kicker}</p> : null}
              {title ? (
                variant === 'op' ? (
                  <DialogTitle asChild>
                    <h3 id={headingId}>{title}</h3>
                  </DialogTitle>
                ) : (
                  <DialogTitle asChild>
                    <h2 id={headingId}>{title}</h2>
                  </DialogTitle>
                )
              ) : (
                <DialogTitle id={headingId} className="sr-only">Dialogue</DialogTitle>
              )}
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
        ) : (
          <DialogTitle id={headingId} className="sr-only">Dialogue</DialogTitle>
        )}
        {children}
        {footer ? (
          <div className={variant === 'op' ? 'op-modal-foot' : 'rapport-modal-actions'}>
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default Modal
