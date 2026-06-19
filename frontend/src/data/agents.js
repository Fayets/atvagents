export const AGENTS = [
  {
    id: 'setter-master',
    name: 'Setter Master',
    role: 'Setting por DM',
    active: true,
    color: '#ff3d4d',
    shape: 'spiky',
  },
  {
    id: 'closer',
    name: 'Closer',
    role: 'Cierre en llamada',
    active: false,
    color: '#3b82f6',
    shape: 'round',
  },
  {
    id: 'director-operaciones',
    name: 'Director de Operaciones',
    role: 'Operaciones y sistemas',
    active: false,
    color: '#8b5cf6',
    shape: 'square',
  },
  {
    id: 'estratega-contenido',
    name: 'Estratega de Contenido',
    role: 'Contenido y posicionamiento',
    active: false,
    color: '#22c55e',
    shape: 'round',
  },
]

export const SETTER_TABS = [
  { id: 'generar', label: 'Generar' },
  { id: 'aprobacion', label: 'Aprobación' },
  { id: 'marca', label: 'Llamadas' },
  { id: 'conexion', label: 'Conexión' },
  { id: 'knowledge', label: 'Knowledge' },
]

export const PLACEHOLDER_TABS = ['aprobacion']

export function getAgentById(id) {
  return AGENTS.find((agent) => agent.id === id)
}
