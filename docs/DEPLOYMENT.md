# TeleDerma Deployment & Production Guide

## 1. Prerequisites
- **Node.js**: v20+ (tested on v24.14.0)
- **PostgreSQL**: v14+
- **Prisma**: 7.10.0 (strictly maintained)
- **Redis** (optional in dev; recommended in production for high throughput)
- **AWS S3 / S3-compatible Object Store**

## 2. Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your database connection string and secret keys.

## 3. Database Migration
```bash
npx prisma format
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

## 4. Running the Application
### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Running Test Suite
```bash
npm test
```

## 5. Swagger Documentation
Once running, the interactive Swagger UI is available at:
`http://localhost:5000/api/docs`
