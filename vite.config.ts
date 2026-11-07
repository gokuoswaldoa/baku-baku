import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { business } from './src/order-config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'business-metadata',
      transformIndexHtml(html) {
        const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        return html
          .replace('__BUSINESS_NAME__', () => escape(business.name))
          .replace(/__BUSINESS_LOCATION__/g, () => escape(business.location));
      },
    },
  ],
  server: {
    port: 5173,
    host: true
  }
});

