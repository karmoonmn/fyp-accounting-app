# Debug Guide - Making "New Chat" Button Work

## Step 1: Check Browser Console

1. Open your app in the browser
2. Press **F12** to open Developer Tools
3. Go to the **Console** tab
4. Click on the **Chats** tab in your app sidebar
5. Look for this debug output:

```
ChatsPage mounted/updated: {
  firebaseUser: "abc123...",  ← Should show your Firebase UID
  userId: "abc123...",         ← Should be same as above
  supabaseConfigured: true,    ← Should be TRUE
  activeConvId: null,          ← Should be null when no chat selected
  conversationsCount: 0,       ← Number of existing chats
  messagesCount: 0
}
```

**If you see:**
- `firebaseUser: undefined` → You're not logged in with Firebase
- `supabaseConfigured: false` → Check your `.env` file has Supabase credentials
- Errors in console → Report them

## Step 2: Test "New" Button

1. Click the **"New"** button in the top-left of the Chats panel
2. Watch the console for these messages:

```
handleNewChat called, userId: abc123...
Creating conversation for user: abc123...
Conversation created: { id: "uuid-here", user_id: "abc123...", ... }
Created conversation ID: uuid-here
Active conversation set to: uuid-here
Focusing input, ref: <textarea>
```

**Expected Result:**
- The right panel should change from "AI Accounting Assistant" (center) to show the message thread with input box at bottom
- You should see "New conversation started" with quick prompt buttons
- The input box should be focused (cursor blinking)

**If it doesn't work:**
- What console logs do you see?
- Does the left panel show the new conversation?
- Copy any error messages

## Step 3: Test "Start New Chat" Button

1. The "Start New Chat" button is in the **center empty state** (when no conversation is selected)
2. Click it
3. Same flow as Step 2 should happen

## Step 4: Verify Database

1. Go to your **Supabase Dashboard**
2. Click **Table Editor**
3. Open the `conversation` table
4. You should see a new row with:
   - `id`: UUID
   - `user_id`: Your Firebase UID (string)
   - `created_at`: timestamp

**If you don't see a row:**
- Check for errors in console
- Check Supabase logs: Dashboard → Logs → Postgres Logs

## Common Issues & Fixes

### Issue: "Cannot create conversation: userId is null"

**Cause:** Firebase user not loaded or not logged in

**Fix:**
1. Check you're logged in (look for user profile in top-left of sidebar)
2. Try logging out and back in
3. Check `firebaseUser` in console: `console.log(firebaseUser?.uid)`

---

### Issue: "No data returned from insert"

**Cause:** Supabase RLS (Row Level Security) blocking the insert

**Fix:**
1. Go to Supabase Dashboard → Authentication → Policies
2. Check the `conversation` table policies
3. Temporarily disable RLS to test:
   ```sql
   ALTER TABLE conversation DISABLE ROW LEVEL SECURITY;
   ALTER TABLE message DISABLE ROW LEVEL SECURITY;
   ```
4. Try again

---

### Issue: Conversation created but input doesn't show

**Check console logs:**
- Does `Active conversation set to: uuid-here` appear?
- What is `activeConvId` in the debug output?

**Likely cause:** React state update not triggering re-render

**Quick fix:** Add this to console and share result:
```javascript
console.log('activeConvId:', activeConvId)
console.log('hasMessages:', hasMessages)
console.log('Render branch:', !activeConvId ? 'empty state' : 'thread view')
```

---

### Issue: Button click does nothing

**Check:**
1. Any console errors?
2. Does the button have a click handler?
3. Try adding `console.log('Button clicked!')` at the start of `handleNewChat()`

---

## Quick Test in Console

Paste this in browser console to test Supabase connection:

```javascript
// Check if Supabase is loaded
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)

// Check Firebase user
console.log('Firebase UID:', firebaseUser?.uid)

// Manual test: Create a conversation
const { data, error } = await supabase
  .from('conversation')
  .insert([{ user_id: 'test-user-123' }])
  .select()
  .single()

console.log('Manual insert result:', { data, error })
```

If this works, the button should work too.

---

## Next Steps

After clicking "New" or "Start New Chat":

1. **Copy all console output** and share it
2. **Take a screenshot** of what you see
3. Check **Supabase Table Editor** → `conversation` table for new rows

I'll help debug from there!
