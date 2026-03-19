# Projet : Rotary Event Management

## Ce que fait l'app
Gestion des déjeuners statutaires du Rotary Club : tables, sièges, réservations, planning, chat entre convives, archives.

## Stack
- React 18 + Vite
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (DB + Realtime + Storage)
- TanStack React Query
- Vercel (deploy)

## Structure
src/
  components/   → UI (admin/, calendar/, dashboard/, feedback/, notifications/, reservations/, table/, ui/)
  pages/        → routes (1 fichier = 1 route, auto-registered via pages.config.js)
  lib/          → supabase.js (client), db.js (entity wrapper), AuthContext.jsx, query-client.js
  hooks/        → custom hooks
  utils/        → helpers

## Conventions
- Composants : PascalCase
- Fichiers : PascalCase pour composants, kebab-case pour utilitaires
- Pas de TypeScript strict (jsconfig.json)
- Imports : toujours via @/ alias (résolu vers src/)
- Supabase : toujours via les entités de @/lib/db (Seat, RestaurantTable, etc.)
- Auth : optionnelle, via Supabase Auth + table profiles

## Commandes
npm run dev          → dev local (http://localhost:5173)
npm run build        → build prod
npm run lint         → ESLint

## Entités (tables Supabase)
- restaurant_tables : tables du restaurant
- seats : sièges (liés à une table)
- reservations : demandes de réservation
- chat_messages : messages entre convives
- global_settings : config globale (broadcast, speaker, planning)
- event_history : archives des événements
- upcoming_events : événements planifiés
- profiles : utilisateurs (email, role)

## Patterns
- Data fetching : TanStack Query + wrapper db.js (même API que Base44)
- Real-time : Supabase Realtime via entity.subscribe()
- File upload : Supabase Storage bucket "uploads"
- Auth : Supabase Auth (email), profil dans table profiles
- Notifications : NotificationProvider avec subscriptions temps réel
