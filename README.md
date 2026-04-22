# Expense Manager Pro

Comprehensive expense management system built with React, Vite, Tailwind CSS, and Firebase.

## Deployment to GitHub Pages

The "white screen" issue happens because GitHub Pages serves static files and does not automatically compile `.tsx` (TypeScript React) files.

### 1. Automatic Deployment
I have added a GitHub Action in `.github/workflows/deploy.yml`. When you push your code to the `main` branch, it will automatically build and deploy your app.

**To enable this:**
1. Go to your GitHub Repository.
2. Click on **Settings** -> **Pages**.
3. Under **Build and deployment** -> **Source**, select **GitHub Actions**.

### 2. Firebase Configuration (CRITICAL)
Your app will show a white screen or fail to log in if your GitHub Pages domain is not authorized in Firebase.

1. Go to your [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Go to **Authentication** -> **Settings** -> **Authorized domains**.
4. Click **Add domain** and add your GitHub Pages domain:
   - Example: `yourusername.github.io`
   - (Optional) Also add `yourusername.github.io/repo-name` if it's in a subfolder.

### 3. Environment Variables
If your app uses a Gemini API key or other secrets, you need to add them to GitHub:
1. Go to **Settings** -> **Secrets and variables** -> **Actions**.
2. Add a **New repository secret** called `GEMINI_API_KEY`.

## Features
- Real-time expense and income tracking.
- Multi-account support (Bank, Cash, Wallet).
- Budget limits and tracking.
- Business management (Clients, Staff, Ledger).
- Export to PDF and Excel.
- Light/Dark mode.
