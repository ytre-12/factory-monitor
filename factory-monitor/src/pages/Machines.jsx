import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Machines.css'

function Machines() {
  const [machines, setMachines] = useState([])
  const [operators, setOperators] = useState([])
  const [statuses, setStatuses] = useState(['working', 'idle', 'broken', 'maintenance'])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [logs, setLogs] = useState([])
  const [editingMachine, setEditingMachine] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    status: 'idle',
    last_maintenance: '',
    assigned_to: ''
  })
  const [filters, setFilters] = useState({ status: '', search: '' })

  // Загружаем станки при изменении фильтров
  useEffect(() => {
    fetchMachines()
  }, [filters.status, filters.search])

  // Загружаем операторов и статусы один раз
  useEffect(() => {
    fetchOperators()
    fetchStatuses()
  }, [])

  const fetchMachines = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== '') {
        params.append('status', filters.status)
      }
      if (filters.search) {
        params.append('search', filters.search)
      }
      
      const url = `/machines/index.php${params.toString() ? '?' + params.toString() : ''}`
      const response = await axios.get(url)
      
      if (response.data.success) {
        setMachines(response.data.machines || [])
      } else {
        setMachines([])
      }
    } catch (error) {
      console.error('Failed to fetch machines', error)
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const fetchOperators = async () => {
    try {
      console.log('Загрузка операторов...')
      // Пробуем получить операторов из API
      const response = await axios.get('/machines/index.php/operators')
      console.log('Ответ API операторов:', response.data)
      
      if (response.data.success && response.data.operators && response.data.operators.length > 0) {
        setOperators(response.data.operators)
      } else {
        // Если API не вернул операторов, пробуем получить всех операторов из users API
        console.log('API операторов не вернул данные, пробуем альтернативный источник...')
        const usersResponse = await axios.get('/users/index.php?role=operator')
        if (usersResponse.data.success && usersResponse.data.users) {
          const ops = usersResponse.data.users.map(user => ({
            id: user.id,
            name: `${user.last_name} ${user.first_name}`
          }))
          setOperators(ops)
        } else {
          // Запасные операторы
          setOperators([
            { id: 2, name: 'Иванов Иван' },
            { id: 6, name: 'Козлов Дмитрий' }
          ])
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке операторов:', error)
      // Запасные операторы при ошибке
      setOperators([
        { id: 2, name: 'Иванов Иван' },
        { id: 6, name: 'Козлов Дмитрий' }
      ])
    }
  }

  const fetchStatuses = async () => {
    try {
      const response = await axios.get('/machines/index.php/statuses')
      if (response.data.success && response.data.statuses) {
        setStatuses(response.data.statuses)
      }
    } catch (error) {
      console.error('Failed to fetch statuses, using defaults', error)
    }
  }

  const fetchLogs = async (machineId) => {
    try {
      const response = await axios.get(`/machines/index.php/${machineId}/logs`)
      if (response.data.success) {
        setLogs(response.data.logs || [])
      } else {
        setLogs([])
      }
    } catch (error) {
      console.error('Failed to fetch logs', error)
      setLogs([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingMachine) {
        await axios.put(`/machines/index.php/${editingMachine.id}`, formData)
        alert('Станок обновлён')
      } else {
        await axios.post('/machines/index.php', formData)
        alert('Станок создан')
      }
      setShowModal(false)
      setEditingMachine(null)
      setFormData({ name: '', type: '', status: 'idle', last_maintenance: '', assigned_to: '' })
      fetchMachines()
    } catch (error) {
      console.error('Failed to save machine', error)
      alert(error.response?.data?.message || 'Ошибка при сохранении')
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Удалить станок?')) {
      try {
        await axios.delete(`/machines/index.php/${id}`)
        alert('Станок удалён')
        fetchMachines()
      } catch (error) {
        console.error('Failed to delete machine', error)
        alert('Ошибка при удалении')
      }
    }
  }

  const handleViewLogs = async (machine) => {
    setSelectedMachine(machine)
    await fetchLogs(machine.id)
    setShowLogsModal(true)
  }

  const openEditModal = (machine) => {
    setEditingMachine(machine)
    setFormData({
      name: machine.name,
      type: machine.type || '',
      status: machine.status,
      last_maintenance: machine.last_maintenance || '',
      assigned_to: machine.assigned_to || ''
    })
    setShowModal(true)
  }

  const openAddModal = () => {
    setEditingMachine(null)
    setFormData({
      name: '',
      type: '',
      status: 'idle',
      last_maintenance: '',
      assigned_to: ''
    })
    setShowModal(true)
  }

  const getStatusLabel = (status) => {
    const labels = {
      working: 'Работает',
      idle: 'Простаивает',
      broken: 'Сломан',
      maintenance: 'На обслуживании'
    }
    return labels[status] || status
  }

  const getStatusClass = (status) => {
    const classes = {
      working: 'status-working',
      idle: 'status-idle',
      broken: 'status-broken',
      maintenance: 'status-maintenance'
    }
    return classes[status] || ''
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="machines-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Станки</h1>
          <p className="page-subtitle">Управление производственным оборудованием</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          + Добавить станок
        </button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Поиск по названию или типу..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">Все статусы</option>
          <option value="working">Работает</option>
          <option value="idle">Простаивает</option>
          <option value="broken">Сломан</option>
          <option value="maintenance">На обслуживании</option>
        </select>
      </div>

      <div className="machines-grid">
        {machines.length === 0 ? (
          <div className="empty-state">Нет станков</div>
        ) : (
          machines.map(machine => (
            <div key={machine.id} className="machine-card">
              <div className="machine-header">
                <div className="machine-icon">🛠️</div>
                <div className="machine-info">
                  <h3>{machine.name}</h3>
                  <p className="machine-type">{machine.type || 'Тип не указан'}</p>
                </div>
                <span className={`machine-status ${getStatusClass(machine.status)}`}>
                  {getStatusLabel(machine.status)}
                </span>
              </div>
              <div className="machine-details">
                <div className="detail-item">
                  <span className="detail-label">Закреплён за:</span>
                  <span>{machine.assigned_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Последнее ТО:</span>
                  <span>{machine.last_maintenance || '—'}</span>
                </div>
              </div>
              <div className="machine-actions">
                <button className="btn-action" onClick={() => handleViewLogs(machine)}>📋 Логи</button>
                <button className="btn-action" onClick={() => openEditModal(machine)}>✏️</button>
                <button className="btn-action delete" onClick={() => handleDelete(machine.id)}>🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно для редактирования/добавления */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMachine ? 'Редактировать станок' : 'Новый станок'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название *</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Тип</label>
                <input 
                  type="text" 
                  value={formData.type} 
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label>Статус</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  {statuses.map(status => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Закрепить за оператором</label>
                <select 
                  value={formData.assigned_to || ''} 
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Не назначен</option>
                  {operators && operators.length > 0 ? (
                    operators.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>Нет операторов</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Дата последнего ТО</label>
                <input 
                  type="date" 
                  value={formData.last_maintenance} 
                  onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })} 
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-primary">
                  {editingMachine ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно для логов */}
      {showLogsModal && selectedMachine && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Логи станка: {selectedMachine.name}</h3>
              <button className="modal-close" onClick={() => setShowLogsModal(false)}>×</button>
            </div>
            <div className="logs-list">
              {logs.length === 0 ? (
                <div className="empty-logs">Нет записей</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="log-item">
                    <div className="log-action">{log.action}</div>
                    <div className="log-user">{log.employee_name}</div>
                    <div className="log-date">{log.created_at}</div>
                    {log.notes && <div className="log-notes">{log.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Machines