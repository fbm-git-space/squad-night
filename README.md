# Squad Night

Football-themed online party games for you and your friends.

## Local dev

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:3000
- Game server: http://localhost:3001

## Deploy online (no Git required)

You need **two** free hosts: **Render** (game server) + **Vercel** (website).

### 1. Deploy game server on Render

1. Go to [render.com](https://render.com) and sign up (GitHub login is fine).
2. **New → Web Service**
3. Choose **Deploy an existing image** OR **Build and deploy from a Git repository**  
   **Easiest without Git:** use **Manual Deploy** by connecting a repo later, OR deploy via Render CLI.

**Recommended — deploy from your PC with Render Blueprint:**

1. On Render: **New → Blueprint**
2. Connect this folder via GitHub when ready, OR create the service manually:

**Manual Web Service settings:**

| Setting | Value |
|---------|--------|
| Root Directory | *(leave empty — use monorepo root)* |
| Runtime | Node |
| Build Command | `pnpm install && pnpm --filter @party/shared build && pnpm --filter @party/game-core build && pnpm --filter @party/game-touchline build && pnpm --filter @party/server build` |
| Start Command | `node apps/server/dist/index.js` |
| Instance type | Free |

4. After deploy, copy your URL e.g. `https://squad-night-xxxx.onrender.com`

**Or use the included `render.yaml`** — push to GitHub and connect the repo on Render (Blueprint).

### 2. Deploy website on Vercel

```bash
cd apps/web
npx vercel
```

In Vercel → **Settings → Environment Variables**:

- `NEXT_PUBLIC_GAME_SERVER_URL` = `https://your-render-url.onrender.com` (no trailing slash)

Redeploy after adding the variable.

### 3. Play

Share your Vercel URL with friends.

## Word packs

Each game picks **25 random words** from ~100+ in the chosen pack — boards change every game.

## Project structure

```
apps/web/       Next.js frontend (Vercel)
apps/server/    Socket.io game server (Render)
apps/party/     Legacy PartyKit server (optional, not used in production)
packages/       Shared game logic
```
