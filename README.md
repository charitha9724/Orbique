# Orbique

Buy and sell with students near you. Post items with photos, find things for sale within a few km,
chat with sellers without sharing your number, and report or block anyone.

Live web app: https://orbique-tau.vercel.app

## Built with

- Expo (React Native + TypeScript) with Expo Router, running as a web app
- Supabase: login, database, live chat and photo storage
- Vercel: hosting for the web version

## Run it on your computer

1. Install the packages: `npm install`
2. Create `.env.local` with your Supabase details:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxx
   ```
3. Start it: `npx expo start --web` and open http://localhost:8081

## Database

The database setup lives in `supabase/migrations/`. Run the files in order (0001, 0002, ...) in the
Supabase SQL Editor.

## Publish the web version

`npm run build:web`, then deploy the `dist` folder with `npx vercel deploy --prod`.
