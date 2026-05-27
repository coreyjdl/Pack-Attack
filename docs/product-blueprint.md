# Pack Attack Blueprint

## Vision
A synced packing app for ADV and overland trips that works on Android and desktop, optimized for one to two users and fast prep before departure.

## Core UX
- Workflowy-style nested navigation for infinite drill-down (list -> section -> kit -> item)
- Quick check/uncheck interactions with swipe actions on Android
- Lean outdoorsy minimalist UI with low visual noise
- Offline-first local store with sync reconciliation when online

## MVP Features (borrowed from top travel/hike packing apps)
- Reusable templates per trip type (weekend ADV, 5-day overland, winter camp)
- Categories and section totals (count, base weight, packed percentage)
- Smart suggestions based on weather, trip length, and region presets
- Duplicate from previous trip list
- Item notes and wear/replacement reminders
- Consumable tracking (fuel canisters, meds, water tabs)
- Per-item links (product page, replacement links, manuals)
- Photo attachments for items and kits
- Share list with one collaborator

## ADV/Overland-Specific Features
- Bike-specific modules (tool roll, spares, tire repair, fluids)
- Recovery gear module (straps, shackles, compressor)
- Route-day kits (Day 1, Day 2, contingency)
- Dry bag and pannier mapping (where each item physically lives)
- FAK at high level with nested internals

## FAK Model
- First level shows only top-level FAK summary card and readiness score
- Tap into FAK to show sections (Trauma, Wound Care, Meds, Burn, Other)
- Tap section to see item-level checklist with expiry date fields

## Kitting Model
- Kits are reusable containers with nested child items
- Items can exist standalone or inside kits
- Pack state can roll up from item -> kit -> category

## Suggested Future Features
- Barcode/QR scan to quickly add or verify stocked items
- Weight and bulk optimization views
- "Missing criticals" alert banner before trip start
- Seasonal auto-pack profiles
- Voice quick add while in garage

## Sync Architecture
- Client-first data store with eventual sync
- Suggested stack: SQLite/WatermelonDB (mobile) and IndexedDB/SQLite (desktop) + Supabase for auth/sync
- Optimistic writes with conflict policy: latest edit wins + audit trail for shared lists

## Navigation Sketch
- Home
  - Lists
    - List Detail
      - Sections
        - Kits
          - Items
      - FAK
        - Sections
          - Items
      - Attachments

## Design Direction
- Earthy neutrals, muted greens, utility orange accent
- Compact typography and generous spacing
- Minimal icon set focused on readability outdoors
