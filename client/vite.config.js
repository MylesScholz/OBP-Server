import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react({
        jsxImportSource: "@emotion/react",
        babel: {
            plugins: ["@emotion/babel-plugin"]
        }
    })],
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
    },
    server: {
        host: true,
        watch: {
            usePolling: true
        },
        proxy: {
            '/api': {
                target: 'http://nginx:80',
                changeOrigin: true,
                secure: false
            }
        }
    }
})