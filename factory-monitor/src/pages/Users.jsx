import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Users.css'

function Users() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([
    { id: 2, name: 'operator' },
    { id: 3, name: 'repairman' },
    { id: 4, name: 'storekeeper' }
  ])  // Запасные роли сразу
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    last_name: '',
    first_name: '',
    patronymic: '',
    phone: '',
    role_id: '',
    password: 'Admin123!'
  })
  const [filters, setFilters] = useState({ role: '', search: '' })

  useEffect(() => {
    fetchUsers()
    fetchRoles()  // Пытаемся получить роли с сервера, если получится
  }, [filters])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.role) params.append('role', filters.role)
      if (filters.search) params.append('search', filters.search)
      
      const response = await axios.get(`/users/index.php?${params}`)
      if (response.data.success) {
        setUsers(response.data.users || [])
      } else {
        setUsers([])
      }
    } catch (error) {
      console.error('Failed to fetch users', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await axios.get('/users/index.php/roles')
      if (response.data.success && response.data.roles && response.data.roles.length > 0) {
        setRoles(response.data.roles)
      }
      // Если API не вернул роли, оставляем запасные
    } catch (error) {
      console.error('Failed to fetch roles, using fallback', error)
      // Оставляем запасные роли
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Проверка: выбрана ли роль
    if (!formData.role_id) {
      alert('Пожалуйста, выберите роль')
      return
    }
    
    try {
      if (editingUser) {
        await axios.put(`/users/index.php/${editingUser.id}`, formData)
        alert('Пользователь обновлён')
      } else {
        await axios.post('/users/index.php', formData)
        alert('Пользователь создан')
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({
        email: '',
        last_name: '',
        first_name: '',
        patronymic: '',
        phone: '',
        role_id: '',
        password: 'Admin123!'
      })
      fetchUsers()
    } catch (error) {
      console.error('Failed to save user', error)
      alert(error.response?.data?.message || 'Ошибка при сохранении')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Удалить пользователя?')) {
      try {
        await axios.delete(`/users/index.php/${id}`)
        alert('Пользователь удалён')
        fetchUsers()
      } catch (error) {
        console.error('Failed to delete user', error)
        alert('Ошибка при удалении')
      }
    }
  }

  const handleResetPassword = async (id) => {
    if (confirm('Сбросить пароль на Admin123!?')) {
      try {
        await axios.post(`/users/index.php/${id}/reset-password`)
        alert('Пароль сброшен на Admin123!')
      } catch (error) {
        console.error('Failed to reset password', error)
        alert('Ошибка при сбросе пароля')
      }
    }
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      last_name: user.last_name,
      first_name: user.first_name,
      patronymic: user.patronymic || '',
      phone: user.phone || '',
      role_id: user.role_id,
      password: ''
    })
    setShowModal(true)
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({
      email: '',
      last_name: '',
      first_name: '',
      patronymic: '',
      phone: '',
      role_id: '',
      password: 'Admin123!'
    })
    setShowModal(true)
  }

  const getRoleLabel = (roleName) => {
    const labels = {
      operator: 'Оператор',
      repairman: 'Ремонтник',
      storekeeper: 'Кладовщик'
    }
    return labels[roleName] || roleName
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Пользователи</h1>
          <p className="page-subtitle">Управление операторами, ремонтниками и кладовщиками</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          + Добавить пользователя
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Поиск по имени или email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          className="filter-select"
        >
          <option value="">Все роли</option>
          <option value="operator">Операторы</option>
          <option value="repairman">Ремонтники</option>
          <option value="storekeeper">Кладовщики</option>
        </select>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ФИО</th>
              <th>Email</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan="5" className="empty-row">Нет пользователей</td></tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.last_name} {user.first_name} {user.patronymic || ''}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>
                    <span className={`role-badge role-${user.role_name}`}>
                      {getRoleLabel(user.role_name)}
                    </span>
                   </td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => openEditModal(user)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleResetPassword(user.id)}>🔑</button>
                    <button className="btn-icon delete" onClick={() => handleDelete(user.id)}>🗑️</button>
                   </td>
                 </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email *</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  required 
                  disabled={!!editingUser}
                />
                {editingUser && <small style={{ color: '#888' }}>Email нельзя изменить</small>}
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Фамилия *</label>
                  <input 
                    type="text" 
                    value={formData.last_name} 
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Имя *</label>
                  <input 
                    type="text" 
                    value={formData.first_name} 
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} 
                    required 
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Отчество</label>
                <input 
                  type="text" 
                  value={formData.patronymic} 
                  onChange={(e) => setFormData({ ...formData, patronymic: e.target.value })} 
                />
              </div>
              
              <div className="form-group">
                <label>Телефон</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                />
              </div>
              
              <div className="form-group">
                <label>Роль *</label>
                <select 
                  value={formData.role_id} 
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })} 
                  required
                >
                  <option value="">Выберите роль</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>
                      {getRoleLabel(role.name)}
                    </option>
                  ))}
                </select>
              </div>
              
              {!editingUser && (
                <div className="form-group">
                  <label>Пароль (по умолчанию Admin123!)</label>
                  <input 
                    type="text" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  />
                  <small style={{ color: '#888' }}>Пользователь сможет войти в мобильное/десктоп приложение с этим паролем</small>
                </div>
              )}
              
              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users