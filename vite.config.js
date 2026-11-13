import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 프로젝트 사이트 경로 (https://<user>.github.io/pomodoro-timer/)
export default defineConfig({
  base: '/pomodoro-timer/',
  plugins: [react(), tailwindcss()],
})
