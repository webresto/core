import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import path from 'path'

export default defineConfig({
  root: '.',
  build: {
    outDir: '../../assets/settingsmanager',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: {
        SettingsManager: path.resolve(__dirname, 'src/settings-manager.jsx')
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@inertiajs/react'],
      output: {
        entryFileNames: '[name].js'
      }
    }
  },
  plugins: [
    react({ jsxRuntime: 'classic' }),
    viteExternalsPlugin({
      'react': 'React',
      'react-dom': 'ReactDOM',
      '@inertiajs/react': 'InertiajsReact',
    })
  ],
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
