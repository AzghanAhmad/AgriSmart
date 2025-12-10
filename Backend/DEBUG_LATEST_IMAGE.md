# 🔍 Debug Latest Scan Image Issue

## The Problem:
- First scan (oldest entry) image loads ✅
- Latest scan (newest entry) image does NOT load ❌

## Backend Order:
Entries are returned **newest first** (`order_by(desc(TimelapseEntry.date))`):
- `data.entries[0]` = **Latest** (newest) ← NOT LOADING
- `data.entries[data.entries.length - 1]` = **First** (oldest) ← LOADING ✅

## What I Changed:

### Frontend (`timelapse-view.tsx`):
1. ✅ Added `key` prop to both images to force re-render
2. ✅ Added detailed logging for both images
3. ✅ Made both images use identical format

### Next Steps to Debug:

1. **Check the console logs** when loading timelapse view:
   - Look for `✅ Timelapse data loaded:` - check the `firstEntry` and `lastEntry` URLs
   - Look for `📋 All entries:` - verify all entries have valid `photo_url`

2. **Check backend console** when accessing latest image:
   - Look for `📤 Serving static file:` messages
   - Check if the latest entry's image file actually exists

3. **Test the latest image URL directly in browser:**
   ```
   http://YOUR_IP:5000/static/uploads/timelapse/timelapse_XXXXX.jpg
   ```
   (Replace XXXXX with the actual filename from the console log)

4. **If the image file doesn't exist:**
   - The latest upload might have failed to save the image
   - Check `Backend/static/uploads/timelapse/` directory
   - Verify the file was created during upload

## Quick Fix to Try:

If the latest entry's `photo_url` is invalid or the file doesn't exist, we can add a fallback to use `highlighted_photo_url` or show a placeholder.

## Restart Required:
**NO RESTART NEEDED** - Frontend changes only. Just refresh the mobile app.

