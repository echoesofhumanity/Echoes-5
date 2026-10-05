# ECHOES TV — MASTER ARCHITECTURE

**Project:** Echoes of Humanity — Echoes-5  
**Status:** Master architecture / implementation specification  
**Repository:** echoesofhumanity/Echoes-5 — main only  
**Date:** 5 October 2026

> **Do not shout. Reveal.**  
> *Same world. Different rooms.*

## 1. Purpose and Product Definition

Echoes TV is not a video gallery and not an embedded third-party channel. It is the television layer of the Echoes Global Media Network: an owned, continuously operating internet television service capable of scheduled 24/7 playout, authenticated live takeover, on-demand viewing, multilingual distribution, permanent cultural archiving, sponsorship and ethical advertising.

The product principle is simple: a visitor who opens Echoes TV should feel that they have entered a real channel. If no live programme is running, the scheduled channel continues. If an authorised live contribution begins, LIVE takes over safely. When LIVE ends or fails, scheduled playout resumes without leaving the audience on a black screen.

### Core service modes
- **LIVE:** real-time broadcasts from authorised studios, presenters, correspondents or events.
- **24/7 CHANNEL:** scheduled linear television with programmes, interstitials, idents, promos and controlled breaks.
- **ON DEMAND:** programme, episode, documentary, interview, music and event catalogue.
- **THE LIVING ARCHIVE:** a curated long-term human and institutional memory, not merely a folder of old videos.

### Editorial identity
Echoes TV inherits the Echoes cinematic language: dark navy atmosphere, restrained turquoise light, human-scale imagery, calm motion, legible typography and deliberate negative space. It must never imitate noisy rolling-news television. The editorial rule is: **Do not shout. Reveal.**

## 2. Non-Negotiable Architecture Principles

- Echoes owns the primary audience destination, programme metadata, archive catalogue and operational control plane.
- Third-party platforms may be distribution outlets, never the sole home or single point of failure.
- Broadcasting, archive storage and the public website are separate layers.
- Live presenters never receive server/root credentials; they receive revocable broadcast identities and stream keys/tokens.
- Automatic fallback is mandatory.
- Every published asset must have rights, territory, language, accessibility and retention metadata.
- Advertising must be separated from editorial decisions and governed by Echoes ethics.
- Children and vulnerable people receive heightened editorial, privacy and advertising protections.
- Start with open-source/no-license-cost software; scale bandwidth, storage and CDN only when audience demand requires it.

## 3. Reference System Architecture

**CONTRIBUTORS / STUDIOS → OBS / ENCODER → SECURE INGEST (SRT/RTMP) → MEDIA SERVER → PLAYOUT/LIVE SWITCHING → HLS/WebRTC OUTPUT → HTTPS/CDN → ECHOES-5 PLAYER**

Parallel automation path:

**MEDIA LIBRARY → SCHEDULER → FFMPEG PLAYOUT → MEDIA SERVER**

Archive path:

**LIVE/PROGRAM RECORDINGS → PROCESSING → OBJECT STORAGE → ARCHIVE CATALOGUE → VOD PLAYER**

### Recommended open-source core
- **OBS Studio:** live production, scenes, graphics, recording and contribution encoding.
- **FFmpeg:** normalisation, transcoding, packaging, playout and derivatives.
- **MediaMTX:** SRT/RTMP ingest, HLS/WebRTC delivery, routing, recording hooks and APIs.
- **HLS:** primary broad-audience web delivery.
- **WebRTC:** selected low-latency experiences.
- **PostgreSQL / Supabase:** schedules, programmes, people, rights, campaigns, archive and operational state.
- **Caddy or Nginx:** HTTPS, routing and controlled public endpoints.
- **Echoes-5:** TV home, player, EPG, archive/VOD and multilingual UI.
- **S3-compatible object storage:** durable masters, derivatives, thumbnails and subtitles.

## 4. 24/7 Linear Channel and Playout

The linear channel is a clock-driven service. A playout service resolves the current schedule, prepares compatible media, inserts channel elements and continuously sends one coherent output to the media server.

