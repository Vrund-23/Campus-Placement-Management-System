# Troubleshooting: Blank Page After Login

## Issue
After entering student credentials and clicking login, a blank page is shown.

## Diagnostic Steps

### Step 1: Check Browser Console (Most Important!)

1. Open browser Developer Tools (Press F12)
2. Go to the **Console** tab
3. Look for:
   - Red error messages
   - `[AuthContext]` log messages
   - Any JavaScript errors

**Expected logs**:
```
[AuthContext] Logging in...
[AuthContext] Login response: {token: "...", user: {...}}
[AuthContext] Fetching user data...
[AuthContext] Dashboard response: {...}
[AuthContext] Setting user: {...}
```

If you see errors here, take a screenshot and share them.

### Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Filter by "Fetch/XHR"
3. Look for these requests after clicking login:
   - `POST /auth/login` - Should return 200 OK
   - `GET /dashboard` - Should return 200 OK
   - `GET /students/me` - May return 200 or 404
   - `GET /applications/me` - May return 200 or empty array
   - `GET /jobs` - Should return 200 with jobs list

**Click on each request** and check:
- **Status code** (should be 200 or 404)
- **Response** tab to see what data was returned

### Step 3: Check if Login Worked

Open browser console and type:
```javascript
localStorage.getItem('token')
```

- If it returns a long string: ✅ Login worked, token saved
- If it returns `null`: ❌ Login failed, token not saved

### Step 4: Test Backend Directly

Run this command in your server folder:
```bash
node database/debug_login_flow.js
```

This will test if the backend is working correctly.

---

## Common Issues and Fixes

### Issue 1: "name" field missing
**Symptom**: Blank page or "Welcome back, undefined!"
**Fix**: The dashboard.js file has been updated to include the name field

### Issue 2: CORS error
**Symptom**: Console shows "CORS policy" error
**Fix**: Backend CORS is already configured, restart the backend server

### Issue 3: Student profile not found
**Symptom**: "Profile not found" message
**Solution**: Run the seed script:
```bash
cd server
node database/seed_sample_data.js
```

### Issue 4: API endpoint 500 error
**Symptom**: Network tab shows 500 Internal Server Error
**Fix**: Check server terminal for error messages

### Issue 5: Page stuck on "Loading..."
**Symptom**: Spinner/loading state never ends
**Possible causes**:
- API calls are hanging
- fetchStudentData never completes
- Check network tab for pending requests

---

## Quick Fixes to Try

### Fix 1: Clear Browser Cache
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page (F5)

### Fix 2: Clear localStorage
Open browser console and run:
```javascript
localStorage.clear()
location.reload()
```
Then try logging in again.

### Fix 3: Restart Both Servers
Stop both servers (Ctrl+C) and restart:

**Terminal 1 (Backend)**:
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend)**:
```bash
cd client
npm run dev
```

Wait for both to fully start, then try again.

### Fix 4: Force Re-seed Database
```bash
cd server
npm run db:init
node database/seed_sample_data.js
```

---

## Debug Mode

### Enable Console Logging

The AuthContext now has extensive logging. After login, you should see:

```
[AuthContext] Logging in...
[AuthContext] Login response: {token: "...", user: {...}}
[AuthContext] Fetching user data...
[AuthContext] Dashboard response: {user_id: 2, email: "...", name: "Student", ...}
[AuthContext] Setting user: {...}
```

### Access Debug Page (Optional)

Add this route to App.tsx:
```typescript
<Route path="/debug" element={<DebugPage />} />
```

Then visit: http://localhost:8080/debug

---

## What to Check

1. ✅ Backend running on http://localhost:5000
2. ✅ Frontend running on http://localhost:8080
3. ✅ No errors in server terminal
4. ✅ No errors in browser console
5. ✅ Login returns a token
6. ✅ Dashboard API returns user data with "name" field
7. ✅ Student profile exists in database

---

## Expected Behavior

After clicking "Sign In":

1. Login API call goes to backend
2. Backend validates credentials
3. Backend returns JWT token
4. Frontend saves token to localStorage
5. Frontend calls /dashboard to get user data
6. User data is set in AuthContext
7. Page redirects to /dashboard
8. Dashboard component loads
9. Dashboard fetches student profile, applications, jobs
10. Dashboard displays data

If any step fails, you'll see a blank page or error.

---

## Test Login Manually

Run in browser console after page loads:
```javascript
// Test if API is accessible
fetch('http://localhost:5000/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'student@campus.edu',
    password: 'password123'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

You should see: `{token: "...", user: {...}}`

---

## Get Help

If none of these work, please provide:
1. Screenshot of browser console (F12 > Console tab)
2. Screenshot of network tab showing API requests
3. Any error messages from server terminal
4. Output of: `node database/debug_login_flow.js`

This will help identify the exact issue!
