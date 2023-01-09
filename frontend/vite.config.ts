import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],

    // We want to leverage Pheonix's static assets plug to serve
    // the React app directly from the final Elixir app.
    // All the files will be served from the priv/static/webapp
    // directory.

    // NOTE: must remember to use "mix webapp" for production.
    base: process.env.NODE_ENV === 'production' ? '/webapp/' : '/',

    // For development purposes, forward requests made to /api to
    // the Elixir/Phoenix backend running on port 4000.
    // This saves a lot of pain when it comes to dealing with CORS
    // in development.
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:4000',
                secure: false,
                ws: true,
            },
        },
    },
});
