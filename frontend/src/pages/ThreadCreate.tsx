import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createThread } from '../api/threads'
import './ThreadCreate.css'

export default function ThreadCreate() {
  const navigate = useNavigate()
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const isComposing = useRef(false)

  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validate = (): string => {
    if (!title.trim()) return 'タイトルを入力してください'
    if (title.length > 256) return 'タイトルは256文字以内で入力してください'
    if (!content.trim()) return '本文を入力してください'
    if (content.length > 1000) return '本文は1000文字以内で入力してください'
    if (name.length > 50) return '名前は50文字以内で入力してください'
    if (email.length > 254) return 'メールアドレスは254文字以内で入力してください'
    return ''
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const threadId = await createThread({ title, name, email, content })
      navigate(`/threads/${threadId}`)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      if (detail === 'thread_rate_limit') {
        setError('しばらく時間を空けてからスレッドを作成してください')
      } else {
        setError('スレッド作成に失敗しました。再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="thread-create-page">
      <header className="fixed-header">
        <button className="site-title-btn" onClick={() => navigate('/')}>
          匿名掲示板
        </button>
      </header>

      <main className="main-content">
        <div className="create-form">
          <h2 className="form-title">スレッド新規作成</h2>

          <div className="form-fields">
            <input
              className="form-input"
              type="text"
              placeholder="タイトルを入力してください"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing.current) {
                  e.preventDefault()
                  nameRef.current?.focus()
                }
              }}
              maxLength={256}
            />
            <input
              ref={nameRef}
              className="form-input"
              type="text"
              placeholder="名前（省略時は名無しさん）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing.current) {
                  e.preventDefault()
                  emailRef.current?.focus()
                }
              }}
              maxLength={50}
            />
            <input
              ref={emailRef}
              className="form-input"
              type="text"
              placeholder="メールアドレス（省略可）"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing.current) {
                  e.preventDefault()
                  contentRef.current?.focus()
                }
              }}
              maxLength={254}
            />
            <textarea
              ref={contentRef}
              className="form-input form-textarea"
              placeholder="本文を入力してください"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="btn-group">
            <button
              className="btn-create"
              onClick={handleSubmit}
              disabled={submitting}
            >
              新規作成
            </button>
            <button className="btn-cancel" onClick={() => navigate('/')}>
              キャンセル
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
