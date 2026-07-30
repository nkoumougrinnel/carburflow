import React from 'react'

/**
 * Mini-app layout: barre latérale gauche + panneau de contenu.
 * items: [{ id, label, description?, icon? }]
 */
function SectionWorkspace({
  title,
  subtitle,
  items = [],
  activeId,
  onChange,
  children,
  className = '',
}) {
  const active = items.find((item) => item.id === activeId) || items[0]

  return (
    <div className={`section-workspace ${className}`.trim()}>
      <aside className="section-workspace-rail" aria-label={title || 'Navigation de section'}>
        <div className="section-workspace-brand">
          {title && <div className="section-workspace-title">{title}</div>}
          {subtitle && <p className="section-workspace-subtitle">{subtitle}</p>}
        </div>

        <nav className="section-workspace-nav">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = item.id === (active?.id)
            return (
              <button
                key={item.id}
                type="button"
                className={`section-workspace-item${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChange?.(item.id)}
              >
                {Icon ? (
                  <span className="section-workspace-item-icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2.1} />
                  </span>
                ) : null}
                <span className="section-workspace-item-copy">
                  <span className="section-workspace-item-label">
                    {item.label}
                    {item.badge != null && item.badge !== '' ? (
                      <span className="section-workspace-item-badge">{item.badge}</span>
                    ) : null}
                  </span>
                  {item.description ? (
                    <span className="section-workspace-item-desc">{item.description}</span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="section-workspace-main">
        {active && (
          <header className="section-workspace-pane-head">
            <h2>{active.label}</h2>
            {active.description ? <p>{active.description}</p> : null}
          </header>
        )}
        <div className="section-workspace-pane">
          {children}
        </div>
      </div>
    </div>
  )
}

export default SectionWorkspace
