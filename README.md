# Arambar Saili - Landing Page

This project contains Day 1 setup:

- Next.js + TypeScript + Tailwind base app
- Admin ID/password login flow
- Session cookie auth for admin area
- Base public landing page layout
- Base admin dashboard layout
- Initial SQL schema for products, variants, images, orders, and admin users

## Run locally

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Update credentials inside `.env.local`.

3. Install and run:

```bash
npm install
npm run dev
```

4. Open:
- Public page: `http://localhost:3000`
- Admin login: `http://localhost:3000/admin/login`

## Important note

Current Day 1 auth uses env-based admin credentials (`ADMIN_ID` + `ADMIN_PASSWORD`) for fast setup.
In a later phase, we can switch fully to database-backed hashed admin accounts.

