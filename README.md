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

---

## How it works

- Users join the lobby, pick **Mafia** or **Civilian**, click Enter
- `POST /api/join` triggers a Pusher `member-joined` event to all clients
- `POST /api/message` triggers `new-message` to all clients
- `POST /api/leave` triggers `member-left` when user exits or closes tab
- All message senders show as "Mafia" or "Civilian" — fully anonymous

---

## Pusher free tier limits
- 200 concurrent connections
- 200k messages/day
- Unlimited channels

More than enough for a side project or game session.
