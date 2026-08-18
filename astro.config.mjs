import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://astro.build/config
export default defineConfig({
  site: 'https://inhander.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/500'),
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: new Date(),
      serialize(item) {
        if (item.url === 'https://inhander.com/' || item.url === 'https://inhander.com') {
          item.changefreq = 'daily';
          item.priority = 1.0;
        } else if (
          item.url.includes('/compare-offers') || 
          item.url.includes('/hike-calculator') || 
          item.url.includes('/44ada-freelance') || 
          item.url.includes('/tax-slabs')
        ) {
          item.changefreq = 'weekly';
          item.priority = 0.9;
        } else if (item.url.includes('/salary/')) {
          item.changefreq = 'weekly';
          item.priority = 0.85;
        } else if (item.url.includes('/about') || item.url.includes('/contact')) {
          item.changefreq = 'monthly';
          item.priority = 0.6;
        } else if (item.url.includes('/privacy') || item.url.includes('/terms')) {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        }
        return item;
      }
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('./src')
      }
    },
    oxc: {
      tsconfig: path.resolve('./tsconfig.json')
    }
  }
});
