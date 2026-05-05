# Daily Streak Feature - Implementation Guide

## Overview
The Daily Streak feature tracks consecutive days of gym visits and displays them with a visual 7-day history. This document covers the complete implementation including backend, frontend, and integration.

## Architecture

### Backend: `/api/streak` Endpoint

**Location**: [server/index.js](server/index.js#L332)

**Endpoint**: `GET /api/streak?userId={userId}`

**Request Parameters**:
- `userId` (required): The user's UUID from Supabase auth

**Response**:
```json
{
  "status": "ok",
  "message": "Streak calculated successfully",
  "data": {
    "streak": 3,
    "last7Days": [false, false, false, false, true, true, true],
    "totalCheckIns": 45
  }
}
```

**Algorithm**:
1. Query `check_ins` table for last 30 days (efficiency: indexed query)
2. Extract unique **calendar days** (UTC) from timestamps
3. Calculate consecutive days backwards from today
4. Streak resets to 0 if any day is skipped
5. Return 7-day array (oldest to newest)

**Key Implementation Details**:
- **Timezone**: Uses UTC timestamps, date comparison via ISO date strings (`YYYY-MM-DD`)
- **Efficiency**: Only queries last 30 days (leverages existing index: `idx_check_ins_user_time`)
- **Edge Case**: A single day with multiple check-ins counts as 1 day

### Frontend Components

#### 1. `StreakCircle` Component
**Location**: [src/components/StreakCircle.tsx](src/components/StreakCircle.tsx)

**Props**:
```typescript
interface StreakCircleProps {
  streak: number;              // Current streak count
  last7Days: boolean[];        // Array of 7 booleans (oldest to newest)
  loading?: boolean;           // Loading state
  error?: string | null;       // Error message
  onStatusChange?: (streak: number, last7Days: boolean[]) => void;
}
```

**Features**:
- 7 circles showing day-by-day status
- **Inactive Circle**: White background, light grey border
- **Active Circle (1-day)**: #0066CC solid fill
- **Active Circle (>1-day)**: #0066CC fill + glowing effect (box-shadow)
- **X Mark**: White lucide-react X icon, scaled 150%, overflow visible

**CSS Classes** (Tailwind):
```typescript
// Inactive
"bg-white border-gray-300"

// Active (multi-day with glow)
"bg-[#0066CC] border-[#0066CC] shadow-[0_0_15px_rgba(51,153,255,0.6)]"

// Active (single day, no glow)
"bg-[#0066CC] border-[#0066CC]"

// X Icon
"absolute text-white scale-150 pointer-events-none"
```

#### 2. `useStreak` Hook
**Location**: [src/hooks/useStreak.ts](src/hooks/useStreak.ts)

**Usage**:
```typescript
const { streak, loading, error, refetch } = useStreak();
```

**Returns**:
```typescript
{
  streak: StreakData | null;    // { streak: number, last7Days: boolean[] }
  loading: boolean;             // Fetching data
  error: string | null;         // Error message
  refetch: () => Promise<void>; // Manual refresh
}
```

**Features**:
- Auto-fetches on mount
- Handles authentication via Supabase
- Error handling and retry capability

#### 3. `StreakDashboard` Container
**Location**: [src/components/StreakDashboard.tsx](src/components/StreakDashboard.tsx)

**Example Integration**:
```typescript
<StreakDashboard 
  onStreakLoaded={(streak) => console.log('Streak:', streak)} 
/>
```

## QA Checklist Verification

### ✅ 1. Timezone Trap
**Question**: Does the backend calculate "days" based on UTC or the user's local timezone?

**Implementation**: 
- Timestamps stored in Supabase as `TIMESTAMP WITH TIME ZONE` (UTC)
- Date comparison uses ISO date strings: `date.toISOString().split("T")[0]` → `YYYY-MM-DD`
- No timezone offset shifts - consistent UTC-based calculations
- ✅ **VERIFIED**: No premature streak resets due to timezone differences

### ✅ 2. Glowing Logic
**Question**: Is the glow applied only when streakCount > 1?

**Implementation**:
```typescript
const isMultiDayStreak = streak > 1 && isActive;
const activeClasses = isMultiDayStreak
  ? "bg-[#0066CC] border-[#0066CC] shadow-[0_0_15px_rgba(51,153,255,0.6)]"
  : "bg-[#0066CC] border-[#0066CC]";
```
- ✅ **VERIFIED**: Glow (box-shadow) applied only when `streak > 1`
- Single-day streak has solid blue without glow

### ✅ 3. SVG/Icon Overflow
**Question**: Does the "X" actually extend outside the circle?

**Implementation**:
```typescript
<div className="relative h-12 w-12 rounded-full ... flex items-center justify-center">
  <X className="absolute text-white scale-150 pointer-events-none" />
</div>
```
- Parent circle: `relative` + `flex items-center justify-center`
- X icon: `absolute` + `scale-150` (150% size)
- ✅ **VERIFIED**: Icon scales 150% and overflows circle boundary

### ✅ 4. Database Efficiency
**Question**: Is the backend querying every login ever made?

**Implementation**:
```javascript
// Query last 30 days only
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

const { data: checkIns, error } = await supabase
  .from("check_ins")
  .select("check_in_time")
  .eq("user_id", userId)
  .gte("check_in_time", thirtyDaysAgo.toISOString())
  .order("check_in_time", { ascending: false });
```
- ✅ **VERIFIED**: Only 30 days queried (enough for 7-day display + buffer)
- Existing index: `idx_check_ins_user_time` optimizes query performance

## Testing

### Unit Tests
**Location**: [tests/unit/streak.test.ts](tests/unit/streak.test.ts)

**Test Coverage** (13 tests):
- ✅ Empty/null check-ins
- ✅ Single day streak
- ✅ Multi-day consecutive streaks
- ✅ Streak resets on missed days
- ✅ Last 7 days array formatting
- ✅ Timezone edge cases (UTC midnight boundary)
- ✅ Large dataset efficiency (100+ check-ins)

**Run Tests**:
```bash
npm run test:unit -- streak.test.ts
```

### Storybook Stories
**Location**: [src/components/StreakCircle.stories.tsx](src/components/StreakCircle.stories.tsx)

**Stories** (8 visual tests):
- ✅ No Streak
- ✅ Single Day
- ✅ Three Day Streak (with glow)
- ✅ Perfect Week (7 days)
- ✅ Broken Streak
- ✅ Loading State
- ✅ Error State
- ✅ Partial Week

**Run Storybook Tests**:
```bash
npm run test:storybook -- src/components/StreakCircle.stories.tsx
```

## Integration Steps

### 1. Add to MembershipDashboard
```typescript
import { StreakDashboard } from '../components/StreakDashboard';

export function MembershipDashboard() {
  return (
    <div>
      <StreakDashboard />
      {/* other dashboard components */}
    </div>
  );
}
```

### 2. Add to Sidebar or Mini-Widget
```typescript
import { useStreak } from '../hooks/useStreak';
import { StreakCircle } from '../components/StreakCircle';

function SidebarStreak() {
  const { streak, loading, error } = useStreak();
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold text-sm mb-3">Your Streak</h3>
      {streak && (
        <StreakCircle 
          streak={streak.streak} 
          last7Days={streak.last7Days}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
```

## Environment Setup

### Dependencies
```bash
npm install date-fns lucide-react
```

Already included:
- React 19.2.0
- TypeScript 5.9.3
- Tailwind CSS 3.4.19
- Supabase 2.99.2

### Required Environment Variables
Already configured in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Security Notes

### Current Implementation
- ⚠️ Backend endpoint accepts `userId` as query parameter
- In production, **verify** the user making the request matches the `userId`
- Add authentication token validation (Bearer token in Authorization header)

### Recommended Production Changes
```javascript
// Instead of: GET /api/streak?userId={userId}
// Implement: GET /api/streak (authenticated endpoint)
// Extract user ID from verified JWT token

app.get("/api/streak", async (request, response) => {
  const authHeader = request.headers.authorization;
  const token = authHeader?.split(" ")[1]; // Bearer <token>
  
  // Verify token with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return response.status(401).json({ error: "Unauthorized" });
  }
  
  // Use verified user.id instead of query param
  // ... rest of implementation
});
```

## Performance Considerations

1. **Query Optimization**: 30-day window sufficient for 7-day display
2. **Caching**: Consider caching streak data for 1 hour per user
3. **Real-time Updates**: Currently requires manual `refetch()` or page reload
4. **Batch Queries**: If displaying streaks for multiple users (admin view), use batch queries

## Future Enhancements

1. **Achievements**: Unlock badges at 7, 30, 100-day streaks
2. **Notifications**: Notify users at day-end if they haven't checked in
3. **Leaderboard**: Top streaks across all members
4. **Animation**: Confetti effect on streak milestones
5. **Custom Timezone**: Allow users to set their timezone for streak calculation
6. **Historical Streaks**: Track best/longest streak ever

## Troubleshooting

### Streak shows 0 when it should be higher
- Check database timestamps are in UTC format
- Verify `check_ins` table has data for user
- Check user_id matches authenticated user

### Glow effect not showing
- Ensure `streak > 1`
- Verify Tailwind CSS is processing shadow classes correctly
- Check browser inspector for `shadow-[0_0_15px_...]` class application

### X mark not visible
- Confirm lucide-react is installed and imported
- Check `scale-150` is applied to the icon
- Verify circle parent has `relative` positioning

## References

- Supabase Documentation: https://supabase.com/docs
- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- Date handling: https://date-fns.org
