import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getThreads } from '../api/threads'
import type { Thread, SortOrder } from '../api/threads'
import './ThreadList.css'

const SORT_LABELS: Record<SortOrder, string> = {
  newest: '新着順',
  oldest: '古い順',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ThreadList() {
  const navigate = useNavigate()
  const [threads, setThreads] = useState<Thread[]>([])
  const [sort, setSort] = useState<SortOrder>('newest')
  const [sortOpen, setSortOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setError('')
    setLoading(true)
    getThreads(sort)
      .then(setThreads)
      .catch(() =>
        setError('エラーが発生しました。しばらく時間をおいて再度お試しください')
      )
      .finally(() => setLoading(false))
  }, [sort])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="thread-list-page">
      <header className="fixed-header">
        <h1 className="site-title">匿名掲示板</h1>
        <div className="header-controls">
          <button className="btn btn-primary" onClick={() => navigate('/threads/new')}>
            新規作成
          </button>

          <div className="sort-dropdown" ref={dropdownRef}>
            <button className="btn" onClick={() => setSortOpen((v) => !v)}>
              {SORT_LABELS[sort]}
              <span className="dropdown-arrow">▾</span>
            </button>
            {sortOpen && (
              <ul className="sort-menu">
                {(Object.keys(SORT_LABELS) as SortOrder[]).map((s) => (
                  <li
                    key={s}
                    className={`sort-menu-item ${s === sort ? 'active' : ''}`}
                    onClick={() => {
                      setSort(s)
                      setSortOpen(false)
                    }}
                  >
                    {SORT_LABELS[s]}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button className="btn btn-secondary" onClick={() => navigate('/admin/login')}>
            管理用
          </button>
        </div>
      </header>

      <main className="main-content">
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && threads.length === 0 && (
          <p className="empty-message">スレッドがありません</p>
        )}

        {threads.length > 0 && (
          <ul className="thread-list">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="thread-card"
                onClick={() => navigate(`/threads/${thread.id}`)}
              >
                <div className="thread-card-title">{thread.title}</div>
                <div className="thread-card-footer">
                  <span className="thread-meta">{formatDate(thread.updated_at)}</span>
                  <span className="thread-meta">コメント数：{thread.comment_count}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
