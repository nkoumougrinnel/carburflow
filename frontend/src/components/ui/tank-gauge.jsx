import React from 'react'

/**
 * TankGauge Atom
 *
 * A unified component for visualizing fuel levels.
 * Supports vertical (detailed) and horizontal (compact) variants.
 *
 * @param {Object} props
 * @param {number} props.percent - Fill level percentage (0-100)
 * @param {number} props.currentVolume - Current volume in Liters
 * @param {number} props.capacity - Total capacity in Liters
 * @param {'vertical' | 'horizontal'} props.variant - The visual style of the gauge
 * @param {'sm' | 'md' | 'lg'} props.size - The size of the gauge
 * @param {boolean} props.showLabels - Whether to display volume labels
 */
export function TankGauge({
  percent = 0,
  currentVolume = 0,
  capacity = 0,
  variant = 'vertical',
  size = 'md',
  showLabels = false,
}) {
  const safePercent = Math.min(100, Math.max(0, percent || 0))

  // Color logic based on severity
  let colorClass = 'neutral'
  let fillGradient = 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
  let glowColor = 'rgba(16, 185, 129, 0.25)'
  let barColor = '#10b981'

  if (safePercent < 20) {
    colorClass = 'critical'
    fillGradient = 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)'
    glowColor = 'rgba(239, 68, 68, 0.35)'
    barColor = '#ef4444'
  } else if (safePercent < 40) {
    colorClass = 'warning'
    fillGradient = 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
    glowColor = 'rgba(245, 158, 11, 0.3)'
    barColor = '#f59e0b'
  }

  if (variant === 'vertical') {
    return (
      <div
        className={`ui-tank-gauge ui-tank-gauge--vertical ui-tank-gauge--${size}`}
        title={`Cuve: ${currentVolume} L / ${capacity} L (${Math.round(safePercent)}%)`}
      >
        <div className="ui-tank-container">
          <div className="ui-tank-cap-top" />
          <div className="ui-tank-body">
            <div className="ui-tank-ticks">
              <span className="ui-tank-tick" style={{ bottom: '75%' }}>75%</span>
              <span className="ui-tank-tick" style={{ bottom: '50%' }}>50%</span>
              <span className="ui-tank-tick" style={{ bottom: '25%' }}>25%</span>
            </div>

            <div
              className="ui-tank-liquid"
              style={{
                height: `${safePercent}%`,
                background: fillGradient,
                boxShadow: `0 0 12px ${glowColor}`,
              }}
            >
              <div className="ui-tank-liquid-surface" />
            </div>

            <div className="ui-tank-glass-shine" />
          </div>
          <div className="ui-tank-cap-bottom" />
        </div>
        {showLabels && (
          <div className="ui-tank-labels">
            <strong>{Math.round(safePercent)}%</strong>
            <span>{currentVolume} / {capacity} L</span>
          </div>
        )}
      </div>
    )
  }

  // Horizontal variant (Compact Bar)
  return (
    <div className={`ui-tank-gauge ui-tank-gauge--horizontal ui-tank-gauge--${size}`}>
      <div className="ui-tank-track">
        <div
          className="ui-tank-fill"
          style={{ width: `${safePercent}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabels && (
        <div className="ui-tank-labels-horizontal">
          <span>{Math.round(safePercent)}%</span>
          <span>{currentVolume} / {capacity} L</span>
        </div>
      )}
    </div>
  )
}

export default TankGauge
