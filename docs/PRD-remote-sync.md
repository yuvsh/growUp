# PRD: GrowUp — Optional Remote Sync (Accounts + Cloud Backup)

> **Version:** 1.0 · **Date:** 2026-06-11 · **Status:** Draft
> **Complements:** docs/PRD.md (MVP). This document covers the Phase-2 "remote storage" capability only.
> **Decisions locked:** Supabase backend · Google sign-in only · managed security (RLS) · remote = source of truth, online · local-only stays the private default.

---

## 1. Problem Statement

Today GrowUp stores everything in the browser's `localStorage`. That is maximally private (nothing leaves the device, no account) but fragile: clearing the browser wipes months of weight history, and the data can't be opened on a second device (e.g. the other parent's phone, or a new phone). Some parents of FTT/IUGR infants want a safety net and multi-device access; others, given this is sensitive infant health data, want it to **never** leave their device. We must serve both without forcing either group to compromise.

---

## 2. Product Overview

Add an **optional, account-based remote sync** powered by Supabase. During onboarding the parent explicitly chooses how their data is stored:

- **On this device (private)** — exactly as today: no account, fully offline, nothing transmitted. *Default.*
- **Sync to my account** — sign in with Google; their children, weights, and feeding settings are stored in a private Supabase database row-secured to their account, accessible from any device they sign in on.

The choice is shown with a plain-language privacy explanation, can be **changed later in Settings**, and switching from local → sync **offers to upload** the data already on the device. Remote mode is **online** (those actions need a connection); local mode remains fully offline.

---

## 3. Target Users

Same primary user as the MVP (parent of an FTT/IUGR infant), now split by preference:
- **Privacy-first** — keeps data on device; never creates an account.
- **Backup / multi-device** — wants their history safe and reachable on more than one phone, and trusts a reputable managed provider with row-level isolation.

Both are stressed and non-technical; the choice and its trade-offs must be explained calmly and clearly.

---

## 4. Value Proposition

| We are better because... |
|---|
| **Real choice, not a default-on cloud.** The parent decides; private-by-default is preserved. |
| **Backup + multi-device** for those who want it, without a password to manage (one-tap Google sign-in). |
| **Per-user isolation** — Row-Level Security means only the signed-in owner can read their rows; plus TLS, encryption at rest, and the ability to export or delete everything. |
| **No lock-in to the cloud** — data can be exported, and the local option is always available. |

---

## 5. User Stories & Flows

Priority: **Must / Should / Could**. New prefix **SYNC-**.

### Epic: Storage-mode choice (onboarding)

#### Happy path
1. New parent opens the app → welcome + disclaimer.
2. A **storage choice** step: "Keep on this device (private)" vs "Sync to my account". Each option states the trade-off in plain language.
3. **On device** → continue to "Add your baby" (today's flow, no account).
4. **Sync** → Google sign-in → on success, continue to "Add your baby"; data is stored remotely from here on.

> Edge cases: sign-in cancelled/failed → stay on the choice step with a calm message, local still available. Offline while choosing sync → explain sync needs a connection; offer local for now.

**SYNC-1** · Must — As a new parent, I want to choose at onboarding whether my data stays on this device or syncs to my account, so that I control my baby's data from the start.
- [ ] Onboarding presents both options with a clear privacy explanation
- [ ] "On device" proceeds with no account (today's behavior)
- [ ] "Sync" requires Google sign-in before proceeding
- [ ] The chosen mode is remembered

### Epic: Account & Google sign-in

**SYNC-2** · Must — As a parent, I want to sign in with Google, so that I can access my data without managing a password.
- [ ] Google is the only sign-in method
- [ ] Successful sign-in establishes a session that persists across app reloads
- [ ] Sign-out is available (returns to a signed-out state; see mode handling below)
- [ ] Auth errors are shown in calm, plain language

### Epic: Remote data sync

**SYNC-3** · Must — As a synced parent, I want my children, weights, and feeding settings saved to my account, so that they're backed up and available on my other devices.
- [ ] All create/read/update/delete for children, weights, and feeding configs go to the remote database when in sync mode
- [ ] Data is isolated to the signed-in account (no parent can ever see another's data)
- [ ] Signing in on a second device shows the same data
- [ ] Remote actions require a connection; failures show a calm retry message (no silent data loss)

### Epic: Migration & switching modes

**SYNC-4** · Should — As a parent who started local, I want to move my existing data to my account when I switch to sync, so that I don't lose my history.
- [ ] Switching local → sync offers to upload the data already on the device
- [ ] After a confirmed upload, the same data is visible when signed in
- [ ] The user is told clearly what will be uploaded before it happens

**SYNC-5** · Should — As a parent, I want to change my storage choice later in Settings, so that I'm not locked into the onboarding decision.
- [ ] Settings shows the current mode and lets the user switch
- [ ] Switching sync → local explains what happens to the cloud copy (kept until deleted vs removed — see open questions)

### Epic: Privacy controls (remote)

**SYNC-6** · Should — As a synced parent, I want to export and delete my data, so that I stay in control of my baby's health information.
- [ ] "Export my data" downloads everything (e.g. JSON)
- [ ] "Delete my account & data" permanently removes all remote rows and the account, with a clear confirmation
- [ ] A short, plain-language privacy notice explains where data is stored, who can read it, and these rights

---

## 6. Screen Inventory (additions)

| Screen / surface | Epic | Purpose |
|---|---|---|
| Onboarding — storage choice step | Storage-mode choice | Pick local vs sync with privacy explanation |
| Google sign-in (button / redirect handling) | Account | Authenticate for sync |
| Settings — Storage & Privacy section (in Profile) | Switching / Privacy | Show mode, switch, export, delete account |
| Migration prompt (modal) | Migration | Confirm uploading local data on switch to sync |
| Signed-out / re-auth state | Account | Prompt to sign back in when a session expires in sync mode |

---

## 7. Scope

### In scope
- Onboarding storage choice (local vs sync) + changeable in Settings.
- Google-only sign-in via Supabase Auth.
- Remote CRUD for children / weights / feeding configs with Row-Level Security (owner-only).
- Remote = source of truth, online; local stays fully offline.
- Local → remote migration (upload existing data).
- Export data + delete account & data; plain-language privacy notice.

### Out of scope (deferred)
- **Offline-first sync / conflict resolution** — remote mode is online for now.
- **End-to-end encryption** — using managed security (RLS + at-rest + TLS) for v1.
- **Sharing with a co-parent / caregiver** — single owner per account for now.
- **Other sign-in methods** (email/password, Apple) — Google only.
- **Length/head-circ and other future data types** — they inherit the same model when added.

---

## 8. Success Metrics

Qualitative (no analytics collected): a privacy-first parent can complete onboarding and use the app with **zero** network calls; a backup-minded parent can sign in with Google, see their data on a second device, migrate their local history, and export or delete it. Success = both paths work and the privacy choice is honored exactly.

---

## 9. Constraints & Compliance

- **Sensitive data:** infant health data; the privacy notice and isolation guarantees are product requirements, not nice-to-haves.
- **GDPR-style rights:** export + delete must exist for synced data.
- **Connectivity:** remote actions require a connection; the app must degrade calmly, never lose in-progress input.
- **Cost:** target Supabase free tier at this scale.
- **Local mode unchanged:** the existing offline, no-account experience must remain a first-class default.

---

## 10. Resolved Decisions

- **Region / data residency:** **EU** Supabase project (GDPR-friendly; infant health data kept in the EU).
- **Switching sync → local:** **keep the cloud copy** (until the user explicitly deletes it) and **copy it down** to the device. No accidental loss.
- **Signing in on a device that already has local data:** **prefer the account's data**, and **offer once** to also upload this device's local data. No silent merges.
- **Session expiry in sync mode:** show a **re-auth prompt**; never expose another account's or stale data.

*(All four core decisions — Supabase, Google-only sign-in, managed security/RLS, remote-as-source-online — confirmed with the user.)*

---

## Next Steps
See **docs/HLD-remote-sync.md** for the technical design (Supabase schema, RLS, repository swap, auth, migration).
