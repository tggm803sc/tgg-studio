// TGG Reels static asset worker: the Vite build output is served through the
// platform ASSETS binding; SPA fallback is handled by the deploy manifest.
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
