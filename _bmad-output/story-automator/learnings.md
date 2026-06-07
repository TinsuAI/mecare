
## Epic 1 run — 2026-06-06

**Result:** 6/6 stories done, 0 review retry cycles, 1 escalation (env, self-resolved).

**Key learning — claude CLI auto-update mid-run:** Spawned tmux review session hit a post-update onboarding wizard (theme picker → login prompt) that blocked execution → monitor `timeout`. Root cause: `claude` binary auto-updated to v2.1.167 between auto (04:39) and review (08:27). Credentials were valid (`claude -p` worked headless); only the interactive first-run wizard blocked. Fix: answer theme prompt once (Enter) → onboarding clears → respawn works. Do NOT complete the OAuth flow (would disturb parent creds); Ctrl-C abort instead.

**What worked:** Source-of-truth verification via `sprint-status get` is reliable when monitor reports false-negative `timeout`. Every story that showed monitor=timeout had sprint-status=done/review confirming real success. Trust sprint-status over pane-parse.

## Post-Epic-1 stack test — 2026-06-06

**Bug discovered — `.env.example` misleading port vars:** `N8N_PORT` and `ZALO_BRIDGE_PORT` appear configurable in `.env.example` but changing them breaks the stack silently:
- `N8N_PORT`: n8n reads this as its internal listen port; docker-compose healthcheck hardcodes `localhost:5678` and port-map hardcodes `:5678` as container side → changing breaks both.
- `ZALO_BRIDGE_PORT`: app reads this as its internal listen port (3000); healthcheck probes `:3000` hardcoded → changing makes container unhealthy.

Root cause: compose was written with host-side aliases (`N8N_HTTP_PORT`, `ZALO_BRIDGE_HOST_PORT`) but `.env.example` kept both internal and external vars, implying both are safe to change.

**Fix story logged as 1.7.** Until fixed, keep `N8N_PORT=5678` and `ZALO_BRIDGE_PORT=3000` in `.env`. Only `N8N_HTTP_PORT` and `BASEROW_HTTP_PORT` are safe to change for host-port remapping.
