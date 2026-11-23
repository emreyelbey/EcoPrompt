// Vite yapılandırması: React ve Tailwind eklentilerini açar, Vitest test ayarlarını tutar.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Varsayılan ortam Node'dur (saf fonksiyonlar, sunucu uç noktaları, dosya taramaları).
    // Ekran testleri dosyanın başına `// @vitest-environment jsdom` yazarak tarayıcı ortamı ister.
    environment: 'node',
  },
});
