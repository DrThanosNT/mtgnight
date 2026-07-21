# MTG Night — Playgroup Life Counter, Deck Tracker & Stats

A mobile-first PWA for Magic: The Gathering playgroups. Log in, form a group, track decks, and use a Lifetap-style shared-screen life counter during games — with every game automatically feeding into group and personal win-rate stats.

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Project Structure](#project-structure)
- [Card Art Integration](#card-art-integration)
- [Deployment](#deployment)
- [License](#license)

## About

MTG Night replaces a stack of physical dice and a mental tally of who's winning with a single shared phone screen. Create a group tied to a format (Commander, Modern, Standard, etc.), invite your playgroup, track decks, and record games — the app handles seating order, first-player selection, life totals, commander damage, and all the usual counters (poison, energy, experience, treasure, and more), then turns every recorded game into filterable win-rate and turn-length stats for the group and for each player individually.

## Features

- **Accounts & sessions** — email/password auth with server-side sessions, rate-limited login (5 attempts, 60s lockout)
- **Groups** — format-locked (player count and starting life follow the format), invite-link based, capped at 6 members, soft-leave so historical stats stay intact even after someone leaves
- **Decks** — lightweight, name + format, owned per-player and reusable across any group of matching format
- **Card art backgrounds** — search real Magic cards via the Scryfall API and set one as a deck's background art, shown behind that player's life total during games
- **Shared-screen life counter** — Lifetap-style board that adapts its layout (and rotates seats to face the right direction) for 2–6 players, with:
  - Tap for ±1 life, hold for ±10, haptic feedback, and a running change indicator
  - Poison, radiation, energy, experience, treasure, commander tax, and storm counters
  - Per-source commander damage that also deducts from life
  - Dice roll or manual pick for who goes first, drag-to-reorder seating
- **Stats** — win rate by player, by seat order (does going first matter?), by deck, and turn-length distribution — filterable by group, deck, and played-first, both at the group level and on a personal profile aggregating across every group
- **Casual mode** — play without a group; nothing is saved
- **Installable PWA** — works like a native app once added to your home screen

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) ORM + PostgreSQL ([Neon](https://neon.tech))
- Session-based auth (database-backed sessions, not JWT)
- [Scryfall API](https://scryfall.com/docs/api) for card art
- Deployed on [Vercel](https://vercel.com)

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (local via Docker, or a hosted instance like Neon)

### Setup

```bash
git clone https://github.com/yourusername/mtg-night.git
cd mtg-night
npm install
```

Create a `.env` file in the project root:

DATABASE_URL=postgresql://user:password@localhost:5432/mtg_night
SESSION_COOKIE_NAME=mtg_session
SESSION_TTL_DAYS=30


Run migrations and start the dev server:

```bash
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Note: the app restricts access to mobile user agents — use your browser's device toolbar (or a real phone) to test.

## Project Structure

prisma/schema.prisma Data model: users, sessions, groups, decks, games
src/lib/ Auth, Prisma client, group-membership helpers, format metadata
src/app/api/ All API routes
src/app/(pages) Dashboard, group detail/stats, profile, casual play, invite landing
src/components/LifeCounter.tsx The shared-screen life counter itself


## Card Art Integration

Deck background art is powered by the [Scryfall API](https://scryfall.com/docs/api), which is free, requires no API key, and is explicitly built for third-party Magic apps. Search results return each card's `art_crop` image — just the illustration, no card frame or text — hotlinked directly from Scryfall's CDN rather than stored on our own servers.

## Deployment

Deployed on Vercel with Postgres hosted on Neon. Push to `main` to trigger a deploy; run `npx prisma migrate deploy` against the production database after any schema change.

## License

This project is provided for personal and educational use.