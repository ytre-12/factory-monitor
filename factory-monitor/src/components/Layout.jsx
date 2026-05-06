import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import CalendarModal from './CalendarModal'
import TodoModal from './TodoModal'
import './Layout.css'

function Layout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTodo, setShowTodo] = useState(false)

  const menuItems = [
    { path: '/dashboard', icon: 'DS', label: 'Дашборд' },
    { path: '/users', icon: 'US', label: 'Пользователи' },
    { path: '/machines', icon: 'MC', label: 'Станки' },
    { path: '/requests', icon: 'RQ', label: 'Заявки' },
    { path: '/profile', icon: 'PR', label: 'Профиль' }
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className={`layout ${theme}-theme`}>
      <aside className="sidebar">
        <div className="logo">
          <img src="/ico.png" alt="Logo" onError={(e) => { e.target.style.display = 'none' }} />
          <h2>Factory Monitor</h2>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          <button className="nav-item" onClick={() => setShowCalendar(true)}>
            <span className="nav-icon">CL</span>
            <span>Календарь</span>
          </button>

          <button className="nav-item" onClick={() => setShowTodo(true)}>
            <span className="nav-icon">TD</span>
            <span>To-Do list</span>
          </button>
        </nav>

        <div className="theme-toggle-wrapper">
          <div className="theme-toggle">
            <span className="theme-icon">L</span>
            <label className="switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="slider round"></span>
            </label>
            <span className="theme-icon">D</span>
          </div>
          <div className="theme-label">{theme === 'light' ? 'Светлая тема' : 'Темная тема'}</div>
        </div>

        <div className="user-info">
          <div className="user-name">{user?.name || 'Администратор'}</div>
          <div className="user-role">Администратор</div>
          <button className="logout-btn" onClick={handleLogout}>Выйти</button>
        </div>
      </aside>

      <main className="main-content">
        <div className="content-wrapper fade-in">
          <Outlet />
        </div>
      </main>

      {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} />}
      {showTodo && <TodoModal onClose={() => setShowTodo(false)} />}
    </div>
  )
}

export default Layout
