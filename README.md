# MTG Night

### Playgroup life tracking, deck management & deep game statistics.

Commander · Modern · Standard · 30+ formats — one shared-screen life counter, your playgroup, your stats.

**Live Demo →** *mtgnightapp.vercel.app*

**Deploy with Vercel**

---

# Overview

Keep your entire MagicTheGathering playgroup in one place.

Create a group, invite friends and play! Every game is automatically recorded, producing detailed statistics for both your group and every individual player.

---


# Groups

Create permanent playgroups with:

- Invite links
- Format locking
- Automatic starting life
- Maximum 6 members
- Historical member retention
- Play with any subset of active members (minimum 2)

Supported formats include:

- Commander
- Modern
- Standard
- Pioneer
- Pauper
- Legacy
- Vintage

…and roughly 30 additional official formats.

---


# Statistics

Every recorded game contributes to a statistics engine.

Filter simultaneously by:

- Exact participating players
- Seat assignments
- Individual deck

View:

- Overall win rate
- Win rate by seat
- Turn length distribution
- Deck performance
- Personal statistics across every group

Statistics exist at both:

- Group level
- Player profile level

---

# Player Profiles

Search for any player and view:

- Lifetime statistics
- Deck performance
- Win rates
- Filtered game history

Profiles aggregate games across every group.

---


# Architecture

![Architecture Diagram](./screenshots/diagram.png)


Everything is written in TypeScript using the Next.js App Router.

---

# Setup

## Prerequisites

| Service | Required | Notes |
|---------|----------|------|
| Node.js 20+ | ✓ | |
| PostgreSQL | ✓ | Local or Neon |
| Vercel | optional | Deployment |

---

## 1 — Clone

```bash
git clone https://github.com/DrThanosNT/mtg-night.git

cd mtg-night

npm install
```

---

## 2 — Environment Variables

Create `.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/mtg_night

SESSION_COOKIE_NAME=mtg_session

SESSION_TTL_DAYS=30
```

---

## 3 — Database

Run Prisma migrations.

```bash
npx prisma migrate dev
```

---

## 4 — Development

```bash
npm run dev
```

Open

```
http://localhost:3000
```

> The application is mobile-first and only allows mobile user agents. Use your browser's mobile device toolbar or test on a real phone.

---

# Project Structure

```
prisma/
└── schema.prisma

src/
├── app/
│   ├── api/
│   └── (pages)/
├── components/
│   ├── LifeCounter.tsx
│   └── Sidebar.tsx
└── lib/
```

# Card Art

Magic artwork is provided by the **Scryfall API**.

Players search for a card when editing a deck.

The application stores the selected artwork URL and displays the card's `art_crop` image as the deck background during games.

No artwork is stored locally.

---

# Authentication

Database-backed session authentication.

Features include:

- Server-side sessions
- Secure cookies
- Rate limited login

JWTs are not used.

---

# Deployment

Deploy to **Vercel** using a PostgreSQL database hosted on **Neon**.

Environment variables:

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| SESSION_COOKIE_NAME | Session cookie name |
| SESSION_TTL_DAYS | Session lifetime |

After deploying:

```bash
npx prisma migrate deploy
```

Pushes to `main` automatically trigger new deployments on Vercel.

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Prisma
- PostgreSQL
- Neon
- Vercel
- Scryfall API
- Progressive Web App

---

# License

This project is provided for educational and demonstration purposes.

It is not licensed for commercial use without explicit permission from the author.
