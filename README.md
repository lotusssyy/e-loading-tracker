# E-Loading Sales Tracker

A simple static Progressive Web App for tracking e-loading sales.

## Features
- Add sales with promo name, price, payment status, customer name, and notes
- Automatic timestamp on every entry
- Daily sales chart
- Paid vs unpaid chart
- Search and filter records
- Toggle payment status
- Delete entries
- Export and import JSON backups
- Installable on phone as a PWA
- Free deployment on GitHub Pages

## Files
- `index.html` - main app page
- `styles.css` - app styling
- `app.js` - app logic
- `manifest.webmanifest` - PWA manifest
- `sw.js` - service worker

## How to deploy on GitHub Pages
1. Create a new GitHub repository.
2. Upload all files from this folder.
3. Go to **Settings** > **Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder.
6. Save.
7. Wait for GitHub to publish your site.
8. Open the published link on your phone and use **Add to Home Screen**.

## Notes
- Data is stored in the browser on the device.
- If you clear browser storage or switch devices, the data will not automatically sync.
- Use **Export JSON** to create backups.
