import { useState } from 'react'
import { ACCOUNTS, getAccountById } from '../../data/accounts'
import { getActiveAccountId, saveActiveAccountId } from '../../utils/storage'

export function ConexionTab() {
  const [activeId, setActiveId] = useState(() => getActiveAccountId())
  const activeAccount = getAccountById(activeId)

  function handleChange(e) {
    const id = e.target.value
    setActiveId(id)
    saveActiveAccountId(id)
  }

  return (
    <div className="conexion-tab">
      <div className="panel-card">
        <h2 className="panel-card__title">Cuenta de Claude</h2>
        <p className="panel-card__text">
          Elegí con qué cuenta del equipo corre el Setter. Cada persona usa su propia sesión de Claude.
        </p>
        <label className="conexion-tab__label" htmlFor="active-account">
          Cuenta
        </label>
        <select
          id="active-account"
          className="atv-select"
          value={activeId}
          onChange={handleChange}
        >
          <option value="">Seleccioná una cuenta</option>
          {ACCOUNTS.map((account) => (
            <option key={account.id} value={account.id}>
              {account.nombre}
            </option>
          ))}
        </select>
        {activeAccount && (
          <p className="conexion-tab__active">Cuenta activa: {activeAccount.nombre}</p>
        )}
      </div>
    </div>
  )
}
