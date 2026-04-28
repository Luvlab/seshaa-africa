# Seshaa (Working Name)
### Africa's 360 Phone & Address Directory

A full-stack, advertising-funded, user-generated directory for all 54 African countries — in **12 African and colonial languages**, with AI search, real-time chat, group messaging, event sharing, and a local sales rep commission network.

---

## Architecture

```
Seshaa/
├── frontend/          React 19 + TypeScript + Vite + TailwindCSS
│   └── src/
│       ├── i18n/      11 languages (EN, FR, PT, AR, SW, HA, YO, FF, AM, ZU, IG + LN, WO, TW)
│       ├── pages/     Home, Search, Chat, Portals
│       ├── components/ Navbar, ListingCard, AdBanner, Footer
│       ├── services/  API client (listings, ads, auth, AI)
│       ├── store/     Zustand auth store
│       └── types/     Shared TypeScript types
└── backend/           Node.js + Express + TypeScript
    └── src/
        ├── routes/    listings, ads, auth, salesreps, ai, chat
        ├── middleware/ JWT auth
        └── prisma/    PostgreSQL schema
```

## Portal Tiers

| Portal | URL | Who |
|--------|-----|-----|
| Consumer | `/search`, `/` | Public users, free |
| Business | `/business` | Business owners |
| Advertiser | `/advertise` | Ad buyers (3-step campaign wizard) |
| Sales Rep | `/salesrep` | Field reps earning 20% commission |
| Admin | `/admin` | Platform operators |

## Languages

| Code | Language | Native | Speakers |
|------|----------|--------|----------|
| `en` | English | English | Colonial |
| `fr` | French | Français | Colonial |
| `pt` | Portuguese | Português | Colonial |
| `ar` | Arabic | العربية | N. Africa |
| `sw` | Swahili | Kiswahili | 200M+ |
| `ha` | Hausa | Hausa | 100M+ |
| `yo` | Yoruba | Yorùbá | 50M+ |
| `ff` | Peul/Fulfulde | Fulfulde | 40M+ |
| `am` | Amharic | አማርኛ | 35M+ |
| `zu` | Zulu | isiZulu | 12M+ |
| `ig` | Igbo | Igbo | 45M+ |
| `ln` | Lingala | Lingala | 70M+ |
| `wo` | Wolof | Wolof | 12M+ |
| `tw` | Twi/Akan | Twi | 20M+ |

## Features

- **Directory**: Personal + Business + Government + NGO listings
- **Search**: Text + AI-powered natural language (Claude claude-sonnet-4-6)
- **Advertising**: Banner / Featured / Sponsored / Premium tiers
- **Sales Rep Network**: Local reps sell ads, earn 20% commission
- **Listings Pro**: Paid tier with gallery, hours, analytics, verified badge
- **Chat**: Direct messages + Group chats
- **Sharing**: Share listings, addresses, events — in-app or to WhatsApp, Telegram, Facebook, X, SMS
- **AI Assistant**: Multilingual directory assistant powered by Claude
- **Multi-language**: RTL support for Arabic

## Setup

### Backend
```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm install
npm run db:push               # push schema to Postgres
npm run db:seed               # seed sample African listings
npm run dev                   # starts on :3001
```

### Frontend
```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev                   # starts on :5173
```

## Ad Revenue Model

```
Advertiser pays budget → Platform takes 80% → Sales Rep keeps 20%
Tiers: Banner $50/mo · Featured $150/mo · Sponsored $300/mo · Premium $600/mo
```

## Renaming
To replace "Seshaa" with the final brand name, run:
```bash
grep -r "Seshaa" --include="*.ts" --include="*.tsx" --include="*.json" -l
# then: sed -i 's/Seshaa/NEWNAME/g' <files>
```
