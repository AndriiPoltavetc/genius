import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  external: ['@prisma/client'],
})
