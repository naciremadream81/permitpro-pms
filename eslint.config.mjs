import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default [
  { ignores: ['.next/**', 'guacamole/**', '.agents/**', '.claude/**', 'node_modules/**', 'lib/generated/**'] },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Compiler optimization diagnostics remain advisory while migrating legacy effects.
  { rules: { 'react-hooks/immutability': 'warn', 'react-hooks/set-state-in-effect': 'warn' } },
]
