import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import './Profile.css'

function Profile() {
  const { user, changePassword } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают')
      return
    }
    
    if (newPassword.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }
    
    setLoading(true)
    const result = await changePassword(oldPassword, newPassword)
    
    if (result.success) {
      setMessage('Пароль успешно изменён')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setError(result.message || 'Ошибка при смене пароля')
    }
    setLoading(false)
  }

  return (
    <div className="profile-page">
      <h1 className="page-title">Профиль</h1>
      <div className="profile-card">
        <div className="profile-info">
          <div className="info-row"><label>ФИО:</label><span>{user?.name || '—'}</span></div>
          <div className="info-row"><label>Email:</label><span>{user?.email || '—'}</span></div>
          <div className="info-row"><label>Роль:</label><span className="role-admin">Администратор</span></div>
        </div>
        <div className="profile-divider"></div>
        <div className="profile-password">
          <h3>Смена пароля</h3>
          <form onSubmit={handleSubmit}>
            {message && <div className="success-message">{message}</div>}
            {error && <div className="error-message">{error}</div>}
            <div className="form-group"><label>Текущий пароль</label><input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required /></div>
            <div className="form-group"><label>Новый пароль</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
            <div className="form-group"><label>Подтверждение пароля</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
            <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Сохранение...' : 'Сменить пароль'}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile