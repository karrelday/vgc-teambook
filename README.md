# Teambook

Document Pokémon Champions VGC teams: rosters with Stat Point spreads, game plans, threats,
notes, version history, and a match log that turns into real stats.

## Features

- **Team versions.** Lock a version before changing the team; games and records stay tied to the roster you actually played.
- **Match log.** Tap your bring and leads, type their team preview. Same opponent button for Bo3.
- **Stats.** Win rate per Pokémon brought and led, per lead pair, and against every Pokémon you've faced.
- **Threats.** How to play into specific Pokémon, with your record against each filled in automatically.
- **Share card.** Export the team as a PNG to post or send to friends.

Vite + React frontend, Express + MongoDB backend.

## Setup

1. Have MongoDB running locally, or create a free Atlas cluster.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` if you're not using local Mongo.
3. From this folder:

```
npm run setup
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5050 and Vite proxies `/api` to it.

## Structure

```
server/
  index.js            Express app + Mongo connection
  models/Team.js      Team schema (mons, plans, matches, notes embedded)
  routes/teams.js     CRUD + duplicate
client/src/
  App.jsx             Hash routing: #/ and #/team/:id
  api.js              Fetch wrapper
  lib/showdown.js     Showdown paste import/export
  lib/image.js        Image compression + Showdown sprite lookup
  components/         TeamList, TeamView and its tabs
```

## Images

Upload, drag in, or paste (Ctrl+V) an image into the Pokémon editor. Images are resized
to 320px webp before saving so documents stay small. With no image set, a sprite is loaded
from Pokémon Showdown using the species name (forms like `Basculegion-F` work).

## Sharing with friends

"Download team file" on a team saves a JSON file. Anyone can load it with
"Import team file" on the home page.
