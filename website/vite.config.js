import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages needs the repo-name sub-path; Render serves from root.
  // Set VITE_BASE_PATH in the build environment to override.
  base: process.env.VITE_BASE_PATH ?? '/',
})
