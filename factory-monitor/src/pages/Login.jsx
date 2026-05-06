import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message || 'Ошибка входа. Проверьте email и пароль.')
    }
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-background" />
      <div className="login-overlay" />

      <div className="login-form-wrapper fade-in">
        <div className="login-form">
          <img
            src="/ico.png"
            alt="Logo"
            className="login-logo"
            onError={(e) => { e.target.style.display = 'none' }}
          />

          <h2 className="login-title">Вход в панель администратора</h2>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@factory.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label>Пароль</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Скрыть' : 'Показать'}
                </button>
              </div>
            </div>


            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="login-hint">
            <p>Тестовый доступ</p>
            <p className="hint-credentials">admin@factory.com / Admin123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
