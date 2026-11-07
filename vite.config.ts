import { defineConfig, loadEnv, type PluginOption, type ServerOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { business } from './src/order-config';

const checkoutPath = '/api/checkout/submit-order';
const checkoutOrigin = 'http://127.0.0.1:5173';

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, '.', ['VITE_ORDER_INTAKE_LOCAL', 'ORDER_LOCAL_']);
  const localIntake = command === 'serve' && !isPreview && env.VITE_ORDER_INTAKE_LOCAL === 'true';
  const server: ServerOptions = { port: 5173, host: true };
  const plugins: PluginOption[] = [
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
  ];

  if (localIntake) {
    const upstream = new URL(env.ORDER_LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321');
    const { ORDER_LOCAL_GATEWAY_JWT: gatewayJwt, ORDER_LOCAL_INTAKE_TOKEN: intakeToken } = env;
    if (!/^http:\/\/127\.0\.0\.1:[0-9]+\/$/.test(upstream.href) || !gatewayJwt || !intakeToken) {
      throw Error('El checkout de pruebas requiere una instancia local y credenciales locales del gateway.');
    }
    server.host = '127.0.0.1';
    server.strictPort = true;
    server.proxy = {
      ['^' + checkoutPath + '$']: {
        target: upstream.origin,
        changeOrigin: true,
        proxyTimeout: 12000,
        rewrite: () => '/functions/v1/submit-order',
        headers: { apikey: gatewayJwt, Authorization: 'Bearer ' + gatewayJwt, 'x-intake-token': intakeToken },
        configure(proxy) {
          proxy.on('proxyReq', outgoing => outgoing.removeHeader('cookie'));
        },
      },
    };
    plugins.push({
      name: 'local-checkout-gateway',
      configureServer(vite) {
        vite.middlewares.use((request, res, next) => {
          const req = request as { url?: string; method?: string; headers: { origin?: string; host?: string } };
          if (req.url !== checkoutPath) return next();
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST' || req.headers.origin !== checkoutOrigin || req.headers.host !== '127.0.0.1:5173') {
            res.writeHead(403).end();
            return;
          }
          next();
        });
      },
    });
  }

  return { plugins, server };
});