Required capabilities:
- Daily/weekly timezone-aware schedule.
- Programme, episode, promo, ident, bumper, public-service message and advertising item types.
- Pre-flight validation for missing files, duration conflicts, unsupported codecs and rights windows.
- Automatic filler/branded slate for schedule gaps.
- Hard/soft starts where appropriate.
- Safe LIVE takeover and deterministic return-to-playout.
- Emergency slate and fallback playlist.
- Programme-as-run log showing what actually aired.

A controlled house media format must be adopted before launch. Initial delivery should favour H.264/AAC for broad compatibility, with adaptive bitrate renditions added as infrastructure matures.

## 5. LIVE Broadcasting and Global Presenter Network

LIVE is a governed broadcast workflow, not a shared stream key.

Presenter lifecycle:
1. Create presenter/studio identity.
2. Assign programme, ingest endpoint, validity window and permissions.
3. Issue revocable stream key/token.
4. Connect using OBS or approved encoder.
5. Validate source before air.
6. Mark LIVE ready.
7. Controlled takeover switches public channel.
8. Record and log programme.
9. On normal end or failure, fallback returns to scheduled output.
10. Credential expires or is revoked without affecting server access.

SRT is preferred for unreliable long-distance contribution where practical; RTMP remains useful for broad encoder compatibility. HLS is the mass-viewing delivery format; WebRTC is reserved for genuine low-latency needs.

LIVE safety requires preview/return monitoring, per-presenter authentication, source-loss monitoring where feasible, an authorised kill switch, permanent fallback readiness and rights-aware recording.

## 6. Echoes TV Control Room

Future Admin V3 TV must be a visual broadcast control room and require no code editing for routine operations.

Modules:
- **ON AIR Dashboard:** current programme, source health, bitrate, viewers, next item, alarms.
- **Schedule / EPG:** calendar and rundown management with conflict validation.
- **Live Desk:** readiness, preview, TAKE LIVE, RETURN TO AUTO, emergency controls.
- **Media Library:** upload, metadata, transcoding, thumbnails, captions and rights.
- **Programme Manager:** series, seasons, episodes, contributors, countries and languages.
- **Archive Manager:** preservation, catalogue, collections and retention.
- **Advertising & Sponsorship:** campaigns, creatives, placements, territories, frequency and reporting.
- **Presenter & Studio Access:** credentials, permissions, expiry and audit history.
- **Analytics:** concurrency, starts, watch time, completion and campaign delivery.
- **Operations:** server/stream/storage health, errors, audit log and incident timeline.

Roles: Super Admin, TV Director, Producer, Editor, Archivist, Ad/Sponsorship Manager, Presenter/Studio and Viewer.

## 7. Electronic Programme Guide (EPG)

Public TV must expose **NOW, NEXT, TONIGHT and FULL SCHEDULE**.

EPG records include programme/episode IDs, start/end, timezone/UTC, title, synopsis, category, age guidance, content warnings, language, subtitles/audio, LIVE/replay/premiere/repeat status, credits, country, VOD availability and rights/territory state.

## 8. The Living Archive

A virtual archive is mandatory and is a first-class Echoes product. It is separate from the hot broadcast disk and must survive server replacement.

Suggested collections: Humanity Stories, Documentaries, Interviews, Culture, Music, Children, Environment, Humanitarian Action, Echoes Originals, Live Sessions and Historical Record.

Where rights allow, preserve an archival master, VOD/mezzanine derivative, posters/thumbnails, subtitles/captions, transcripts and complete descriptive/rights metadata. Use checksums, redundant storage when affordable and lifecycle policies.

Search supports title, people, country, language, topic, date, series, episode and controlled keywords. Future semantic/AI discovery remains human-reviewable.

## 9. Advertising, Sponsorship and Revenue

Revenue must not turn Echoes TV into an indiscriminate ad network.

Inventory classes:
- **Echoes Partners:** institutional/corporate sponsorship.
- **Humanity Messages:** public-interest/NGO/social-purpose messages.
- **Commercial Partners:** paid campaigns passing Echoes eligibility and content rules.
- **Echoes Promos:** internal programmes, Academy, Marketplace, Merchandise and humanitarian initiatives.

