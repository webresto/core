import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import path from 'path'

// Mirror admin-frontend behaviour: externalize React and Inertia and emit ES module
export default defineConfig({
  root: '.',
  build: {
    outDir: '../../assets/core-adminizer-assets',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: {
        StockManager: path.resolve(__dirname, 'src/stock-manager.jsx'),
        OrderLogsViewer: path.resolve(__dirname, 'src/controls/order-logs-viewer.jsx'),
        OrderKanban: path.resolve(__dirname, 'src/order-kanban.jsx'),
        NotificationsManager: path.resolve(__dirname, 'src/notifications-manager.jsx'),
        OrdersReport: path.resolve(__dirname, 'src/orders-report.jsx'),
        SettingsManager: path.resolve(__dirname, 'src/settings-manager.jsx'),
        SetupChecklist: path.resolve(__dirname, 'src/setup-checklist.jsx')
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@inertiajs/react'],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].mjs',
        format: 'es',
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
