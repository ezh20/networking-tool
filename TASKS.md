# TASKS

## Feature 1: Inline Message Editing

- [x] Task 1: Add `content` update support to the PATCH `/api/messages/[id]` route
- [x] Task 2: Add edit mode to OutreachCard in contact detail page — toggle between read-only and editable textarea, save via PATCH
- [x] Task 3: Add same edit mode to MessageCard in messages list page

## Feature 2: AI Tweak Button

- [x] Task 4: Add `tweakMessage()` function to `ai.ts`
- [x] Task 5: Add POST `/api/messages/[id]/tweak` route
- [x] Task 6: Add "Tweak" button + instruction input to OutreachCard and MessageCard

## Feature 3: Deep-link Send Buttons

- [x] Task 7: Add `email`, `phone`, `linkedinUrl` fields to Contact model (Prisma schema + migration)
- [x] Task 8: Add contact info editing to contact detail page + update PATCH `/api/contacts/[id]` route
- [x] Task 9: Build `getSendUrl()` utility — generates mailto:, imessage:, wa.me, or linkedin deep link
- [x] Task 10: Replace "Mark Sent" with "Send via..." button that opens the deep link, auto-marks as sent

## Feature 4: Contact Search & Filtering

- [x] Task 11: Add GET `/api/contacts` route with query params (q, platform, tag)
- [x] Task 12: Convert contacts page to client component with search bar, platform filter, tag filter

## Feature 5: Smart Import Dedup

- [x] Task 13: On import, deduplicate by (sender, timestamp, content) hash — only insert new messages

## Progress Log

- Tasks 1-3: PATCH route now accepts `content` field. Both OutreachCard and MessageCard have edit toggle with textarea + save/cancel.
- Tasks 4-6: `tweakMessage()` in ai.ts sends current message + instruction to Claude. New `/api/messages/[id]/tweak` route. Purple "Tweak with AI" button with inline input on both card types.
- Tasks 7-10: Added email/phone/linkedinUrl to Contact schema. Contact detail page has editable fields. `getSendUrl()` utility generates platform-appropriate deep links. "Send..." button shows options (Email, iMessage, WhatsApp, LinkedIn, Copy for WeChat) and auto-marks sent.
- Tasks 11-12: `/api/contacts` accepts `q`, `platform`, `tag` query params with Prisma filtering. Contacts page is now client-rendered with search bar, platform filter buttons, and tag filter chips.
- Task 13: Import route now queries existing messages per contact and builds a hash set of (sender, timestamp, content). Only inserts messages not already in the set.

## Summary

All 5 features implemented across 13 tasks. Build passes with zero errors.
