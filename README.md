# 🌸 Bloom — your life planner

Tasks with deadlines and rewards, goals (year → day), daily habits, water, sleep, exercise, meals, mood, weight, cycle tracking, a study timetable with Excel import/export, to-do lists, a YouTube + Instagram content pipeline, a startup ideas board, a bucket list, savings goals, people to keep in touch with, badges, levels and push reminders.

Everything runs on free services: **GitHub Pages** hosts the app, **Firebase** syncs your data and sends notifications, and **GitHub Actions** checks your reminders every 15 minutes.

The app works as soon as step 2 is done (data saved on that device only). Steps 3–6 add sync across devices and push reminders.

---

## What's in this folder

| File | What it does |
|---|---|
| `index.html`, `styles.css`, `app.js` | The app itself |
| `sw.js`, `manifest.json`, `icon-*.png` | Make it installable on your phone, work offline, and show notifications |
| `.github/workflows/reminders.yml` | The free 15-minute reminder timer |
| `scripts/notify.mjs` | Sends the reminders that are due |
| `firestore.rules` | Security rules so only you can see your data |

---

## Step 1 — Put the files on GitHub (5 min)

1. Sign in at github.com → **New repository** → name it `bloom` → choose **Public** → Create.
   (Public is needed for free GitHub Pages and unlimited free Action minutes. Only the code is public; your data lives in Firebase, locked to your Google account.)
2. Click **uploading an existing file** and drag in everything from this folder **except the `.github` folder** → **Commit changes**.
3. The `.github` folder is often hidden by computers, so create it by hand: **Add file → Create new file**, type the name `.github/workflows/reminders.yml` (the slashes create the folders), paste the contents of `reminders.yml`, and commit.

## Step 2 — Turn on GitHub Pages (2 min)

1. In the repo: **Settings → Pages**.
2. Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
3. After a minute your app is live at `https://YOUR-USERNAME.github.io/bloom/`. Open it — it already works.

## Step 3 — Create your Firebase project (10 min)

1. Go to console.firebase.google.com → **Create a project** → name it `bloom` → you can turn **off** Google Analytics → Create.
2. **Add a web app:** on the project home click the **`</>`** icon → nickname `bloom` → Register. Firebase shows a `firebaseConfig = { … }` block. **Copy the part from `{` to `}`** and keep it somewhere for step 5.
3. **Sign-in:** Build → **Authentication** → Get started → **Google** → Enable → pick your email → Save.
   Then Authentication → **Settings** → **Authorized domains** → Add domain → `YOUR-USERNAME.github.io`.
4. **Database:** Build → **Firestore Database** → Create database → location **asia-south1 (Mumbai)** → start in **production mode**.
   Open the **Rules** tab, replace everything with the contents of `firestore.rules`, and click **Publish**.
5. **Push key:** ⚙️ Project settings → **Cloud Messaging** tab → scroll to **Web Push certificates** → **Generate key pair**. Copy the long key for step 5.
6. **Key for the reminder sender:** ⚙️ Project settings → **Service accounts** → **Generate new private key** → a `.json` file downloads.
   ⚠️ Never upload this file to GitHub. It only goes into the secret in step 4.

## Step 4 — Give GitHub the reminder key (2 min)

1. In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: `FIREBASE_SERVICE_ACCOUNT`
3. Value: open the downloaded `.json` file in Notepad, copy **everything**, paste it → **Add secret**.
4. Then delete the `.json` file from your Downloads.

## Step 5 — Connect the app (2 min)

1. Open your app → **More → Settings → Sync across devices → Connect Firebase**.
2. Paste the config block from step 3.2 and the Web Push key from step 3.5 → **Save and reload**.
3. Tap **Sign in with Google**.
4. Under **Notifications**, tap **Turn on for this device** and allow.
5. Do steps 3–4 on every device you use (phone, laptop). Your data follows your Google account.

## Step 6 — Install it on your phone

- **Android (Chrome):** open the app link → ⋮ menu → **Add to Home screen / Install app**.
- **iPhone (Safari):** open the link → Share → **Add to Home Screen**. Open Bloom from the home screen icon, then turn on notifications in Settings (iPhone only allows notifications for home-screen apps).

## Test the reminders

1. Create a task with an **Extra reminder at a set time** about 20 minutes from now.
2. Or run it right away: GitHub repo → **Actions** tab → **Send Bloom reminders** → **Run workflow**. The log should say `sent 1 notification(s)` when something is due.

---

## Good to know

- **Reminder timing:** GitHub runs the checker every 15 minutes, sometimes a few minutes late. Good for deadlines and water breaks; not for exact alarms.
- **Rolling 30-day window:** routine and water reminders are planned 30 days ahead each time you open the app. Open Bloom at least once a month and they keep going.
- **Reward timer:** the "5 minutes left" alert for Instagram/YouTube time works while Bloom is open. If you close it, the time used is still counted when you come back.
- **Updating the app:** edit a file on GitHub and commit. Your phone gets the new version the next time it opens the app online.
- **Backups:** Settings → **Download backup** saves everything as a file. **Restore backup** brings it back.
- **Free limits:** Firebase's free plan allows 50,000 reads and 20,000 writes a day, and push messages are free. A single person's planner uses a small fraction of that.

## If something goes wrong

| Problem | Fix |
|---|---|
| Sign-in popup closes with an error | Check step 3.3: `YOUR-USERNAME.github.io` must be in Authorized domains. |
| "Missing or insufficient permissions" | The Firestore rules from step 3.4 weren't published. |
| Action log says `Missing FIREBASE_SERVICE_ACCOUNT secret` | Redo step 4; the secret name must match exactly. |
| Action runs but no notification arrives | Open Bloom on that device → Settings → **Turn on for this device** again. If the log mentions the FCM API, open console.cloud.google.com for your project and enable **Firebase Cloud Messaging API**. |
| No reminders on iPhone | Bloom must be opened from the home-screen icon (iOS 16.4 or newer). |
