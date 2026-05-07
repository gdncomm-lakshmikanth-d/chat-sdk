import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@opspilot/chat-core': path.resolve(__dirname, '../../packages/@opspilot/chat-core'),
      '@opspilot/chat-react': path.resolve(__dirname, '../../packages/@opspilot/chat-react'),
    },
  },
});