import React, { useState, useEffect } from 'react'

function TodoModal({ onClose }) {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('admin_todos')
    if (saved) {
      setTodos(JSON.parse(saved))
    }
  }, [])

  const saveTodos = (newTodos) => {
    setTodos(newTodos)
    localStorage.setItem('admin_todos', JSON.stringify(newTodos))
  }

  const addTodo = () => {
    if (newTodo.trim()) {
      saveTodos([...todos, { id: Date.now(), text: newTodo, completed: false, createdAt: new Date().toLocaleString() }])
      setNewTodo('')
    }
  }

  const toggleTodo = (id) => {
    saveTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id) => {
    saveTodos(todos.filter(todo => todo.id !== id))
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const completedCount = todos.filter(t => t.completed).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '450px' }}>
        <div className="modal-header">
          <h3>✅ To-Do list</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Добавить задачу..."
            style={{
              flex: 1,
              padding: '12px 14px',
              border: '1px solid #ddd',
              borderRadius: '12px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={addTodo}
            style={{
              padding: '12px 24px',
              background: '#34C759',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Добавить
          </button>
        </div>
        
        <div style={{ marginBottom: '16px', fontSize: '13px', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
          <span>📊 Прогресс</span>
          <span>{completedCount} / {todos.length} выполнено</span>
        </div>
        
        <div style={{ 
          height: '4px', 
          background: '#f0f0f0', 
          borderRadius: '2px', 
          marginBottom: '20px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${todos.length ? (completedCount / todos.length) * 100 : 0}%`, 
            height: '100%', 
            background: '#34C759',
            transition: 'width 0.3s'
          }} />
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {todos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
              ✨ Нет задач. Добавьте первую!
            </div>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  borderBottom: '1px solid #eee',
                  backgroundColor: todo.completed ? '#f9f9f9' : 'white',
                  transition: 'background 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span style={{
                  flex: 1,
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  color: todo.completed ? '#aaa' : '#333',
                  fontSize: '14px'
                }}>
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '4px 8px'
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
        
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #eee', fontSize: '11px', color: '#aaa', textAlign: 'center' }}>
          💾 Данные сохраняются локально в браузере
        </div>
      </div>
    </div>
  )
}

export default TodoModal