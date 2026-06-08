import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ThreadList from './pages/ThreadList'
import ThreadDetail from './pages/ThreadDetail'
import ThreadCreate from './pages/ThreadCreate'
import AdminLogin from './pages/AdminLogin'
import AboonSettings from './pages/AboonSettings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ThreadList />} />
        <Route path="/threads/new" element={<ThreadCreate />} />
        <Route path="/threads/:id" element={<ThreadDetail />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/aboon" element={<AboonSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
