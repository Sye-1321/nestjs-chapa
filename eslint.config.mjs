import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', '.artifacts/**', 'docs/specification/**', 'docs/contracts/2026-08-25-m0.5-contract-freeze-proposal.md'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        AbortController: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        DOMException: 'readonly',
        process: 'readonly',
        Response: 'readonly',
        TextEncoder: 'readonly',
        URL: 'readonly'
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  },
  {
    files: ['**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked]
  },
  {
    files: ['examples/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: './tsconfig.examples.json',
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
);
