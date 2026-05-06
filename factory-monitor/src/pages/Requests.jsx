import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Requests.css'

function Requests() {
  const [requests, setRequests] = useState([])
  const [types, setTypes] = useState([])
  const [repairmen, setRepairmen] = useState([])
  const [storekeepers, setStorekeepers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filters, setFilters] = useState({ type: '', status: '', search: '' })

  useEffect(() => {
    fetchRequests()
    fetchTypes()
    fetchRepairmen()
    fetchStorekeepers()
  }, [filters.type, filters.status, filters.search, sortField, sortOrder])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.type) params.append('type', filters.type)
      if (filters.search) params.append('search', filters.search)
      if (filters.status) {
        if (filters.status === 'active') {
          params.append('status', '1,2,5')
        } else if (filters.status === 'completed') {
          params.append('status', '3')
        } else {
          params.append('status', filters.status)
        }
      }
      params.append('sort', sortField)
      params.append('order', sortOrder)

      const response = await axios.get(`/requests/index.php?${params.toString()}`)
      setRequests(response.data.success ? (response.data.requests || []) : [])
    } catch (error) {
      console.error('Failed to fetch requests', error)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTypes = async () => {
    try {
      const response = await axios.get('/requests/index.php/types')
      if (response.data.success) {
        setTypes(response.data.types || [])
      } else {
        setTypes(['start', 'stop', 'breakdown', 'material', 'update', 'repair_approval'])
      }
    } catch (_error) {
      setTypes(['start', 'stop', 'breakdown', 'material', 'update', 'repair_approval'])
    }
  }

  const fetchRepairmen = async () => {
    try {
      const response = await axios.get('/users/index.php?role=repairman')
      if (response.data.success) setRepairmen(response.data.users || [])
    } catch (error) {
      console.error('Failed to fetch repairmen', error)
    }
  }

  const fetchStorekeepers = async () => {
    try {
      const response = await axios.get('/users/index.php?role=storekeeper')
      if (response.data.success) setStorekeepers(response.data.users || [])
    } catch (error) {
      console.error('Failed to fetch storekeepers', error)
    }
  }

  const handleAssign = async (requestId, assignedTo) => {
    try {
      await axios.put(`/requests/index.php/${requestId}`, { assigned_to: assignedTo, status_id: 2 })
      alert('Исполнитель назначен')
      setShowAssignModal(false)
      setSelectedRequest(null)
      fetchRequests()
    } catch (error) {
      console.error('Failed to assign', error)
      alert('Ошибка при назначении')
    }
  }

  const handleApproveRepair = async (requestId, repairmanId) => {
    try {
      await axios.put(`/requests/index.php/${requestId}`, { assigned_to: repairmanId, status_id: 2 })
      alert('Ремонт одобрен')
      setShowAssignModal(false)
      setSelectedRequest(null)
      fetchRequests()
    } catch (error) {
      console.error('Failed to approve repair', error)
      alert('Ошибка при одобрении')
    }
  }

  const handleCloseRequest = async (id) => {
    if (!confirm('Закрыть заявку?')) return
    try {
      await axios.put(`/requests/index.php/${id}`, {
        status_id: 3,
        completed_at: new Date().toISOString()
      })
      fetchRequests()
    } catch (error) {
      console.error('Failed to close request', error)
      alert('Ошибка при закрытии')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить заявку?')) return
    try {
      await axios.delete(`/requests/index.php/${id}`)
      alert('Заявка удалена')
      fetchRequests()
    } catch (error) {
      console.error('Failed to delete request', error)
      alert('Ошибка при удалении')
    }
  }

  const openAssignModal = (request) => {
    setSelectedRequest(request)
    setShowAssignModal(true)
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const resetFilters = () => {
    setFilters({ type: '', status: '', search: '' })
    setSortField('created_at')
    setSortOrder('desc')
  }

  const getTypeLabel = (type) => {
    const labels = {
      start: 'Запуск',
      stop: 'Остановка',
      breakdown: 'Поломка',
      material: 'Материалы',
      update: 'Обновление',
      repair_approval: 'Запрос на ремонт'
    }
    return labels[type] || type
  }

  const getTypeClass = (type) => {
    const classes = {
      start: 'type-start',
      stop: 'type-stop',
      breakdown: 'type-breakdown',
      material: 'type-material',
      update: 'type-update',
      repair_approval: 'type-repair'
    }
    return classes[type] || ''
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isActive = (statusId) => statusId === 1 || statusId === 2 || statusId === 5

  const getStatusText = (statusId, type) => {
    if (type === 'repair_approval' && statusId === 1) return 'Ожидает одобрения'
    if (statusId === 1) return 'Активна'
    if (statusId === 2) return 'В работе'
    if (statusId === 3) return 'Завершена'
    if (statusId === 4) return 'Отменена'
    return 'Активна'
  }

  const getStatusClass = (statusId, type) => {
    if (type === 'repair_approval' && statusId === 1) return 'status-pending'
    if (statusId === 1 || statusId === 2 || statusId === 5) return 'status-active'
    if (statusId === 3) return 'status-completed'
    if (statusId === 4) return 'status-cancelled'
    return 'status-active'
  }

  const getActionButton = (request) => {
    if (request.status_id === 3 || request.status_id === 4) return null

    if ((request.type === 'breakdown' || request.type === 'material') && !request.assigned_to) {
      return <button className="btn-action assign" onClick={() => openAssignModal(request)}>Назначить</button>
    }

    if (request.type === 'repair_approval' && request.status_id === 1) {
      return <button className="btn-action approve" onClick={() => openAssignModal(request)}>Одобрить</button>
    }

    if (isActive(request.status_id) && request.assigned_to) {
      return <button className="btn-action complete" onClick={() => handleCloseRequest(request.id)}>Закрыть</button>
    }

    return null
  }

  const getAssignModalContent = () => {
    if (!selectedRequest) return null

    if (selectedRequest.type === 'breakdown') {
      return (
        <>
          <h4>Назначение ремонтника</h4>
          <p>Станок: <strong>{selectedRequest.equipment_name || 'Не указан'}</strong></p>
          <p>Описание: {selectedRequest.description}</p>
          <div className="form-group">
            <label>Выберите ремонтника</label>
            <select id="assignSelect" className="assign-select">
              <option value="">— Выберите —</option>
              {repairmen.map((r) => <option key={r.id} value={r.id}>{r.last_name} {r.first_name}</option>)}
            </select>
          </div>
          <div className="modal-buttons">
            <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Отмена</button>
            <button className="btn-primary" onClick={() => {
              const select = document.getElementById('assignSelect')
              if (select && select.value) handleAssign(selectedRequest.id, select.value)
              else alert('Выберите ремонтника')
            }}>Назначить</button>
          </div>
        </>
      )
    }

    if (selectedRequest.type === 'material') {
      return (
        <>
          <h4>Назначение кладовщика</h4>
          <p>Станок: <strong>{selectedRequest.equipment_name || 'Не указан'}</strong></p>
          <p>Описание: {selectedRequest.description}</p>
          <div className="form-group">
            <label>Выберите кладовщика</label>
            <select id="assignSelect" className="assign-select">
              <option value="">— Выберите —</option>
              {storekeepers.map((s) => <option key={s.id} value={s.id}>{s.last_name} {s.first_name}</option>)}
            </select>
          </div>
          <div className="modal-buttons">
            <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Отмена</button>
            <button className="btn-primary" onClick={() => {
              const select = document.getElementById('assignSelect')
              if (select && select.value) handleAssign(selectedRequest.id, select.value)
              else alert('Выберите кладовщика')
            }}>Назначить</button>
          </div>
        </>
      )
    }

    if (selectedRequest.type === 'repair_approval') {
      return (
        <>
          <h4>Одобрение ремонта</h4>
          <p>Ремонтник <strong>{selectedRequest.employee_name}</strong> запросил разрешение на ремонт.</p>
          <p>Станок: <strong>{selectedRequest.equipment_name || 'Не указан'}</strong></p>
          <p>Причина: {selectedRequest.description}</p>
          <div className="modal-buttons">
            <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Отклонить</button>
            <button className="btn-primary" onClick={() => handleApproveRepair(selectedRequest.id, selectedRequest.employee_id)}>Одобрить</button>
          </div>
        </>
      )
    }

    return null
  }

  if (loading) return <div className="loading">Загрузка...</div>

  return (
    <div className="requests-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Заявки</h1>
          <p className="page-subtitle">Здесь можно назначать исполнителей и отслеживать статусы.</p>
        </div>
        <button className="btn-refresh" onClick={fetchRequests}>Обновить</button>
      </div>

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Поиск по описанию или станку..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="search-input"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          className="filter-select"
        >
          <option value="">Все типы</option>
          {types.map((type) => <option key={type} value={type}>{getTypeLabel(type)}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="">Все статусы</option>
          <option value="active">Активная</option>
          <option value="completed">Завершена</option>
        </select>
        <button className="btn-reset" onClick={resetFilters}>Сбросить</button>
      </div>

      <div className="requests-table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>Тип {sortField === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th>Описание</th>
              <th onClick={() => handleSort('employee_name')} style={{ cursor: 'pointer' }}>От кого {sortField === 'employee_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('assigned_name')} style={{ cursor: 'pointer' }}>Назначен {sortField === 'assigned_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('equipment_name')} style={{ cursor: 'pointer' }}>Станок {sortField === 'equipment_name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>Дата {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan="8" className="empty-row">Нет заявок</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id}>
                  <td><span className={`type-badge ${getTypeClass(req.type)}`}>{getTypeLabel(req.type)}</span></td>
                  <td className="desc-cell" title={req.description}>{req.description}</td>
                  <td>{req.employee_name || '—'}</td>
                  <td>{req.assigned_name || '—'}</td>
                  <td>{req.equipment_name || '—'}</td>
                  <td>{formatDate(req.created_at)}</td>
                  <td><span className={`status-badge ${getStatusClass(req.status_id, req.type)}`}>{getStatusText(req.status_id, req.type)}</span></td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => { setSelectedRequest(req); setShowDetailsModal(true) }} title="Просмотр">Открыть</button>
                    {getActionButton(req)}
                    <button className="btn-icon delete" onClick={() => handleDelete(req.id)} title="Удалить">Удалить</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAssignModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Действие с заявкой #{selectedRequest.id}</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            {getAssignModalContent()}
          </div>
        </div>
      )}

      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Детали заявки #{selectedRequest.id}</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>
            <div className="details-content">
              <div className="detail-row"><span className="detail-label">Тип:</span><span className={`type-badge ${getTypeClass(selectedRequest.type)}`}>{getTypeLabel(selectedRequest.type)}</span></div>
              <div className="detail-row"><span className="detail-label">Описание:</span><span>{selectedRequest.description}</span></div>
              <div className="detail-row"><span className="detail-label">От кого:</span><span>{selectedRequest.employee_name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Назначен:</span><span>{selectedRequest.assigned_name || 'Не назначен'}</span></div>
              <div className="detail-row"><span className="detail-label">Станок:</span><span>{selectedRequest.equipment_name || '—'}</span></div>
              <div className="detail-row"><span className="detail-label">Дата создания:</span><span>{formatDate(selectedRequest.created_at)}</span></div>
              <div className="detail-row"><span className="detail-label">Статус:</span><span className={`status-badge ${getStatusClass(selectedRequest.status_id, selectedRequest.type)}`}>{getStatusText(selectedRequest.status_id, selectedRequest.type)}</span></div>
              {selectedRequest.completed_at && (
                <div className="detail-row"><span className="detail-label">Дата выполнения:</span><span>{formatDate(selectedRequest.completed_at)}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Requests
