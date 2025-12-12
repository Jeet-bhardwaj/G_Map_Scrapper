# Quick Start: Using Your Brave Browser Profile

## ⚠️ CRITICAL: Brave MUST be completely closed!

Your Brave browser locks the profile when it's running. You'll see "Not signed in" or "Person 1" if Brave is still running in the background.

## 🚀 Easy Way - Use the Script

```powershell
.\start-with-profile.ps1
```

Or double-click: `start-scraper.bat`

This script automatically:
1. Closes all Brave processes
2. Closes any Node processes
3. Waits 2 seconds
4. Starts the scraper with your profile

## 📋 Manual Way

### Step 1: Close ALL Brave Windows

**Method A - PowerShell Command:**
```powershell
Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Method B - Task Manager:**
1. Press `Ctrl+Shift+Esc`
2. Find ALL "Brave" processes
3. Right-click → End Task (do this for EVERY Brave process)
4. Check system tray (bottom-right) for hidden Brave icon

**Method C - Command Prompt:**
```cmd
taskkill /F /IM brave.exe
```

### Step 2: Verify Brave is Closed

```powershell
Get-Process brave -ErrorAction SilentlyContinue
```

If you see nothing → Brave is closed ✅
If you see processes → Brave is still running ❌ (repeat Step 1)

### Step 3: Start the Scraper

```powershell
npm run dev
```

Watch the logs - you should see:
```
[Scraper] 🦁 Using Brave Browser: C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe
[Scraper] 🦁 Attempting to use Brave profile: Default
[Scraper] ✅ Successfully launched with Brave profile
```

### Step 4: Test

1. Visit: http://localhost:3001
2. Enter: "Gym" in "Patna"
3. Click "Start Extraction"
4. Watch Brave open with YOUR logged-in Google account

---

## ✅ How to Verify It's Working

When Brave opens, you should see:
- ✅ Your Google profile picture (top-right)
- ✅ Your email/name instead of "Person 1"
- ✅ "Signed in" status
- ✅ Your browsing history/bookmarks

If you see "Person 1" or "Not signed in":
- ❌ Brave was still running
- ❌ Profile was locked
- Solution: Close Brave completely and try again

---

## 🎯 One-Line Command (Recommended)

```powershell
Get-Process brave -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2; npm run dev
```

This closes Brave, waits 2 seconds, then starts the scraper.

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
