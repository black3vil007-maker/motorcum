import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const { error } = await resetPassword(email)
    if (error) {
      setError('Bir hata oluştu: ' + error.message)
    } else {
      setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
    }
    setLoading(false)
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.png" alt="Motorcum Logo" />
          <h1>MOTORCUM</h1>
          <p>Şifre Sıfırla</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <p className="auth-hint">
            Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
          </p>

          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">← Giriş sayfasına dön</Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
