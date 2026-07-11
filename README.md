# AURA VILLA

An ultra-luxury real estate and high-end villa/apartment rental website prototype for HNWIs, VIPs, and international investors.

## What is included

- Cinematic homepage with lifestyle-first search
- Advanced residence catalog with lifestyle, destination, privacy, and currency controls
- Split catalog/map experience
- Luxury property narrative section with media, specs, and floor plan preview
- VIP concierge booking and private advisor drawer
- Owner's Vault dashboard preview
- 3-property comparison drawer using luxury metrics
- Firebase-ready Auth and Firestore data layer
- Admin dashboard for adding, editing, deleting, and publishing units
- Mobile-first responsive styling and reduced-motion support

## Open locally

Open `index.html` directly in a browser. No install step is required.

## Firebase setup

1. Create a Firebase web app and enable Authentication with Email/Password.
2. Create the admin Auth user using the email in `firebase-config.js` and password `Admin123456`.
3. Paste your Firebase web app keys into `firebase-config.js`.
4. If you change the admin email, update both `firebase-config.js` and `firestore.rules`.
5. Deploy rules/hosting with Firebase CLI when ready:

```bash
firebase deploy
```

Collections used by the site:

- `properties` - unit data managed from `admin.html`
- `siteSettings/main` - global site settings
- `users` - registered client profiles
- `rentalRequests` - submitted private viewing and rental requests

If Firebase config is still placeholder text, the project uses browser local storage so the UI can be previewed offline.

## Files

- `index.html` - full site structure
- `styles.css` - luxury UI system and responsive layout
- `app.js` - filtering, currency conversion, comparison, drawers, and reveal interactions
- `firebase-config.js` - Firebase web app keys and admin email mapping
- `firebase-service.js` - Auth, Firestore CRUD, site settings, and request submission
- `admin.html` / `admin.js` - internal control room for unit and site management
- `auth.html` / `auth.js` - login, registration, and protected access workflow
- `firestore.rules` / `firebase.json` - Firebase deployment configuration
- `assets/` - generated project visuals
