import client from './client'

export type Thread = {
  id: number
  title: string
  updated_at: string
  comment_count: number
}

export type Comment = {
  id: number
  number: number
  name: string
  email: string
  trip: string
  user_id: string
  content: string
  created_at: string
  is_abone: boolean
}

export type ThreadDetail = {
  id: number
  title: string
  created_at: string
  comments: Comment[]
}

export type CommentCreate = {
  name: string
  email: string
  content: string
}

export type SortOrder = 'newest' | 'oldest'

export const getThreads = async (sort: SortOrder): Promise<Thread[]> => {
  const res = await client.get('/threads/', { params: { sort } })
  return res.data
}

export const getThreadDetail = async (id: number): Promise<ThreadDetail> => {
  const res = await client.get(`/threads/${id}`)
  return res.data
}

export const postComment = async (
  threadId: number,
  body: CommentCreate
): Promise<Comment> => {
  const res = await client.post(`/threads/${threadId}/comments`, body)
  return res.data
}

export type ThreadCreate = {
  title: string
  name: string
  email: string
  content: string
}

export const createThread = async (body: ThreadCreate): Promise<number> => {
  const res = await client.post('/threads/', body)
  return res.data.id
}
