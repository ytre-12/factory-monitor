import React, { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'

function CalendarModal({ onClose }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '500px' }}>
        <div className="modal-header">
          <h3>📅 Календарь</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}>←</button>
          <h4 style={{ fontSize: '18px', margin: 0 }}>{format(currentMonth, 'LLLL yyyy', { locale: ru })}</h4>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}>→</button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {weekDays.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: '600', color: '#888', fontSize: '14px', padding: '8px' }}>
              {day}
            </div>
          ))}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isCurrentDay = isToday(day)
            
            return (
              <div
                key={day.toString()}
                style={{
                  textAlign: 'center',
                  padding: '12px 8px',
                  borderRadius: '8px',
                  backgroundColor: isCurrentDay ? '#34C759' : (isCurrentMonth ? '#f5f5f5' : '#fafafa'),
                  color: isCurrentDay ? 'white' : (isCurrentMonth ? '#333' : '#ccc'),
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: isCurrentDay ? '600' : '400'
                }}
              >
                {format(day, 'd')}
              </div>
            )
          })}
        </div>
        
        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #eee', color: '#888', fontSize: '12px', textAlign: 'center' }}>
          📅 Диапазон: 2026 - 2030
        </div>
      </div>
    </div>
  )
}

export default CalendarModal