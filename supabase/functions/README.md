# Supabase edge functions

**These files are the source of truth. Until 2026-08-21 they existed only inside
Supabase and were reconstructed from memory on every redeploy — which is exactly
why the `ekip` function's payload started truncating.**

Project: `itnmcxemdpauemsnesln` ("Sakala Haiti", us-east-1). Free tier, so it
**re-pauses when idle** — first thing to check on any 503.

## The hard constraint

**Edge functions cannot serve HTML on `*.supabase.co`.** The gateway forces
`Content-Type: text/plain` with `nosniff` and a CSP sandbox — an anti-phishing
measure that cannot be overridden from function code. Setting `text/html` is
silently discarded, and the lost charset mangles every accent.
`application/json` passes through untouched.

So: **HTML on GitHub Pages, Supabase returns JSON only.** Do not try to serve a
page from a function. This was discovered the hard way after shipping a page
that rendered as raw source.

## The functions

| slug | verify_jwt | what it is |
|---|---|---|
| `f` | off | Public form API. `GET /f/<slug>` serves a schema with answer keys stripped; `POST` validates, scores and stores. Public because trainees scan a QR and have no credentials. |
| `ekip` | off | Internal admin API. HTTP Basic auth against `EKIP_USERS`. Form CRUD, responses, documents. Implements its own auth, hence jwt off. |
| `apwobasyon` | off | Two-signature approvals. Only decides who you are and what roles you hold — every actual control lives in Postgres. |
| `send0` | off | Legacy Send 0 API, superseded by the form engine. Still serving the live hand-coded form. |
| `send0-rezilta` | off | Legacy Send 0 results, superseded by `/ekip/#send0`. Kept so bookmarks work. |
| `paypal-create` | off | Pre-existing, from the donation flow. Not part of the form engine. |
| `paypal-webhook` | off | Pre-existing. Not part of the form engine. |

## Invariants that must not break

**Answer keys never reach a browser.** `strip()` in `f` deletes every `answer`
before a schema is served. If one leaks, the comprehension gate is decorative.

```bash
curl -s https://itnmcxemdpauemsnesln.supabase.co/functions/v1/f/send0 \
  | grep -c '"answer"'      # must be 0
```

**Approval controls live in Postgres, not here.** `siyen_apwobasyon()` plus a
trigger enforce sequence, separation of persons, finality and
rejection-ends-chain. A bug in `apwobasyon/index.ts` — or in a second client
written later — cannot release money on one signature. **Never move these rules
into application code.**

**Signatures bypass the text path.** The generic branch does
`String(v).trim().slice(0, 4000)`, which shredded signature data URLs. They are
validated as image data URLs and capped separately.

## Secrets

Set in the dashboard under Edge Functions → Secrets. None are in this repo.

| name | used by | if unset |
|---|---|---|
| `EKIP_USERS` | `ekip`, `apwobasyon` | falls back to hardcoded users in source |
| `RESEND_API_KEY` | `send0` | notification silently skipped, logged |
| `NOTIFY_TO` | `send0` | same |

`EKIP_USERS` is JSON and accepts two shapes per user:

```json
{
  "wbertil":  "plain-password",
  "dtillias": {"pass":"…","non":"Daniel Tillias","wol":["trezorye"]}
}
```

Roles gate which approval step you may sign. They never weaken separation of
persons: holding both roles still cannot sign one record twice.

## Deploying

Deployed via the Supabase MCP tools or the CLI. **Edit the file here first, then
deploy from it** — never the other way round.

Known problem: the `ekip` function is large enough that resending it inline
truncates. That is why the Approvals card is injected client-side in
`ekip/index.html` rather than coming from the API's module list. Split this
function before adding to it.
