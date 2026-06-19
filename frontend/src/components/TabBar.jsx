export function TabBar({ tabs, activeTab, onTabChange }) {
  return (
    <nav className="tab-bar" aria-label="Secciones del workspace">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab-bar__item${activeTab === tab.id ? ' tab-bar__item--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
