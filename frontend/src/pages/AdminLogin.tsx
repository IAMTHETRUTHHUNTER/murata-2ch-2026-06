import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../api/auth'
import './AdminLogin.css'

export default function AdminLogin() {
  const navigate = useNavigate()
  const passwordRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async () => {
    if (!loginId) {
      setError('IDを入力してください')
      return
    }
    if (!password) {
      setError('パスワードを入力してください')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      await adminLogin(loginId, password)
      navigate('/admin/aboon')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        setError('IDまたはパスワードが正しくありません')
      } else {
        setError('エラーが発生しました。しばらく時間をおいて再度お試しください')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login-page">
      <header className="fixed-header">
        <button className="site-title-btn" onClick={() => navigate('/')}>
          匿名掲示板
        </button>
      </header>

      <main className="main-content">
        <div className="login-form">
          <h2 className="form-title">管理者ログイン</h2>

          <div className="form-fields">
            <input
              className="form-input"
              type="text"
              placeholder="管理者ID"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing.current) {
                  e.preventDefault()
                  passwordRef.current?.focus()
                }
              }}
              autoComplete="username"
            />
            <input
              ref={passwordRef}
              className="form-input"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onCompositionStart={() => { isComposing.current = true }}
              onCompositionEnd={() => { setTimeout(() => { isComposing.current = false }, 0) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing.current) handleLogin()
              }}
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="btn-group">
            <button
              className="btn-login"
              onClick={handleLogin}
              disabled={submitting}
            >
              ログイン
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
