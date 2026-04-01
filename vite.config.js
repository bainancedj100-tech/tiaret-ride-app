import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Tiaret Ride App',
        short_name: 'TiaretRide',
        description: 'Tiaret Ride Sharing & Delivery Application',
        theme_color: '#ffffff',
        icons: [] // We'd add generated icons here, but Capacitor handles the mobile side primarily
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})
