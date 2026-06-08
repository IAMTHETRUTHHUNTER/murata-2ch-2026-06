import client from './client'

export type NGWord = {
  id: number
  word: string
  created_at: string
}

export const getNGWords = async (): Promise<NGWord[]> => {
  const res = await client.get('/ngwords/')
  return res.data
}

export const addNGWord = async (word: string): Promise<NGWord> => {
  const res = await client.post('/ngwords/', { word })
  return res.data
}

export const deleteNGWord = async (id: number): Promise<void> => {
  await client.delete(`/ngwords/${id}`)
}
