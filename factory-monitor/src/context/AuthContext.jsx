import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

axios.defaults.baseURL = '/api'
axios.defaults.withCredentials = true
let csrfToken = ''

axios.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method) && csrfToken) {
    config.headers = config.headers || {}
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get('/auth/check.php')
      if (response.data.authenticated) {
        setUser(response.data.user)
        csrfToken = response.data.csrf_token || ''
      } else {
        csrfToken = ''
      }
    } catch (error) {
      console.error('Auth check failed', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post('/auth/login.php', { email, password })
      if (response.data.success) {
        setUser(response.data.user)
        csrfToken = response.data.csrf_token || ''
        return { success: true }
      }
      return { success: false, message: response.data.message }
    } catch (error) {
      return { success: false, message: 'Ошибка соединения с сервером' }
    }
  }

  const logout = async () => {
    try {
      await axios.post('/auth/logout.php')
      setUser(null)
      csrfToken = ''
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await axios.post('/auth/change_password.php', {
        old_password: oldPassword,
        new_password: newPassword
      })
      return response.data
    } catch (error) {
      return { success: false, message: 'Ошибка соединения' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
