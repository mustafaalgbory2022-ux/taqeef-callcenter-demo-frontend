import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'public/mockServiceWorker.js',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Context modules intentionally export their provider together with its hook.
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'useApiContext',
            'useApiClient',
            'createDefaultClient',
            'useBranding',
            'useI18n',
            'useTheme',
            'useToast',
            'tableStyles',
          ],
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/\\b(margin|padding)-(left|right)\\b/]',
          message: 'Use CSS logical properties (inline-start/end) for RTL support.',
        },
      ],
    },
  },
  {
    // Only the mock runtime (and the simulated backend itself / its tests) may import it, so
    // live builds can exclude it completely (see vite.config.ts and src/test/liveBundle.test.ts).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/api/mock/**', 'src/shared/api/runtime/mock.ts', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/api/mock',
                '**/api/mock/**',
                '../mock',
                '../mock/**',
                './mock/**',
                '**/runtime/mock',
              ],
              message:
                'Use @/shared/api/runtime; the simulated backend must stay out of live builds.',
            },
          ],
        },
      ],
    },
  },
);
