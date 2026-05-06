import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Пока проверяем авторизацию
  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  // Если не авторизован — отправляем на логин
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Если авторизован — показываем страницу
  return children
}

export default ProtectedRoute