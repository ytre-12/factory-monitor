import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    proxy: {
      '/api': {
        target: 'https://sergey1337.pro-web24.ru',
        changeOrigin: true,
        secure: false
      }
    }
  }
})