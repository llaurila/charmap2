import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const sharedRules = {
  'max-len': ['error', { code: 100, ignoreTemplateLiterals: true, ignoreUrls: true }],
  'max-lines': ['error', { max: 999, skipBlankLines: false, skipComments: false }],
}

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'public/unicode/**',
      'vendor/**',
      '**/*.d.ts',
      '**/*.js',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-hooks/set-state-in-effect': 'off',
      'complexity': 'off',
      complexity: ['error', { max: 8, variant: 'modified' }],
      ...sharedRules,
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['scripts/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
)
