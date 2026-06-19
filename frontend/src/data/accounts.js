// TODO: reemplazar por fetch a GET /api/accounts cuando el backend esté listo
export const ACCOUNTS = [{ id: 'franco', nombre: 'Franco' }]

export function getAccountById(id) {
  return ACCOUNTS.find((account) => account.id === id)
}
