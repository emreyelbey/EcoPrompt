// Vite yapılandırması: React ve Tailwind eklentilerini açar, Vitest test ayarlarını tutar.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Testlerimiz saf fonksiyonlar ve dosya taramaları; tarayıcı ortamı gerekmez.
    environment: 'node',
  },
});
