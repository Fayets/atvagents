export function TabBar({ tabs, activeTab, onTabChange, indicatorTabs = [] }) {
  return (
    <nav className="tab-bar" aria-label="Secciones del workspace">
      {tabs.map((tab) => {
        const hasIndicator = indicatorTabs.includes(tab.id)

        return (
          <button
            key={tab.id}
            type="button"
            className={`tab-bar__item${activeTab === tab.id ? ' tab-bar__item--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
            {hasIndicator && (
              <span
                className="tab-bar__indicator"
                aria-label="Generación en curso"
                title="Generación en curso"
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
