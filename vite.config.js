import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
<<<<<<< HEAD
import { base44 } from '@base44/vite' // <-- Kontrollera att denna rad är med!
=======
import { base44 } from '@base44/vite'
>>>>>>> 972ccb8 (fix: explicit import of base44 in vite config)

// https://vite.dev
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});
