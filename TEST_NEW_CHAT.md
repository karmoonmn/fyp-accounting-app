# Test: New Chat Button - Quick Checklist

## Before You Start

1. **Restart your dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open browser with console:**
   - Press F12
   - Go to Console tab
   - Clear it (click 🚫 icon)

---

## Test 1: "Start New Chat" Button (Center)

**Steps:**
1. Go to sidebar → Click **"Chats"**
2. You should see empty state in center: "AI Accounting Assistant" + "Start New Chat" button
3. Open console (F12)
4. Click **"Start New Chat"**

**Expected Console Output:**
```
ChatsPage mounted/updated: {...}
handleNewChat called, userId: <your-firebase-uid>
Creating conversation for user: <your-firebase-uid>
Conversation created: { id: "...", user_id: "...", created_at: "..." }
Created conversation ID: <uuid>
Active conversation set to: <uuid>
Render state: { activeConvId: "<uuid>", hasMessages: false, willShowQuickPrompts: true, ... }
Focusing input, ref: <textarea element>
```

**Expected UI Change:**
- ✅ Right panel changes from center empty state to full chat view
- ✅ Header shows "AI Accounting Assistant" with timestamp
- ✅ Center shows: "New conversation started" text
- ✅ Four quick prompt buttons (📊, 📋, 🔮, 📄)
- ✅ Input box appears at bottom with file upload and send buttons
- ✅ Cursor is in the input box (blinking)
- ✅ Left panel shows new conversation "AI Chat • just now"

---

## Test 2: "New" Button (Top-Left)

**Steps:**
1. If you completed Test 1, click on the conversation in left panel to select it
2. Click the **"New"** button (green button, top-left of left panel)

**Expected:**
- Same as Test 1 - creates a fresh conversation
- New conversation appears in left panel

---

## Test 3: Send a Message

**Steps:**
1. With a new conversation active, type: `Hello`
2. Press Enter or click send button

**Expected:**
- Message appears in thread
- AI responds
- Both messages saved to Supabase

---

## If Nothing Happens

**Check console for errors. Likely issues:**

### 1. `userId is null` or `undefined`

**Problem:** Not logged in with Firebase

**Fix:** 
- Log out and log back in
- Check top-left of sidebar - do you see your profile?

---

### 2. `Failed to create conversation` + Supabase error

**Problem:** Database permissions (RLS)

**Fix:** Go to Supabase Dashboard → SQL Editor, run:
```sql
ALTER TABLE conversation DISABLE ROW LEVEL SECURITY;
ALTER TABLE message DISABLE ROW LEVEL SECURITY;
```

---

### 3. No console logs at all

**Problem:** JavaScript error blocking execution

**Fix:**
- Look for red errors in console
- Share the error message

---

### 4. Conversation created but UI doesn't change

**Check the console for:**
```
Render state: { ... }
```

**Look at these values:**
- `activeConvId`: Should be a UUID string (not null)
- `willShowEmptyState`: Should be `false`
- `willShowQuickPrompts`: Should be `true`

If `activeConvId` is still `null`, there's a state update issue.

**Quick Fix Test:** Click on the conversation in the left panel. Does it open?

---

## What Should Work After Successful Test

1. ✅ Click "New" → Chat area appears with input
2. ✅ Type message → AI responds
3. ✅ Refresh page → Conversation still in list
4. ✅ Click conversation → Previous messages load
5. ✅ Click "New" again → Fresh conversation created
6. ✅ Delete button (🗑️) → Conversation removed

---

## Share With Me

If it's not working, copy-paste:

1. **Full console output** after clicking "New"
2. **Screenshot** of what you see
3. **Answer these:**
   - Do you see the new conversation in left panel?
   - When you click the conversation in left panel, does it open?
   - What is your Firebase UID? (check console: `firebaseUser?.uid`)

This will help me debug!
