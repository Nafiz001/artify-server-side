# 🚀 Artify Deployment Guide

## Current Status ✅
- [x] Firebase Hosting setup
- [x] Firebase Deploy completed  
- [x] Firebase Authentication configured
- [x] Vercel CLI installed

---

## 📋 Next Steps to Complete Deployment

### **Step 1: Prepare Server for Production** 🔧

#### 1.1 Comment out MongoDB connection commands
Edit `index.js` and comment these lines to prevent gateway timeout:

```javascript
async function run() {
  try {
    await client.connect();
    
    // COMMENT THESE LINES:
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    // ... rest of code
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
  // COMMENT THIS TOO:
  // finally {
  //   await client.close();
  // }
}
```

#### 1.2 Update package.json
Ensure you have the start script:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

### **Step 2: Firebase Service Account Setup** 🔑

#### 2.1 Generate Firebase Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`artify-client-side`)
3. Click gear icon → **Project Settings**
4. Go to **Service accounts** tab
5. Click **"Generate new private key"**
6. Download the JSON file
7. Save as `firebase-service-account.json` in server root

#### 2.2 Convert Service Account to Base64
Create `encode.js` in your server directory:

```javascript
const fs = require("fs");
const key = fs.readFileSync("./firebase-service-account.json", "utf8");
const base64 = Buffer.from(key).toString("base64");
console.log("Copy this base64 string for Vercel environment variable:");
console.log(base64);
```

Run the encoder:
```bash
cd "d:\VS\Projects\Assignment10\artify-server-side"
node encode.js
```

**📝 Copy the base64 output - you'll need it for Vercel!**

#### 2.3 Add to .gitignore
```gitignore
node_modules/
.env
firebase-service-account.json
encode.js
.DS_Store
*.log
```

### **Step 3: MongoDB Atlas Configuration** 🗃️

#### 3.1 Whitelist IP Addresses
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Navigate to **Security** → **Network Access**
3. Click **"Add IP Address"**
4. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
5. Click **"Confirm"**

#### 3.2 Verify Database User Permissions
1. Go to **Security** → **Database Access**
2. Ensure your user (`ahmed2107001_db_user`) has **"Read and write to any database"** role

### **Step 4: Deploy to Vercel** 🌐

#### 4.1 Login to Vercel
```bash
vercel login
```
Follow the prompts to authenticate.

#### 4.2 Deploy to Vercel
```bash
cd "d:\VS\Projects\Assignment10\artify-server-side"
vercel
```

Answer the prompts:
- **Set up and deploy?** → Y
- **Which scope?** → (select your account)
- **Link to existing project?** → N
- **Project name?** → `artify-server-side`
- **In which directory?** → `.` (current directory)
- **Override settings?** → N

#### 4.3 Production Deployment
```bash
vercel --prod
```

**📝 Save the production URL that Vercel gives you!**

### **Step 5: Configure Environment Variables** ⚙️

#### 5.1 Add Environment Variables in Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your `artify-server-side` project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Name | Value |
|------|-------|
| `DB_USER` | `ahmed2107001_db_user` |
| `DB_PASS` | `HYjpDhU0UCYzy01T` |
| `NODE_ENV` | `production` |
| `FB_SERVICE_KEY` | `[paste the base64 string from Step 2.2]` |

#### 5.2 Redeploy with Environment Variables
```bash
vercel --prod
```

### **Step 6: Update Client-Side Configuration** 💻

#### 6.1 Update API Base URL
In your client-side project, update the API configuration:

**File: `artify-client-side/src/utils/api.js`**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-server-url.vercel.app';
```

**File: `artify-client-side/.env`**
```env
VITE_API_URL=https://your-server-url.vercel.app
```

#### 6.2 Update All Client Components
Replace all hardcoded localhost URLs in your components with the environment variable:

```javascript
// Replace this:
fetch('http://localhost:5000/artworks')

// With this:
fetch(`${import.meta.env.VITE_API_URL || 'https://your-server-url.vercel.app'}/artworks`)
```

#### 6.3 Redeploy Client-Side
```bash
cd "d:\VS\Projects\Assignment10\artify-client-side"
npm run build
firebase deploy
```

### **Step 7: Update CORS Configuration** 🌍

#### 7.1 Add Production URLs to Server CORS
Update your server's `index.js` CORS configuration:

```javascript
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://artify-client-side.web.app",
      "https://artify-client-side.firebaseapp.com",
      "https://your-client-custom-domain.com" // if you have one
    ],
    credentials: true,
  })
);
```

#### 7.2 Redeploy Server
```bash
vercel --prod
```

### **Step 8: Firebase Configuration Updates** 🔥

#### 8.1 Add Authorized Domains
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add these domains:
   - Your Vercel server URL: `artify-server-side.vercel.app`
   - Your production client URL: `artify-client-side.web.app`

#### 8.2 Update Firebase Storage Rules (if using file uploads)
**Firebase Console → Storage → Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### **Step 9: Testing & Verification** 🧪

#### 9.1 Test Server Endpoints
Visit these URLs in your browser:
- `https://your-server-url.vercel.app/` → Should show "Artify Server is running!"
- `https://your-server-url.vercel.app/health` → Should show server status
- `https://your-server-url.vercel.app/latest-artworks` → Should return JSON data

#### 9.2 Test Client-Server Communication
1. Open your production client app
2. Try these features:
   - ✅ Register/Login
   - ✅ Add new artwork
   - ✅ View artworks in explore page
   - ✅ Add artwork to favorites
   - ✅ View My Gallery
   - ✅ View My Favorites

#### 9.3 Check Browser Developer Tools
- **Console:** No error messages
- **Network:** All API calls return 200 status
- **Application → Local Storage:** User authentication data present

---

## 🎯 Final Checklist

### Server-Side ✅
- [ ] Server deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] MongoDB IP whitelist updated
- [ ] CORS configured for production domains
- [ ] Firebase service account configured

### Client-Side ✅
- [ ] API URLs updated to production server
- [ ] Client redeployed to Firebase
- [ ] Environment variables updated
- [ ] All components using production API

### Firebase ✅
- [ ] Authorized domains updated
- [ ] Authentication methods enabled
- [ ] Storage rules configured (if needed)
- [ ] Service account key generated

### Testing ✅
- [ ] Server endpoints responding
- [ ] Client-server communication working
- [ ] Authentication working
- [ ] CRUD operations functional
- [ ] No console errors

---

## 🚨 Common Issues & Solutions

### "EADDRINUSE" Error
- **Issue:** Port already in use locally
- **Solution:** Use `process.env.PORT` in production, different port locally

### "Gateway Timeout" on Vercel
- **Issue:** MongoDB connection commands causing timeout
- **Solution:** Comment out `client.close()` and `ping` commands

### CORS Errors
- **Issue:** Client can't connect to server
- **Solution:** Add client URLs to server CORS configuration

### Firebase Auth Errors
- **Issue:** Token verification failing
- **Solution:** Ensure service account is properly configured and base64 encoded

### Environment Variables Not Working
- **Issue:** Server can't access MongoDB
- **Solution:** Double-check variable names and values in Vercel dashboard

---

## 📞 Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Express.js Documentation](https://expressjs.com/)

---

## 🎉 Completion

Once all steps are completed and tested, your Artify application should be fully deployed and functional! 

**Production URLs:**
- **Client:** `https://artify-client-side.web.app`
- **Server:** `https://your-server-url.vercel.app`
- **Database:** MongoDB Atlas (Cloud)

Your full-stack application is now live! 🚀