Campaign data includes advertiser/sponsor, creative, dates, language, territory, programme/context, placement, frequency/impression limits and delivery status. Linear spots require proof-of-play/as-run reporting. Sponsorship must be labelled where required. Covert paid editorial placement is prohibited.

Children's programming and vulnerable audiences require stricter ad eligibility, consent, profiling and data-minimisation rules. Behavioural targeting is not the default business model.

## 10. Multilingual and Accessibility Architecture

Echoes TV is one global channel with multilingual access.

- Localised programme titles, synopses and editorial text.
- WebVTT/equivalent subtitle and caption tracks; SDH where available.
- Original audio retained; alternate dubbing/audio description can follow.
- RTL-safe Arabic.
- Accessible controls, keyboard support, focus visibility and screen-reader labels.
- Searchable captions/transcripts linked to programme records.
- English remains canonical/fallback under Echoes-5 policy unless programme context requires otherwise.

## 11. Public Echoes-5 TV Experience

Landing page:
- Cinematic **LIVE NOW** hero and one primary Watch Live action.
- NOW / NEXT.
- Tonight / Schedule.
- Echoes Originals.
- Latest from The Living Archive.
- Topic/country/language discovery.
- Editorially justified presenter/programme features.
- Clear LIVE/replay/on-demand distinction.

Player:
- Adaptive HLS.
- Captions/language controls.
- Current/next programme information.
- Intelligent reconnect.
- Low-bandwidth rendition when available.
- Future Chromecast/AirPlay/TV-device support.
- No autoplay with sound without user/platform permission.

A failed stream must never produce an unexplained black rectangle. Show a controlled Echoes slate, retry intelligently and recover automatically.

## 12. Distribution Strategy

Echoesofhumanity.org is the canonical home. External networks extend reach.

Primary distribution is the Echoes TV player/archive. Selected programmes may be simulcast to YouTube or approved networks. Social clips and trailers drive discovery back to canonical Echoes programme pages. Smart-TV/OTT applications follow only after web TV and metadata APIs are stable.

External platform policy changes must never erase the Echoes archive or break the primary channel.

## 13. Storage, Bandwidth and Scaling

Open-source software removes licence costs, not bandwidth/storage/transcoding costs.

Storage tiers:
- **Hot:** current playout and active recordings.
- **Warm:** recent VOD and popular programmes.
- **Archive:** durable masters in object storage.
- **Backup:** independent copy/versioning for irreplaceable assets and metadata.

Scale path:
1. Prototype — one controlled origin, limited audience, one/two renditions.
2. Launch — object storage, monitoring, backups and hardened ingest.
3. Growth — adaptive bitrate, CDN, transcoding workers and redundant origin.
4. International — multi-region delivery, failover origin, regional ingest and formal 24/7 operations.

An Always Free-class server can support engineering/pilot work but must never be treated as unlimited free global HD distribution.

## 14. Security and Reliability

- Separate public player endpoints from management endpoints.
- SSH/server access restricted to infrastructure admins.
- TLS everywhere practical.
- No secrets in repository or frontend JavaScript.
- Short-lived/revocable ingest credentials where practical.
- Least privilege and immutable audit events for critical actions.
- Rate limiting and abuse protection.
- Tested update/rollback procedure.
- Database/config backups and independent archive preservation.
- Health checks for ingest, playout, HLS, storage and playback.
- Incident, fallback and disaster-recovery runbooks.

## 15. Rights, Privacy and Editorial Governance

Every asset requires a rights state: owner/licensor, permitted uses, territories, dates, music/performance/third-party clearances, consent/release status, special minor/vulnerable-person handling, retention/deletion restrictions and audit history for corrections/takedowns/legal holds.

This architecture is not jurisdiction-specific legal advice. Copyright, advertising, broadcasting, privacy and child-protection obligations require review before commercial/public expansion.

## 16. Analytics and Measurement

Measure service quality and editorial usefulness without unnecessary surveillance:
- concurrent viewers, starts, watch time, completion and rebuffer/error rate;
- programme/archive performance;
- source/delivery health;
- privacy-safe aggregate geography/language/device data;
- campaign proof-of-play/delivery;
- data minimisation and retention limits.

