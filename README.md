# FileLink — PC Control Center

Remote PC management web app inspired by the [Lovable pcctrn repo](https://github.com/zinet2020n-bit/pcctrn). Control power, run terminal commands, browse files, manage processes, and view system info across your devices from your browser.

## Features

- **Control Tab** — Power actions (shutdown, restart, sleep, lock) with scheduled tasks and live countdown. Agent management (restart, stop, flush DNS) with confirmation modals. Clipboard sync with history and pinning. Display capture hub (screenshot, screen record, camera). Full audit trail with CSV export.
- **Terminal** — Interactive command prompt with admin mode (passcode-protected), script vault for common commands, and live device listing.
- **Files** — File explorer with folder tree navigation, search, and device browsing.
- **Tasks** — Remote process manager with tasklist view, search, and kill capability (admin-gated).
- **PC Info** — System information dashboard with CPU, RAM, uptime, storage drives, and network adapters.
- **Device Registry** — Full device management modal with add, search, select, and delete.
- **Side Panel** — Storage usage, device list with online/offline status, and recent file transfers.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS v3
- **Backend:** Supabase (PostgreSQL database with Row Level Security)
- **Icons:** Lucide React
- **Design:** iOS-inspired dark theme with oklch colors, glassmorphism, and spring animations

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free at [supabase.com](https://supabase.com))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/zinet2020n-bit/pcctrn.git
   cd pcctrn
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Open `.env` and fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   Find these in your Supabase Dashboard → Settings → API.

5. Run the database migrations to create the required tables:
   - Go to your Supabase Dashboard → SQL Editor
   - Copy and paste the contents of each file in `supabase/migrations/` in order
   - Click Run for each

6. Start the dev server:
   ```bash
   npm run dev
   ```

### Building for Production

```bash
npm run build
npm run preview
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key | Yes |

Both variables are prefixed with `VITE_` so Vite exposes them to the browser. The anon key is safe to expose publicly — it only has the permissions you grant through Row Level Security policies.

## Database Schema

The app uses five tables (all with RLS enabled):

- **devices** — Registered PCs (name, OS, status, agent version)
- **clipboard_history** — Synced clipboard entries with pin support
- **audit_logs** — Terminal command and power action audit trail
- **scheduled_tasks** — Scheduled power actions with execution tracking
- **file_transfers** — File transfer records between devices

## License

MIT
