import path from 'path'

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

import { peerDependencies } from './package.json'

const name = 'sequence-wagmi-connector'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({
      exclude: ['node_modules', '**/*.test.ts'],
      rollupTypes: true,
    }),
  ],
  publicDir: false,
  build: {
    lib: {
      name: 'SequenceHIHIWagmiConnector',
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: format => `${name}.${format}.js`,
    },
    outDir: path.resolve(__dirname, 'dist'),
    rollupOptions: {
      external: Object.keys(peerDependencies),
    },
    sourcemap: true,
    minify: false,
  },
})
