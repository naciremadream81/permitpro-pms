import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.agents/**',
      '.claude/**',
      'node_modules/**',
      'lib/generated/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]

export default eslintConfig
