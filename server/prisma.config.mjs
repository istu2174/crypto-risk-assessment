// Konfigurasi Prisma 7. URL database harus ditaruh di sini, tidak lagi
// di schema.prisma (breaking change Prisma 7).
//
// dotenv di-load eksplisit karena prisma CLI tidak otomatis baca .env
// untuk config file.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
    // Beberapa provider (Supabase) butuh URL terpisah buat migrasi.
    // Kalau DIRECT_URL diisi, prisma migrate pakai itu; runtime query pakai DATABASE_URL.
    directUrl: process.env.DIRECT_URL,
  },
});
