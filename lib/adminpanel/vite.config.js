import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import path from 'path'

// Mirror admin-frontend behaviour: externalize React and Inertia and emit ES module
export default defineConfig({
  root: '.',
  build: {
    outDir: '../../assets/stockmanager',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: {
        StockManager: path.resolve(__dirname, 'src/stock-manager.jsx'),
        OrderLogsViewer: path.resolve(__dirname, 'src/controls/order-logs-viewer.jsx')
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
      '@/components/ui/button': 'UIComponents',
      '@/components/ui/input': 'UIComponents',
      '@/components/ui/checkbox': 'UIComponents',
      '@/components/ui/card': 'UIComponents',
      '@/components/ui/label': 'UIComponents'
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
