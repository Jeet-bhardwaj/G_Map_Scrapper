## Chrome Profile Configuration

### Important Notes

**Profile Access Changed**: The scraper now uses your default Chrome profile instead of a guest session. This means:

✅ **Benefits:**
- Access to your logged-in Google account
- Better access to Google Maps data
- Fewer CAPTCHA challenges
- Maintains your preferences and cookies

⚠️ **Important Warnings:**

1. **Close Chrome Before Scraping**
   - You must close ALL Chrome browser windows before running the scraper
   - Chrome locks the profile when it's in use
   - If Chrome is open, you'll get a "User Data Directory is already in use" error

2. **Profile Location**
   - Windows: `C:\Users\[YourName]\AppData\Local\Google\Chrome\User Data`
   - macOS: `~/Library/Application Support/Google/Chrome`
   - Linux: `~/.config/google-chrome`

3. **Security Considerations**
   - The scraper uses your actual Chrome profile with your logged-in accounts
   - Only use this on your personal/trusted computer
   - Don't share your deployed version with others if using this feature

### How to Use

1. **Close all Chrome windows** (Important!)
2. Run the scraper: `npm run dev`
3. The scraper will use your default Chrome profile automatically
4. You'll see: `Using Chrome profile from: [path]` in the logs

### Troubleshooting

**Error: "User Data Directory is already in use"**
- **Solution**: Close ALL Chrome windows (check system tray too)
- **Alternative**: Use Task Manager to kill all Chrome processes

**Error: "Cannot find Chrome user data"**
- **Solution**: The scraper will fall back to guest mode automatically
- Check that Chrome is installed in the default location

**Want to use guest mode again?**
- Set environment variable: `USE_CHROME_PROFILE=false`
- Or modify `lib/scraper.js` to remove the `userDataDir` option

### Configuration Options

To disable Chrome profile usage, add to `.env.local`:
```
USE_CHROME_PROFILE=false
```

To use a different profile:
```
CHROME_PROFILE_NAME=Profile 1
```

### Production Deployment

⚠️ **For Railway/Render/Vercel:**
- Cloud platforms don't have access to your local Chrome profile
- The scraper automatically falls back to guest mode in production
- This setting only works for local development

---

**Current Status**: ✅ Using Default Chrome Profile
**Profile**: Default
**Mode**: Development (visible browser window)
