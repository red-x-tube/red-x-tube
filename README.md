# RedxTube — Deploy Guide

## ধাপ ১ — Neon (Database)
1. neon.tech → Sign up → New Project
2. Connection string কপি করো
3. SQL Editor এ schema.sql ফাইলের SQL রান করো

## ধাপ ২ — GitHub
1. github.com → New Repository → Private → "redxtube"
2. এই folder টা upload করো

## ধাপ ৩ — Render (Backend)
1. render.com → New Web Service → GitHub repo connect
2. Root Directory: `api-server`
3. Environment Variables:
   - DATABASE_URL = Neon connection string
   - PORT = 3000
   - ADMIN_PASSWORD = যেকোনো password

## ধাপ ৪ — Vercel (Frontend)
1. vercel.com → New Project → GitHub repo import
2. Root Directory: `red-x-tube`
3. Environment Variables:
   - VITE_API_URL = Render এ পাওয়া URL
