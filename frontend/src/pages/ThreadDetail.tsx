import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getThreadDetail, postComment } from '../api/threads'
import type { ThreadDetail as ThreadDetailData, Comment } from '../api/threads'
import './ThreadDetail.css'

// ── Helpers ──────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

// ── Tooltip ───────────────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="tooltip-host"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      {children}
      {visible && <span className="tooltip-popup">{label}</span>}
    </span>
  )
}

// ── Name display ──────────────────────────────────────────

function NameDisplay({ name, email }: { name: string; email: string }) {
  if (!email) {
    return <span className="comment-name">{name}</span>
  }
  const tooltipText = email.toLowerCase() === 'sage' ? 'sage' : email
  return (
    <Tooltip label={tooltipText}>
      <span className="comment-name comment-name-link">{name}</span>
    </Tooltip>
  )
}

// ── Content renderer (anchors) ────────────────────────────

function renderContent(content: string, existingNumbers: Set<number>) {
  const parts = content.split(/(>>\d+)/g)
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^>>(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (existingNumbers.has(num)) {
            return (
              <a
                key={i}
                className="anchor-link anchor-exists"
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(`comment-${num}`)
                  if (!el) return
                  const header = document.querySelector('.fixed-header') as HTMLElement
                  const headerHeight = header?.offsetHeight ?? 60
                  const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 20
                  window.scrollTo({ top, behavior: 'smooth' })
                }}
              >
                {part}
              </a>
            )
          }
          return (
            <span key={i} className="anchor-link anchor-nonexist">
              {part}
            </span>
          )
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

// ── Main component ────────────────────────────────────────

export default function ThreadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const isComposing = useRef(false)

  const [thread, setThread] = useState<ThreadDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pageError, setPageError] = useState('')

  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadThread()
  }, [id])

  const loadThread = async () => {
    setLoading(true)
    try {
      const data = await getThreadDetail(Number(id))
      setThread(data)
      setPageError('')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setNotFound(true)
        setTimeout(() => navigate('/'), 2000)
      } else {
        setPageError('エラーが発生しました。しばらく時間をおいて再度お試しください')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    // Frontend validation
    if (!formContent.trim()) {
      setFormError('本文を入力してください')
      return
    }
    if (formContent.length > 1000) {
      setFormError('本文は1000文字以内で入力してください')
      return
    }
    if (formName.length > 50) {
      setFormError('名前は50文字以内で入力してください')
      return
    }
    if (formEmail.length > 254) {
      setFormError('メールアドレスは254文字以内で入力してください')
      return
    }

    setFormError('')
    setSubmitting(true)

    try {
      await postComment(Number(id), {
        name: formName,
        email: formEmail,
        content: formContent,
      })
      const data = await getThreadDetail(Number(id))
      setThread(data)
      setFormName('')
      setFormEmail('')
      setFormContent('')
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail
      if (detail === 'rate_limit') {
        setFormError('20秒待ってから投稿してください')
      } else if (detail === 'comment_limit') {
        setFormError(
          'このスレッドへの投稿上限（1000件）に達しました。投稿できませんでした'
        )
      } else {
        setFormError('コメントの投稿に失敗しました。再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render states ─────────────────────────────────────

  const renderHeader = () => (
    <header className="fixed-header">
      <button className="site-title-btn" onClick={() => navigate('/')}>
        匿名掲示板
      </button>
    </header>
  )

  if (loading) {
    return (
      <div className="thread-detail-page">
        {renderHeader()}
        <main className="main-content">
          <p className="state-message">読み込み中...</p>
        </main>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="thread-detail-page">
        {renderHeader()}
        <main className="main-content">
          <p className="state-message">スレッドが見つかりません</p>
          <p className="state-sub">スレッド一覧に戻ります...</p>
        </main>
      </div>
    )
  }

  if (pageError) {
    return (
      <div className="thread-detail-page">
        {renderHeader()}
        <main className="main-content">
          <p className="state-message error">{pageError}</p>
        </main>
      </div>
    )
  }

  if (!thread) return null

  const existingNumbers = new Set(thread.comments.map((c) => c.number))

  // ── Main render ───────────────────────────────────────

  return (
    <div className="thread-detail-page">
      {renderHeader()}

      <main className="main-content">
        {/* Thread info */}
        <div className="thread-info">
          <h2 className="thread-detail-title">{thread.title}</h2>
          <span className="thread-created-at">{formatDateTime(thread.created_at)}</span>
        </div>

        {/* Comment list */}
        <div className="comment-list">
          {thread.comments.map((comment: Comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.number}`}
              className="comment-item"
            >
              <div className="comment-header">
                <span className="comment-number">{comment.number}</span>
                <NameDisplay name={comment.name} email={comment.email} />
                {comment.trip && (
                  <span className="comment-trip">{comment.trip}</span>
                )}
                <span className="comment-id">ID: {comment.user_id}</span>
                <span className="comment-datetime">
                  {formatDateTime(comment.created_at)}
                </span>
              </div>
              <div className="comment-body">
                {comment.is_abone ? (
                  <span className="abone-text">あぼーん</span>
                ) : (
                  <span className="comment-body-text">
                    {renderContent(comment.content, existingNumbers)}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>

        {/* Post form */}
        <div className="post-form">
          <h3 className="post-form-title">コメントを投稿する</h3>

          <div className="form-fields">
            <input
              ref={nameRef}
              className="form-input"
              type="text"
              placeholder="名前"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
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
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
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
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              maxLength={1000}
            />
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            書き込む
          </button>
        </div>
      </main>
    </div>
  )
}
