# AniHub - Your Social Anime Discovery Platform

The root Next.js application remains runnable during the migration. The separately built Workers candidate is in `apps/worker`; see [Workers runtime](docs/workers-runtime.md) for its pinned Void/TanStack setup and local checks. No production cutover is enabled by adding this candidate.

A modern platform for anime enthusiasts to discover, track, review and share their favorite anime. Think Letterboxd for anime - track your watchlist, share reviews, and connect with fellow fans, all powered by a robust GraphQL API and the Jikan database.

## Features

- 🎯 Type-safe GraphQL API with Pothos
- 🔍 Advanced Anime Search & Discovery
- 📺 Comprehensive Anime Database
- ⭐ Personal Watchlist Management
- ✍️ Write and Share Reviews
- 👥 Social Features & Community
- 🏆 Track Watching Progress
- 🎭 Browse by Genres & Categories
- 🎬 Anime Trailers & Media
- 🏢 Production Studios & Metadata
- 🌐 Integration with Jikan API

## Tech Stack ⚒️

- [Next.js](https://nextjs.org) - React Framework
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) - GraphQL Server
- [Pothos](https://pothos-graphql.dev/) - GraphQL Schema Builder
- [gql.tada](https://github.com/0no-co/gql.tada) - Type-safe GraphQL Operations
- [openapi-fetch](https://github.com/drwpow/openapi-typescript) - Type-safe API Client
- [Drizzle](https://orm.drizzle.team/) - Database ORM
- [SQLite](https://www.sqlite.org/) - Database
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Shadcn UI](https://ui.shadcn.com/) - UI Components

## Run Locally

1. Clone the project

```bash
git clone https://github.com/KelechiOdom10/anihub.git
```

2. Go to the project directory

```bash
cd anihub
```

3. Create a local `.env.local` file at the root of the project with required environment variables.
   <br>

4. Install dependencies

```bash
pnpm install
```

5. Useful Development Scripts:

```bash
# Start development server
pnpm dev

# Generate GraphQL schema
pnpm generate

# Generate Jikan API types
pnpm codegen:anime

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

## Authors

- [@KelechiOdom10](https://github.com/KelechiOdom10)

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Contributing

Contributions are always welcome! Please feel free to submit a Pull Request.

## Acknowledgements

- [Jikan API](https://jikan.moe/) for providing the anime data
- [MyAnimeList](https://myanimelist.net/) for being the source of anime information
- [Letterboxd](https://letterboxd.com/) for design inspiration
- Design inspiration from [Kurosaw](https://www.behance.net/gallery/155394041/Kurosaw-Anime-Streaming-Web-App)
