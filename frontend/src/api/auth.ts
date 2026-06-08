import client from './client'

export const adminLogin = async (login_id: string, password: string): Promise<void> => {
  await client.post('/auth/login', { login_id, password })
}

export const adminLogout = async (): Promise<void> => {
  await client.post('/auth/logout')
}

export const checkAdminAuth = async (): Promise<boolean> => {
  try {
    await client.get('/auth/me')
    return true
  } catch {
    return false
  }
}
