import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 確保部署到 GitHub Pages 時相對路徑解析正確
  server: {
    port: 3000,
    open: true
  }
});
