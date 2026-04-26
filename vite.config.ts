/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const defaultSupabaseUrl = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const defaultSupabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";
  const testSupabaseUrl = process.env.VITE_SUPABASE_URL ?? defaultSupabaseUrl;
  const testSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? defaultSupabaseAnonKey;
  const isAppTest = process.env.PLAYWRIGHT_USE_TEST_SUPABASE === "true";

  return {
    define: {
      __SUPABASE_URL__: JSON.stringify(defaultSupabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(defaultSupabaseAnonKey),
      __TEST_SUPABASE_URL__: JSON.stringify(testSupabaseUrl),
      __TEST_SUPABASE_ANON_KEY__: JSON.stringify(testSupabaseAnonKey),
      __APP_IS_TEST__: JSON.stringify(isAppTest),
    },
    plugins: [react({
      babel: {
        plugins: [['babel-plugin-react-compiler']]
      }
    })],
    test: {
      projects: [{
        extends: true,
        plugins: [
        // The plugin will run tests for the stories defined in your Storybook config
        // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
        storybookTest({
          configDir: path.join(dirname, '.storybook')
        })],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{
              browser: 'chromium'
            }]
          }
        }
      }]
    }
  };
});
