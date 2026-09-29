# ECHOES OF HUMANITY — ECHOES RADIO

## Master Broadcast Architecture & Development Roadmap

**LOCKED ROADMAP — v1.0 — 29 September 2026**

> *One humanity. One shared frequency.*

---

## 1. Executive Decision

Echoes Radio will be built as a real, scalable **24/7 internet radio service** inside the **Echoes Global Media Network** — not as a decorative audio player.

The first release will be deliberately small, while the underlying architecture will already support automated programming, live broadcasting, global presenters, podcasts, archives and future Admin V3 broadcast control.

---

## 2. Editorial Identity

Echoes Radio is an editorially curated humanist station. Music is an important part of the experience, but the station is not an algorithmic jukebox.

Its purpose is to create a shared global listening space built around:

- Human dignity
- Culture
- Learning
- Creativity
- Solidarity
- Authentic human voices

**Core principle:** the radio should feel like a living room of the digital civilization — calm, international, credible and unmistakably Echoes.

---

## 3. Broadcast Model

The station will operate continuously. When no presenter is live, an automation layer runs the scheduled station output. When an authorized presenter begins a live broadcast, **LIVE** takes over. When the live session ends, automation resumes without requiring the listener to change player or station.

| Layer | Purpose | Listener Experience |
|---|---|---|
| Radio Station | Single Echoes Radio identity and continuous channel | One station, one player |
| Automation / Live Engine | Schedules recorded content and accepts live takeover | Seamless transition |
| Portal Player | Plays the stream throughout Echoes | ON AIR / program / controls |

---

## 4. Portal Experience

The Radio card already created under Echoes Global Media Network remains the entrance. The Radio destination will be designed around broadcasting rather than a catalogue.

The interface will ultimately expose:

- **ON AIR** — station identity and current broadcast state
- **LIVE** or **AUTOMATED** state
- Current program title and presenter/producer
- Now Playing metadata
- Play / Pause and volume
- Up Next
- Today’s Schedule
- Programs
- Podcasts
- Archive

---

## 5. Content Families

### Echoes Music
Original Echoes works and music explicitly cleared for broadcast.

### Human Stories
Narrated and produced human stories.

### Voices of Humanity
Short voices and perspectives from around the world.

### Conversations
Interviews, dialogue and long-form conversations.

### Echoes Academy
Learning, ideas, culture and educational programming.

### Poetry & Literature
Poetry, prose and literary audio.

### Documentary Radio
Audio documentaries and field storytelling.

### Young Voices
Youth-created and youth-focused programming.

### World Windows
Countries, communities, languages and cultures.

### Special Broadcasts
Special Echoes events and editorial broadcasts.

### Podcasts
On-demand episodic series.

### Night Echoes
Quieter late-hour programming.

---

## 6. Live Broadcasting

The architecture will support real live broadcasting. Authorized presenters can ultimately connect from different countries using compatible broadcasting software or mobile/desktop workflows.

The public portal receives a single internet stream; presenters may change behind that stream without forcing listeners to reconnect.

**Important architectural boundary:** GitHub Pages remains the portal/interface host. It is not the 24/7 audio broadcast server. A dedicated streaming service or streaming server will be selected when the LIVE/automation phase begins.

---

## 7. Symphony and Radio Audio Policy

The portal symphony:

**Where Humanity Echoes**  
*A Contemporary Humanist Chamber Symphony*  
**Music by Efe**

remains the ambient identity of the portal.

Radio and symphony must never compete acoustically.

- Radio starts → symphony fades out.
- Radio stops → symphony may return only if the listener had previously left it enabled.
- No simultaneous playback.
- Transitions should be soft fades rather than abrupt cuts.

---

## 8. Persistent Listening

The target experience is continuous listening across the portal.

Once Radio is playing, navigating between Echoes pages should not unnecessarily interrupt the broadcast. A compact **ON AIR** state in the global interface will later expose the active station without turning every page into a radio page.

---

## 9. Podcast vs Radio

**Radio is shared time:** listeners receive the same scheduled or live channel at the same moment.

**Podcasts are on-demand:** listeners choose an episode and playback time.

Both belong to the Media Network, but their playback and editorial logic remain distinct.

---

## 10. Rights & Broadcast Governance

The initial music library should prioritize:

- Echoes originals
- Works for which Echoes has explicit broadcast permission
- Other material whose licensing terms have been verified for the intended territories and uses

Availability on a consumer music platform does **not** itself grant internet-radio broadcast rights. Rights, permissions, attribution and applicable reporting requirements must be verified before public broadcast.

Editorial access to LIVE broadcasting must be permission-based. A future broadcast policy should define presenter authorization, emergency stop capability, moderation, content standards, logging and archive rules.

---

## 11. Future Admin V3 Broadcast Control Room

**Admin V3 is not modified during the current Radio build.**

The future broadcast module should allow authorized staff to manage:

- Programs and recurring schedules
- Presenter / producer assignments
- Audio uploads and metadata
- Playlists and automation queues
- LIVE takeover and return-to-automation
- Now Playing information
- Podcast publishing
- Archive publishing
- Permissions and broadcast roles
- Operational logs

---

## 12. Locked Development Phases

### PHASE 1 — Radio Portal Foundation

Activate the existing Radio entry; create the Radio destination, player shell, ON AIR identity, program structure and initial Echoes content. No premature live-server complexity.

### PHASE 2 — 24/7 Automation

Introduce the continuous stream/automation engine, scheduled playlists/program blocks, metadata and resilient stream delivery.

### PHASE 3 — LIVE Broadcasting

Add authorized live input, LIVE takeover, return-to-automation, presenter identity and operational safeguards.

### PHASE 4 — Global Presenter Network

Enable scheduled presenters/producers in multiple regions, languages and time zones with a coherent global schedule.

### PHASE 5 — Admin V3 Broadcast Control Room

Connect professional broadcast operations to Admin V3: scheduling, media library, permissions, live controls, podcasts, archives and logs.

---

## 13. Engineering Discipline

**Echoes-5 `main` remains the only active working branch/repository for this implementation. Backup repositories and Admin V3 remain untouched until their explicitly scheduled phase.**

### Mandatory workflow

**WORKING VERSION → ONE CHANGE → TEST → COMMIT → NEW WORKING VERSION**

Rules:

- Read current `main` HEAD and target files before every change.
- Find the root cause before modifying working behavior.
- No guessing, patch chains or trial-and-error.
- Change only files relevant to the current operation.
- User validates the live GitHub Pages result after each commit.

---

## 14. Locked Product Principles

1. One station identity; multiple sources behind it.
2. 24/7 continuity is the target.
3. LIVE and automation are complementary, not separate stations.
4. Radio is editorial; it is not an algorithmic jukebox.
5. Music, spoken word, learning, culture and human stories coexist.
6. Radio and portal symphony never play simultaneously.
7. The architecture must scale without rebuilding the foundation.
8. Rights and editorial governance are first-class system requirements.
9. The public experience remains calm, cinematic and human — not dashboard-heavy.

---

## 15. Status

# ROADMAP LOCKED

This document is the baseline architecture for **Echoes Radio**. Changes to the core model should be deliberate architectural decisions, not incidental implementation changes.

---

**Echoes of Humanity**  
**Echoes Radio Master Roadmap — v1.0**