# 🐋 Whale Tracker

Real-time whale sighting tracker for the Salish Sea. Built with React, MapLibre, and Acartia data.

**Website:** [whale-tracker.vercel.app](https://whale-tracker.vercel.app)

## Features

✅ Real-time whale sightings from Acartia API  
✅ Interactive map with species color-coding  
✅ Recent sightings feed  
✅ Detailed sighting information  
✅ Auto-refresh every 30 seconds  
✅ Fully responsive (desktop, tablet, mobile)  
✅ No backend required  

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

Open [http://localhost:5173](http://localhost:5173)

### Deploy to Vercel

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

TL;DR:
1. Push to GitHub
2. Import repo in Vercel
3. Done! 🚀

## Project Structure

```
src/
├── api/acartia.ts              # Acartia API client
├── components/
│   ├── Map.tsx                 # MapLibre map
│   ├── SightingsList.tsx        # Recent sightings
│   └── SightingDetail.tsx       # Detail view
├── hooks/useSightings.ts        # TanStack Query hooks
├── styles/                      # Component CSS
├── App.tsx                      # Main app
└── main.tsx                     # React entry point
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **MapLibre GL** - Interactive maps
- **TanStack Query** - Data fetching & caching
- **Tailwind CSS** - Styling
- **Axios** - HTTP client

## Environment Variables

Copy `.env.example` to `.env.local` and update:

```env
VITE_ACARTIA_API_URL=https://acartia.io/api/v1
VITE_MAPLIBRE_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
VITE_POLLING_INTERVAL=30000
VITE_DEBUG=false
```

No API keys required for read-only access.

## API

Data sourced from **Acartia Data Cooperative**, which aggregates:
- Orca Network sightings (vetted by experts)
- Community science observations
- Historical whale data

### Endpoints Used

- `GET /sightings/current` - All current sightings
- `GET /sightings/trusted` - Orca Network verified only
- `GET /sightings/:id` - Specific sighting details

[Acartia API Docs](https://github.com/salish-sea/acartia)

## Roadmap

### V1 (MVP) ✅
- Real-time sightings map
- Sighting detail view
- Recent sightings feed

### V2 (Coming Soon)
- [ ] Push notifications
- [ ] Species filters
- [ ] Time range filtering
- [ ] Sighting history
- [ ] Export as CSV

### V3 (Future)
- [ ] Mobile app (React Native/Expo)
- [ ] User accounts
- [ ] Saved locations
- [ ] Dark mode

## Contributing

Have ideas for improvements? Issues and PRs welcome!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT - Feel free to use this project for anything!

## Acknowledgments

- [Orca Network](https://orcanetwork.org) - Whale sighting data
- [Acartia](https://acartia.io) - Data cooperative
- [MapLibre](https://maplibre.org) - Open-source maps
- [Vercel](https://vercel.com) - Hosting

---

**Made with 🐋 by Christina**

Questions? Email or open an issue on GitHub.
