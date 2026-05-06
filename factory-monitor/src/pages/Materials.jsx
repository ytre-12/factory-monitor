import React, { useState, useEffect } from 'react'
import axios from 'axios'

function Materials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await axios.get('/materials/index.php')
      if (response.data.success) {
        setMaterials(response.data.materials)
      }
    } catch (error) {
      console.error('Failed to fetch materials', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>
  }

  return (
    <div className="materials-page">
      <div className="page-header">
        <h1 className="page-title">Материалы</h1>
        <button className="btn-primary" onClick={() => alert('Добавление материала')}>
          + Добавить материал
        </button>
      </div>

      <div className="materials-table-container">
        <table className="materials-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Ед. изм.</th>
              <th>Мин. запас</th>
              <th>Описание</th>
            </tr>
          </thead>
          <tbody>
            {materials.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-row">Нет материалов</td>
              </tr>
            ) : (
              materials.map(m => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.unit}</td>
                  <td>{m.min_stock} {m.unit}</td>
                  <td>{m.description || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Materials