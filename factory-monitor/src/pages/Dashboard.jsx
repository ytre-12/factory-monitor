import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { useAuth } from '../context/AuthContext'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await axios.get('/dashboard/stats.php')
      if (response.data.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    )
  }

  const chartData = {
    labels: stats?.chart_requests?.map((item) => {
      const date = new Date(item.date)
      return `${date.getDate()}.${date.getMonth() + 1}`
    }) || [],
    datasets: [{
      label: 'Количество заявок',
      data: stats?.chart_requests?.map((item) => item.count) || [],
      backgroundColor: '#27b54d',
      borderRadius: 8,
      barPercentage: 0.7
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.raw} заявок`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  }

  const statusLabels = {
    working: 'Работает',
    idle: 'Простаивает',
    broken: 'Сломан',
    maintenance: 'На обслуживании'
  }

  const machineStatusData = {
    labels: stats?.machine_status?.map((item) => statusLabels[item.status] || item.status) || [],
    datasets: [{
      data: stats?.machine_status?.map((item) => item.count) || [],
      backgroundColor: ['#27b54d', '#f0b232', '#d9534f', '#4285f4'],
      borderWidth: 0
    }]
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'bottom' } }
  }

  const totalRequestsWeek = stats?.chart_requests?.reduce((sum, item) => sum + item.count, 0) || 0

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p className="page-subtitle">
            Здравствуйте, {user?.name || 'Администратор'}! Вот сводка по заводу за сегодня.
          </p>
        </div>
        <button className="refresh-btn" onClick={fetchStats}>Обновить</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-mark">MC</div>
          <div className="stat-value">{stats?.total_machines || 0}</div>
          <div className="stat-label">Всего станков</div>
          <div className="stat-trend">на предприятии</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-mark">BR</div>
          <div className="stat-value">{stats?.broken_machines || 0}</div>
          <div className="stat-label">Сломанных станков</div>
          <div className="stat-trend">требуют ремонта</div>
        </div>

        <div className="stat-card info">
          <div className="stat-mark">RQ</div>
          <div className="stat-value">{stats?.new_requests || 0}</div>
          <div className="stat-label">Новых заявок</div>
          <div className="stat-trend">ожидают обработки</div>
        </div>

        <div className="stat-card success">
          <div className="stat-mark">DN</div>
          <div className="stat-value">{stats?.today_done || 0}</div>
          <div className="stat-label">Выполнено сегодня</div>
          <div className="stat-trend">успешно завершено</div>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Динамика заявок</h3>
            <span className="chart-badge">За 7 дней: {totalRequestsWeek}</span>
          </div>
          <div className="chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Состояние станков</h3>
            <span className="chart-badge">Всего: {stats?.total_machines || 0}</span>
          </div>
          <div className="chart-container doughnut-container">
            <Doughnut data={machineStatusData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="bottom-row">
        <div className="info-card">
          <h3>Топ-3 причины поломок</h3>
          <ul className="top-list">
            {stats?.top_breakdowns?.length > 0 ? (
              stats.top_breakdowns.map((item, idx) => (
                <li key={idx}>
                  <span className="top-number">{idx + 1}</span>
                  <span className="top-text">{item.description}</span>
                  <span className="top-count">{item.count} раз</span>
                </li>
              ))
            ) : (
              <li className="empty-message">Нет данных о поломках за выбранный период</li>
            )}
          </ul>
        </div>

        <div className="info-card">
          <h3>Быстрая статистика</h3>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-label">Процент работающих станков:</span>
              <span className="quick-value">
                {stats?.total_machines
                  ? Math.round(((stats.total_machines - (stats.broken_machines || 0)) / stats.total_machines) * 100)
                  : 0}%
              </span>
            </div>
            <div className="quick-stat">
              <span className="quick-label">Выполнение заявок:</span>
              <span className="quick-value">
                {stats?.new_requests || stats?.chart_requests
                  ? Math.round((stats.today_done || 0) / ((stats.new_requests || 1) + (stats.today_done || 0)) * 100)
                  : 0}%
              </span>
            </div>
            <div className="quick-stat">
              <span className="quick-label">Активных поломок:</span>
              <span className="quick-value">{stats?.broken_machines || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {stats?.heatmap && stats.heatmap.length > 0 && (
        <div className="info-card heatmap-card">
          <h3>Тепловая карта активности (за 7 дней)</h3>
          <div className="heatmap-grid">
            {stats.heatmap.slice(0, 35).map((item, idx) => (
              <div
                key={idx}
                className={`heatmap-cell level-${Math.min(3, Math.floor(item.count / 3))}`}
                title={`${item.date} ${item.hour}:00 - ${item.count} событий`}
              >
                {item.hour}:00
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
