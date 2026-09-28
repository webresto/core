import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteExternalsPlugin } from 'vite-plugin-externals'
import path from 'path'
import {
  ADMIN_MODULE_ENTRIES,
  ADMIN_HMR_ROUTE_PREFIX,
  ADMIN_HMR_DEFAULT_PORT,
} from './adminModules'

const VIRTUAL_PREFIX = '\0restocore-hmr:'

const buildEntries = Object.fromEntries(
  Object.entries(ADMIN_MODULE_ENTRIES).map(([name, file]) => [
    name,
    path.resolve(__dirname, file),
  ])
)

/**
 * Serves every bundle entry under `${ADMIN_HMR_ROUTE_PREFIX}<Name>` for the
 * admin page, which loads it cross-origin with a plain `import(url)`.
 *
 * The wrapper installs the react-refresh runtime before pulling in the entry:
 * adminizer's HTML is not ours to patch, so the preamble Vite normally puts in
 * index.html has to travel with the module. Top-level await keeps the order —
 * the runtime is in place before any component module evaluates.
 *
 * Fast refresh itself cannot work here, so every edit forces a page reload
 * instead. The modules render with adminizer's `window.React` / `window.ReactDOM`,
 * which come from its *production* bundle, and only development React exposes the
 * `scheduleRefresh`/`setRefreshHandler` helpers the refresh runtime needs. Without
 * them `performReactRefresh()` is a silent no-op: the module would be re-evaluated
 * and nothing on screen would change. The preamble still has to be installed —
 * plugin-react's transform throws without it.
 */
function restocoreHmrEntries() {
  return {
    name: 'restocore-hmr-entries',
    apply: 'serve',
    resolveId(id) {
      if (!id.startsWith(ADMIN_HMR_ROUTE_PREFIX)) return null
      const name = id.slice(ADMIN_HMR_ROUTE_PREFIX.length)
      return ADMIN_MODULE_ENTRIES[name] ? `${VIRTUAL_PREFIX}${name}` : null
    },
    load(id) {
      if (!id.startsWith(VIRTUAL_PREFIX)) return null
      const entry = ADMIN_MODULE_ENTRIES[id.slice(VIRTUAL_PREFIX.length)]
      return [
        `const refresh = await import('/@react-refresh')`,
        `const RefreshRuntime = refresh.default ?? refresh`,
        `RefreshRuntime.injectIntoGlobalHook(window)`,
        `window.$RefreshReg$ = () => {}`,
        `window.$RefreshSig$ = () => (type) => type`,
        `window.__vite_plugin_react_preamble_installed__ = true`,
        `const mod = await import('/${entry}')`,
        `export default mod.default`,
      ].join('\n')
    },
    handleHotUpdate({ modules, server }) {
      // Nothing loaded depends on this file — leave it to Vite.
      if (!modules.length) return
      server.ws.send({ type: 'full-reload', path: '*' })
      // Swallow the js-update: with a production React it would re-run the
      // module without re-rendering anything.
      return []
    },
  }
}

// Mirror admin-frontend behaviour: externalize React and Inertia and emit ES module
export default defineConfig({
  root: __dirname,
  build: {
    outDir: '../../assets/core-adminizer-assets',
    emptyOutDir: true,
    cssCodeSplit: true,
    lib: {
      entry: buildEntries,
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
  server: {
    // Bound explicitly: on Windows a bare `localhost` binds IPv6-only, which
    // some clients cannot reach.
    host: "127.0.0.1",
    port: Number(process.env.RESTOCORE_HMR_PORT || ADMIN_HMR_DEFAULT_PORT),
    strictPort: true,
    // The modules are imported from the app's origin, not from this server.
    cors: true,
    // Serve deps from both the core package and the host app it is linked into.
    fs: {
      allow: [
        path.resolve(__dirname, '../..'),
        path.resolve(__dirname, '../../../..'),
      ],
    },
  },
  plugins: [
    restocoreHmrEntries(),
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
