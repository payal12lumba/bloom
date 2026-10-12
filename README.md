# 🪷 Sankalpa — daily diary & planner

A private, installable daily diary built around one thing: **your day as an editable timeline.**

| Tab | What it does |
|---|---|
| **Today** | A zoomable day timeline. Grid of 5, 10, 15, 20, 30 or 60 minutes. Tap an empty line to add a block, hold-and-drag (or click-drag on a computer) to draw one, drag a block to move it, drag its top or bottom edge to resize, tap ✓ to finish it. Pinch or Ctrl+scroll to zoom. Blocks can repeat every day or on chosen days, have a colour, notes and a reminder. Day templates, copy yesterday, clear day are under ⋯. |
| **Diary** | Each day's page: daily chores (with reminders), mood, journal, three gratitudes, best moment, and an intention for tomorrow. "Past pages" and "a week / month / year ago today". |
| **Planner** | Week, month and year views with a calendar, plans with optional reminders, and a focus list + notes for each week, month and year. The lamp button holds **Vrat, festivals & weekly fasts**: Ekadashi, Purnima, Amavasya, Pradosh, Sankashti etc. are worked out from the moon automatically; weekly fasts, yearly festivals and chosen dates too. Reminders the evening before and on the morning. |
| **Body** | Daily check-in (mood, energy, sleep, water, flow, symptoms, weight), period tracking with cycle ring and predictions, 14-day trends. |
| **Money** | Monthly spent / came in / left, category bars with optional budgets, quick entries. |

Signing in, sync and push reminders work exactly as before (Firebase + the GitHub Action).

## Updating from the old Sankalpa
1. Upload these files to your repository, replacing the old ones. **Do not replace your filled-in `config.js`** — it isn't in this zip on purpose.
2. Leave `.github/workflows/reminders.yml` and `firestore.rules` as they are; nothing in them changes.
3. Open the app. On first sign-in your old data is converted: periods, festivals & vrat (Ekadashi dates merge into the automatic Ekadashi), money entries and categories, routine reminders (become chores), mood/sleep/water/weight, daily intentions (into diary pages) and planned day blocks. A full copy of the old data is kept — **Settings → Download data from the old Sankalpa**.

## Moon days
Tithis are calculated from the sun and moon positions at sunrise (default 6:15 am, change in Settings → Calendar & moon days). Panchangs follow different rules and can differ by a day; open the date in the Planner and choose **Not this day** or **Vrat on this day** to correct it.

## First-time setup (new copy)
Same as before: Public GitHub repo → upload files → Pages from `main` / root; Firebase web app, Google + Email sign-in, Firestore with `firestore.rules`, Web Push key in `config.js`, service-account JSON as the `FIREBASE_SERVICE_ACCOUNT` Actions secret. Install on Android from Chrome (⋮ → Add to home screen) or package with PWABuilder.
