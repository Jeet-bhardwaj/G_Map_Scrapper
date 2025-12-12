# Quick Start: Using Your Chrome Profile

## Before Each Scraping Session

### 1. Close All Chrome Windows

**Windows - Quick Method:**
```powershell
# Run this command to close all Chrome processes
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Or manually:**
- Close all Chrome browser windows
- Check system tray for hidden Chrome icon and close it
- Press `Ctrl+Shift+Esc` → Task Manager → End all "Google Chrome" tasks

### 2. Start the Scraper

```powershell
npm run dev
```

You should see:
```
[Scraper] Using Chrome profile: Default
[Scraper] Profile directory: C:\Users\bhard\AppData\Local\Google\Chrome\User Data
```

### 3. Run Your Scraping

- Visit http://localhost:3001
- The scraper will open Chrome with your logged-in Google account
- You'll have access to your Google Maps history, preferences, and logged-in state

---

## Configuration Options

### Use Guest Mode Instead

Add to `.env.local`:
```
USE_CHROME_PROFILE=false
```

### Use Different Chrome Profile

If you have multiple Chrome profiles:
```
CHROME_PROFILE_NAME=Profile 1
```

To find your profile names:
1. Open Chrome
2. Click your profile icon (top right)
3. See the profile name (e.g., "Default", "Profile 1", "Work")

---

## Common Issues & Solutions

### ❌ Error: "User Data Directory is already in use"

**Cause**: Chrome is still running

**Solution**:
```powershell
# Force close all Chrome processes
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

# Then restart scraper
npm run dev
```

### ❌ Error: "Cannot launch browser"

**Cause**: Chrome profile is locked or corrupted

**Solutions**:
1. Restart your computer
2. Or disable Chrome profile:
   ```
   USE_CHROME_PROFILE=false
   ```
   in `.env.local`

### ❌ Browser opens but doesn't navigate

**Cause**: Chrome profile may have pop-ups or extensions interfering

**Solution**: Disable extensions temporarily or use guest mode

---

## Benefits of Using Your Chrome Profile

✅ **Logged into Google** - Better access to Google Maps data
✅ **No CAPTCHAs** - Google recognizes your account
✅ **Saved Preferences** - Your Chrome settings preserved
✅ **Better Data** - Access to more complete business information
✅ **Fewer Blocks** - Less likely to be rate-limited

---

## PowerShell Commands Cheat Sheet

```powershell
# Check if Chrome is running
Get-Process chrome -ErrorAction SilentlyContinue

# Close all Chrome processes
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force

# Start scraper
npm run dev

# Restart scraper (close Chrome first)
Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force; npm run dev
```

---

## Production Deployment Note

⚠️ When deployed to Railway/Render/Vercel:
- Cloud servers don't have access to your local Chrome profile
- The scraper automatically uses guest mode in production
- This feature is **for local development only**

---

**Quick Workflow:**

1. Close Chrome: `Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force`
2. Start scraper: `npm run dev`
3. Open browser: http://localhost:3001
4. Start scraping with your logged-in Google account!

That's it! 🚀
