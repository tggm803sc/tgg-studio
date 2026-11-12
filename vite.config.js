import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cloud previews are served through a per-session hostname. Pass it in
// (PREVIEW_HOST) so the exact host is allowed without a blanket allowlist.
const previewHost = process.env.PREVIEW_HOST

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: previewHost ? [previewHost] : undefined,
  },
})
