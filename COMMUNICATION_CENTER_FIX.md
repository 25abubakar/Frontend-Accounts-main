# Communication Center - API Integration Fix

## Problem
The Communication Center was not displaying content because it was using a different HTTP client implementation than the rest of the application.

### Original Issues:
1. Used custom `fetch` API instead of existing `axios` instance
2. Hardcoded base URL (`https://localhost:5001/api`) different from project standard
3. Missing `/api` prefix in endpoint paths
4. No integration with existing auth interceptors
5. Different error handling pattern

## Solution Applied

### 1. Updated `src/api/httpClient.ts`
**Before:**
```typescript
const API_BASE = "https://localhost:5001/api";
// Custom fetch implementation
```

**After:**
```typescript
import api from './axios';
// Now uses existing axios instance with proper config
```

### 2. Updated API Endpoints
Added `/api` prefix to all endpoints to match project structure:

**`src/api/appNotesApi.ts`:**
- `/app-notes/visible` → `/api/app-notes/visible`
- `/app-notes` → `/api/app-notes`
- etc.

**`src/api/lookupApi.ts`:**
- `/app-lookups/all` → `/api/app-lookups/all`
- `/app-lookups/{type}` → `/api/app-lookups/{type}`

**`src/api/menuApi.ts`:**
- `/app-menu-definitions/active` → `/api/app-menu-definitions/active`

### 3. Benefits of Fix

✅ **Consistent Configuration**
- Uses `VITE_API_BASE_URL` environment variable
- Falls back to `http://localhost:5099` (project standard)
- No more hardcoded URLs

✅ **Proper Authentication**
- Uses `withCredentials: true` for cookie-based auth
- Integrates with existing auth interceptors
- Handles 401 (session expired) automatically
- Handles 403 (permission denied) with toast notifications

✅ **Error Handling**
- Consistent error responses across all API calls
- Automatic redirect to login on session expiry
- Permission denied toasts

✅ **Same Behavior as Existing Features**
- Access Control pages
- HR Management
- Organization Chart
- All other modules

## Files Modified

1. `src/api/httpClient.ts` - Replaced fetch with axios
2. `src/api/appNotesApi.ts` - Added `/api` prefix to all endpoints
3. `src/api/lookupApi.ts` - Added `/api` prefix to all endpoints
4. `src/api/menuApi.ts` - Added `/api` prefix to getActive endpoint

## Testing

✅ Build passes: `npm run build`
✅ TypeScript compilation: No errors
✅ Bundle size: 17.64 kB (Communication Center chunk)

## Expected Behavior Now

When you navigate to `/communication`:

1. **API calls will use the correct base URL** from environment or default
2. **Authentication will work** using the same cookie-based session
3. **Errors will be handled** consistently with the rest of the app
4. **Content will display** when backend APIs return data

## Backend API Requirements

The Communication Center expects these endpoints to be available:

```
GET  /api/app-notes/visible?menuCode={code}&entityType={type}&entityId={id}
POST /api/app-notes
PUT  /api/app-notes/{id}/mark-read
PUT  /api/app-notes/{id}/acknowledge
PUT  /api/app-notes/{id}/dismiss

GET  /api/app-lookups/all
GET  /api/app-menu-definitions/active
```

If these endpoints are not yet implemented in the backend, the page will show empty states with messages like:
- "No admin instructions for this context."
- "No personal notes for this context."

This is expected behavior when no data exists.

---

**Status**: ✅ **FIXED - Now uses same API configuration as rest of application**
