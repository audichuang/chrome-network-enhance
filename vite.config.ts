import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-files',
      closeBundle() {
        // Copy manifest.json
        copyFileSync(
          resolve(__dirname, 'manifest.json'),
          resolve(__dirname, 'dist/manifest.json')
        )
        // Copy icons
        const iconsDir = resolve(__dirname, 'dist/icons')
        if (!existsSync(iconsDir)) {
          mkdirSync(iconsDir, { recursive: true })
        }
        copyFileSync(
          resolve(__dirname, 'icons/icon16.svg'),
          resolve(__dirname, 'dist/icons/icon16.svg')
        )
        copyFileSync(
          resolve(__dirname, 'icons/icon48.svg'),
          resolve(__dirname, 'dist/icons/icon48.svg')
        )
        copyFileSync(
          resolve(__dirname, 'icons/icon128.svg'),
          resolve(__dirname, 'dist/icons/icon128.svg')
        )
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.html'),
        devtools: resolve(__dirname, 'src/devtools/devtools.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    emptyOutDir: true,
  },
})
