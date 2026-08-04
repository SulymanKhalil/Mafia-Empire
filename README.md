# Mafia Empire

Realtime anonymous Mafia chat — built with Next.js + Pusher. Deploy entirely on Netlify, no separate backend needed.

## Stack
- **Next.js 14** (App Router)
- **Pusher Channels** (free tier) — realtime events
- **Tailwind CSS**
- **Netlify** (one-click deploy)

---

## 1. Get Pusher credentials (free, no credit card)

1. Go to [pusher.com](https://pusher.com) → Sign up
2. Create a new **Channels** app
3. Choose any cluster (e.g. `mt1` for US, `eu` for Europe, `ap2` for Asia)
4. Go to **App Keys** tab — copy your 4 keys

---

## 2. Local development

```bash
npm install

# Create env file
cp .env.local.example .env.local
# Fill in your Pusher keys in .env.local

npm run dev
# → http://localhost:3000
```

---

## 3. Deploy to Netlify

1. Push this project to a GitHub repo
2. Go to [netlify.com](https://netlify.com) → New site → Import from GitHub
3. Build settings are auto-detected via `netlify.toml`
4. Go to **Site Settings → Environment Variables** → add all 5 vars:

```
PUSHER_APP_ID        = your_app_id
PUSHER_KEY           = your_key
PUSHER_SECRET        = your_secret
PUSHER_CLUSTER       = your_cluster
NEXT_PUBLIC_PUSHER_KEY     = your_key       (same as PUSHER_KEY)
NEXT_PUBLIC_PUSHER_CLUSTER = your_cluster   (same as PUSHER_CLUSTER)
```

5. **Deploy site** — done ✅

## How it works

- Users join the lobby, pick a role (**Mafia**, **Civilian**, **Detective**, or **Doctor**), enter a display name, and click Enter.
- `POST /api/register-room` registers the room code in the server-side memory store when creating a game.
- `POST /api/validate-room` checks if a room code exists in the store before allowing a player to join.
- `POST /api/join` registers the player to the room store and triggers a Pusher `member-joined` event to all clients in the room channel.
- `POST /api/message` triggers a `new-message` event to distribute chat messages.
- `POST /api/typing` triggers a `typing-update` event to sync real-time typing indicators.
- `POST /api/reaction` triggers a `message-reaction` event to attach emoji reactions to messages.
- `POST /api/leave` removes the player from the room store and triggers `member-left` when a user exits or closes the tab.
- All message senders are identified anonymously by their chosen role and display name.

---

## Pusher free tier limits
- 200 concurrent connections
- 200k messages/day
- Unlimited channels

More than enough for a side project or game session.
