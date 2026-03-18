# DriveStack 🗄️

A full-stack web application that lets you connect multiple Google accounts and use their combined Google Drive storage as a single unified file system.

> Connect 3 Google accounts = 45GB of unified storage. Upload, organize, and share files across all accounts transparently.

---

## Screenshots

### Login Page
![Login](ScreenShots/01-login.png)

### Google Account Chooser
![Account Chooser](ScreenShots/02-google-account-chooser.png)

### Dashboard — Two Accounts Connected (30 GB Total)
![Dashboard](ScreenShots/03-dashboard-two-accounts.png)

### Upload File Dialog
![Upload Dialog](ScreenShots/04-upload-file-dialog.png)

### Upload Progress Bar
![Upload Progress](ScreenShots/05-upload-progress.png)

### File List with Actions
![Files](ScreenShots/06-files-list.png)

### Rename File Inline
![Rename](ScreenShots/07-rename-file.png)

### Move File — Folder Browser
![Move Root](ScreenShots/08-move-file-root.png)

### Move File — Navigate into Subfolder
![Move Navigate](ScreenShots/09-move-file-navigate.png)

### File Moved Successfully
![Moved](ScreenShots/10-moved-file.png)

### Create New Folder
![New Folder](ScreenShots/11-new-folder.png)

### Folder Created
![Folder Created](ScreenShots/12-folder-created.png)

---

## Features

- **Multi-account Google Drive** — Link multiple Google accounts and aggregate their storage
- **Storage overview** — See total/used/free storage per account and combined
- **File explorer** — Browse files and folders just like Google Drive
- **Upload with progress** — Click to upload with a real-time progress bar
- **Smart account selection** — Automatically uploads to the account with the most free space
- **Virtual folder system** — Create folders and subfolders (not tied to Google Drive folders)
- **File operations** — Upload, download, rename, move, and delete files
- **Search** — Search files across all folders and accounts
- **Account linking** — Link additional Google accounts to expand your storage pool
- **Auto token refresh** — OAuth tokens refresh automatically when they expire

---

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM v7**
- **Passport.js** + **Google OAuth 2.0**
- **Google Drive API** (`googleapis`)
- **Multer** for file upload handling

### Frontend
- **React** + **Vite** + **TypeScript**
- **Tailwind CSS v4**
- **Axios** for API calls
- **React Router v6**

---

## Project Structure

```
drivestack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── migrations/             # Migration history
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts           # Prisma client singleton
│   │   │   └── passport.ts         # Google OAuth strategy
│   │   ├── routes/
│   │   │   ├── auth.ts             # Login, logout, account linking
│   │   │   ├── files.ts            # Upload, download, rename, delete
│   │   │   ├── folders.ts          # Folder CRUD, move files
│   │   │   └── storage.ts          # Storage overview
│   │   ├── services/
│   │   │   ├── driveService.ts     # Google Drive API wrapper
│   │   │   ├── fileService.ts      # File operations logic
│   │   │   ├── folderService.ts    # Folder operations logic
│   │   │   └── storageService.ts   # Storage aggregation logic
│   │   └── index.ts                # Express app entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── FileExplorer.tsx    # Main file browser
    │   │   ├── Sidebar.tsx         # Storage overview + account list
    │   │   └── StorageBar.tsx      # Storage progress bar component
    │   ├── context/
    │   │   └── AuthContext.tsx     # Global auth state
    │   ├── pages/
    │   │   ├── LoginPage.tsx       # Google login page
    │   │   └── DashboardPage.tsx   # Main dashboard
    │   ├── services/
    │   │   └── api.ts              # Axios instance
    │   └── main.tsx
    └── package.json
```

---

## Database Schema

```
User
  id, email, name, avatar, createdAt

ConnectedAccount
  id, userId, googleEmail, accessToken, refreshToken, createdAt

File
  id, userId, accountId, driveFileId, name, size, mimeType, folderId, createdAt

Folder
  id, userId, name, parentId, createdAt
```

---

## API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Redirect to Google login |
| GET | `/auth/google/callback` | OAuth callback |
| GET | `/auth/google/link` | Link additional Google account |
| GET | `/auth/me` | Get current logged in user |
| GET | `/auth/logout` | Logout |

### Files
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/files` | List files (optionally by folder) |
| POST | `/files/upload` | Upload a file |
| GET | `/files/:id/download` | Download a file |
| PATCH | `/files/:id/rename` | Rename a file |
| DELETE | `/files/:id` | Delete a file |

### Folders
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/folders` | List folders (optionally by parent) |
| POST | `/folders` | Create a folder |
| GET | `/folders/:id` | Get folder contents |
| GET | `/folders/:id/breadcrumb` | Get breadcrumb trail |
| PATCH | `/folders/:id/move-file` | Move a file into a folder |
| DELETE | `/folders/:id` | Delete a folder |

### Storage
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/storage/overview` | Get aggregated storage across all accounts |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL
- Google Cloud account

### 1. Clone the repository

```bash
git clone https://github.com/MRashedHossain/drivestack.git
cd drivestack
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project named `DriveStack`
3. Enable the **Google Drive API**
4. Go to **APIs & Services** → **OAuth consent screen**
   - User type: External
   - Add your email as a test user
5. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:
```env
PORT=5000
DATABASE_URL="postgresql://drivestack_user:yourpassword@localhost:5432/drivestack"
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
SESSION_SECRET=some_long_random_string
```

Set up the database:
```bash
# Create the database
sudo -u postgres psql
CREATE DATABASE drivestack;
CREATE USER drivestack_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE drivestack TO drivestack_user;
ALTER USER drivestack_user CREATEDB;
\q

# Grant schema permissions
sudo -u postgres psql -d drivestack
GRANT ALL ON SCHEMA public TO drivestack_user;
ALTER SCHEMA public OWNER TO drivestack_user;
\q

# Run migrations
npx prisma migrate dev
```

Start the backend:
```bash
npm run dev
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## How It Works

### Storage Aggregation
Each connected Google account provides 15GB of free storage. DriveStack fetches the quota from each account via the Google Drive API and combines them into a single total. When uploading a file, it automatically picks the account with the most free space.

### Virtual File System
Folders in DriveStack are **virtual** — they exist only in our PostgreSQL database, not in Google Drive. Google Drive stores the raw files. This lets us manage a clean folder hierarchy independently of how files are stored across multiple Drive accounts.

### Account Linking
A single DriveStack user can link multiple Google accounts. The primary account is used to log in. Additional accounts are linked via `/auth/google/link` which uses session state to associate the new Google account with the existing user without creating a duplicate.

### Auto Token Refresh
When Google access tokens expire (after 1 hour), the OAuth client automatically requests a new one using the stored refresh token and saves it back to the database transparently.

---

## Known Limitations

- **File size** — Large files are loaded into memory before uploading to Drive. Streaming upload for very large files is not yet implemented.
- **Account merging** — If you log in with a secondary Google account directly (instead of linking it), it creates a separate user. Cross-account merging is not supported.
- **Google verification** — The app is in testing mode. Only approved test users can log in. Public access requires Google's OAuth verification process.

---

## Roadmap

- [ ] Streaming upload for large files
- [ ] File chunking across accounts (files larger than any single account's free space)
- [ ] Shareable download links (public links without login)
- [ ] Client-side file encryption before upload
- [ ] Deployment guide (Railway + Vercel)

---

## License

MIT