## 17. Monitoring and Operations

Minimum telemetry: CPU/RAM/disk/network, ingest state/bitrate, playout heartbeat/current asset, HLS freshness, storage capacity/archive transfer and external public endpoint checks.

Broadcast logs must preserve scheduled rundown, as-run state, LIVE takeover/return, operator/source identity, campaign proof-of-play and incidents.

## 18. Suggested Echoes Originals

- **One Humanity**
- **Same World. Different Rooms.**
- **Voices Without Borders**
- **The Human Table**
- **Children First**
- **Echoes Sessions**
- **Humanity Response**
- **The Living Archive**

## 19. Implementation Roadmap

### Phase 0 — Specification lock
Approve architecture, editorial/rights/ad policies, naming/domain conventions and MVP scope.

### Phase 1 — Engineering pilot
Isolated TV server; MediaMTX/FFmpeg; OBS ingest; HLS; fallback slate; 2–4 hour scheduled playout proof.

### Phase 2 — 24/7 channel
Scheduler, rundown validation, idents/fillers, as-run logs, automatic fallback, monitoring and HTTPS.

### Phase 3 — LIVE takeover
Presenter identities, SRT/RTMP, preview/readiness, TAKE LIVE/RETURN AUTO, failure fallback, recording and audit.

### Phase 4 — Echoes-5 integration
TV landing page, player, NOW/NEXT, schedule, programme pages, multilingual UI and graceful failure states.

### Phase 5 — Living Archive / VOD
Object storage, upload/transcode pipeline, archive metadata, search/collections, captions/transcripts, rights gates and VOD.

### Phase 6 — Advertising and sponsorship
Eligibility policy, campaign manager, inventory/break rules, proof-of-play and reporting.

### Phase 7 — Admin V3 Control Room
Visual scheduling, LIVE desk, media/archive, presenters, campaigns, analytics, monitoring and role-based approvals.

### Phase 8 — Scale
ABR, CDN, redundant origin, multi-region contribution, disaster recovery and optional OTT/smart-TV applications.

## 20. MVP Acceptance Criteria

- Continuous channel survives defined soak test without manual intervention.
- Authorised OBS source can go LIVE and return to automation safely.
- LIVE loss triggers automatic fallback.
- NOW/NEXT reflects actual as-run state.
- Every aired programme has traceable metadata and rights state.
- Authorised programmes can be recorded, processed and archived/VOD published.
- Player supports captions and mobile layouts.
- No infrastructure secret exists in Echoes-5 frontend/repository.
- Logs identify what aired and when.
- Configuration/metadata backup and restore is tested.

## 21. Repository and Change-Control Rules

This specification belongs to **Echoes-5 main**. Backup repositories remain untouched. Admin V3 remains untouched until its dedicated phase.

Engineering discipline:

**WORKING VERSION → ONE CHANGE → TEST → COMMIT → NEW WORKING VERSION**

Before every implementation change, read current main HEAD and target files. No speculative patch chains. Do not create a fake stream endpoint merely to make the interface appear complete.

TV must not destabilise Radio. Radio and TV may share architecture principles, identity systems and later admin components, but media pipelines, ports, credentials, monitoring and failure domains remain explicitly separated.

## 22. Recommended Positioning

# ECHOES TV
## THE HUMAN CHANNEL

*One world. Millions of lives. One place to listen, witness and understand.*

## 23. Architecture Decision Summary

- Build an owned 24/7 linear channel with LIVE takeover, not a playlist page.
- Use open-source OBS + FFmpeg + MediaMTX as the initial broadcast core.
- Use HLS as primary audience delivery; add WebRTC selectively.
- Make The Living Archive a first-class product with durable object storage and rights metadata.
- Echoes-5 is the public television experience; future Admin V3 is the control room.
- External platforms provide reach, never sole archive/control.
- Ethical sponsorship/advertising uses governed inventory and proof-of-play.
- Scale costs progressively as real audience demand appears.
- Preserve the Echoes identity: calm, human, multilingual, accessible and accountable.
