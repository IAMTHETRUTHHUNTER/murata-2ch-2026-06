import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkAdminAuth, adminLogout } from '../api/auth'
import { getNGWords, addNGWord, deleteNGWord } from '../api/ngwords'
import type { NGWord } from '../api/ngwords'
import './AboonSettings.css'

// ── Trash icon ────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────

export default function AboonSettings() {
  const navigate = useNavigate()

  const isComposing = useRef(false)

  const [authChecked, setAuthChecked] = useState(false)
  const [ngwords, setNgwords] = useState<NGWord[]>([])
  const [listError, setListError] = useState('')
  const [newWord, setNewWord] = useState('')
  const [addError, setAddError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    checkAdminAuth().then((isAuth) => {
      if (!isAuth) {
        navigate('/admin/login')
        return
      }
      setAuthChecked(true)
      loadNGWords()
    })
  }, [])

  const loadNGWords = async () => {
    try {
      const data = await getNGWords()
      setNgwords(data)
    } catch {
      setListError('エラーが発生しました。しばらく時間をおいて再度お試しください')
    }
  }

  const handleAdd = async () => {
    const trimmed = newWord.trim()
    if (!trimmed) {
      setAddError('NGワードを入力してください')
      return
    }
    if (newWord.length > 50) {
      setAddError('NGワードは50文字以内で入力してください')
      return
    }
    if (ngwords.some((w) => w.word === trimmed)) {
      setAddError('このNGワードはすでに登録されています')
      return
    }

    setAddError('')
    setSubmitting(true)

    try {
      const added = await addNGWord(trimmed)
      setNgwords((prev) => [added, ...prev])
      setNewWord('')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) {
        setAddError('このNGワードはすでに登録されています')
      } else {
        setAddError('NGワード編集に失敗しました。再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('このNGワードを削除しますか？')) return
    try {
      await deleteNGWord(id)
      setNgwords((prev) => prev.filter((w) => w.id !== id))
    } catch {
      setListError('NGワード編集に失敗しました。再度お試しください')
    }
  }

  const handleLogout = async () => {
    try {
      await adminLogout()
    } finally {
      navigate('/')
    }
  }

  if (!authChecked) return null

  return (
    <div className="aboon-settings-page">
      <header className="fixed-header">
        <h1 className="aboon-title">あぼーん管理</h1>
        <div className="header-controls">
          <button className="btn-logout" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* NGword list */}
        <section className="ngword-section">
          <h2 className="section-title">NGワード一覧</h2>

          {listError && <p className="error-msg">{listError}</p>}

          {!listError && ngwords.length === 0 && (
            <p className="empty-msg">登録済みのNGワードはありません</p>
          )}

          {ngwords.length > 0 && (
            <ul className="ngword-list">
              {ngwords.map((w) => (
                <li key={w.id} className="ngword-item">
                  <button
                    className="btn-trash"
                    onClick={() => handleDelete(w.id)}
                    title="削除"
                  >
                    <TrashIcon />
                  </button>
                  <span className="ngword-text">{w.word}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Add NGword */}
        <section className="ngword-add-section">
          <h2 className="section-title">NGワードを追加</h2>
          <input
            className="ngword-input"
            type="text"
            placeholder="追加するNGワードを入力"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            maxLength={50}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposing.current) handleAdd()
            }}
          />
          {addError && <p className="error-msg add-error-msg">{addError}</p>}
          <button
            className="btn-add"
            onClick={handleAdd}
            disabled={submitting}
          >
            追加
          </button>
        </section>
      </main>
    </div>
  )
}
