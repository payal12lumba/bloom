# 🪷 Sankalpa — goals, routine & sadhana

A private, installable life planner: focus goals and weekly priorities, tasks and a drag-and-drop day planner, study timetables, Excel-style **Sheets**, content planning per platform, money (income, expenses, budgets, savings), My Spaces (sadhana, self-care, hobbies), health and cycle tracking, festivals & vrat, weekly review, rewards, streaks and push reminders.

Everyone signs in with **Google or email**. Each account gets its own fresh, private planner. Nobody can see anyone else's data.

**Everything is free:** GitHub Pages (hosting), GitHub Actions (reminder timer), Firebase Spark plan (sign-in, database, push). Keep this repository **Public** — Actions minutes are unlimited for public repos.

## What's new in this version
- **Sage & peach look** with an optional **Twilight plum** theme (Settings → Appearance), and an animated lotus background (petals, glowing orbs) you can switch to still.
- **Today = four big cards:** Focus goal 1, Focus goal 2, Tasks today, Health. Below them: Study + Startup today, priorities, next up and the rest.
- **Study + Startup schedule** (Today → Study + Startup): weekly blocks with times, reminders, weekly hour targets, overlap warnings and tick-off per day. Blocks also appear on the Timeline and Calendar.
- **Editable Calendar** (Today → Calendar): tasks, festivals and vrat, content posting dates. Tap a day to add, edit or move items.
- **Merged pages:** Startup ideas + Bucket list + Watch later → *Someday* (Plan); Rewards + Insights → *Progress* (profile menu).
- Removed: Life phase pill and the timetable Excel import button.

---

## What's in this repository

| File | Purpose |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app |
| `config.js` | Your Firebase settings (fill in once) |
| `sw.js`, `manifest.json`, `icon-*.png` | Installable app, offline support, notifications |
| `.github/workflows/reminders.yml` | Sends due reminders every 15 minutes (the sender script is inside this file) |
| `firestore.rules` | Security rules — each person can only read their own data |

---

## 1. Put it on GitHub
1. Create a **Public** repository (e.g. `bloom` or `sankalpa`).
2. **Add file → Upload files** → drag in everything from this folder **except `.github`** → Commit.
3. **Add file → Create new file** → name it `.github/workflows/reminders.yml` → paste the contents of that file → Commit.
4. **Settings → Pages** → Deploy from a branch → `main` / `(root)` → Save. Your app is at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## 2. Firebase (one time)
In console.firebase.google.com → your project:
1. **Add a web app** (`</>` icon) and keep the `firebaseConfig` values.
2. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains:** add `YOUR-USERNAME.github.io`.
4. **Firestore Database → Create database** (Standard, production mode). **Rules** tab → paste `firestore.rules` → **Publish**.
5. **Project settings → Cloud Messaging → Web Push certificates → Generate key pair** (this is the VAPID key).
6. **Project settings → Service accounts → Generate new private key** → a `.json` file downloads (keep it private).

## 3. Fill in `config.js`
Edit `config.js` on GitHub and replace every `PASTE_…` value (apiKey, appId, VAPID key; check projectId, authDomain, messagingSenderId). Commit. Every device then connects automatically.

> GitHub may email "secret detected" for the apiKey. That's expected — Firebase web keys are public by design. Optional: in Google Cloud Console → APIs & Services → Credentials, restrict the browser key to `YOUR-USERNAME.github.io/*` and `YOUR-PROJECT.firebaseapp.com/*`.

## 4. Reminder sender
1. Repo **Settings → Secrets and variables → Actions → New repository secret**: name `FIREBASE_SERVICE_ACCOUNT`, value = the entire service-account `.json` file. Then delete the file from your computer.
2. **Actions → Send Sankalpa reminders → Run workflow.** A green ✓ means it works. In the app, **Settings** shows "✅ Reminder sender is running".
3. Don't want Actions emails? github.com/settings/notifications → Actions → untick Email.

## 5. Install on Android
**From Chrome:** open the app link in Chrome → ⋮ → **Add to home screen → Install**.

**As an APK:** pwabuilder.com → paste the app link → **Package for stores → Android** → in *All settings* set the package ID (e.g. `com.yourname.sankalpa`), keep **Notification delegation** enabled → Generate. Keep `signing.keystore` and `signing-key-info.txt` safe (needed for future APK updates). Share the `.apk` via Google Drive.

**Hide the address bar in the APK:** create a public repo named exactly `YOUR-USERNAME.github.io`, add `.well-known/assetlinks.json` (from the PWABuilder zip) and an empty `.nojekyll` file, enable Pages, then clear the app's storage once.

## 6. Notifications blocked on Android?
Allow in all three places, then reopen the app → **Settings → Notifications → Turn on for this device → Send a test**:
1. Phone **Settings → Apps → Sankalpa → Notifications → On** (and every category).
2. Phone **Settings → Apps → Chrome → Notifications → On**.
3. **Chrome → ⋮ → Settings → Site settings → Notifications** → your site under *Blocked* → **Allow** (turn off "quieter messaging").

Also set **Battery → Unrestricted** for Sankalpa and Chrome.

## Updating
Upload changed files to GitHub. Everyone's app (web, installed, APK) updates on its next open — no reinstall. Only a new app **name, icon or package ID** needs a new APK (signed with the same key). Never overwrite your filled-in `config.js` with the blank template.
