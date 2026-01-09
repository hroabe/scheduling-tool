# RFC-0012: Simple Event Creation Mode

## 1. Summary
This RFC proposes the introduction of a "Simple Mode" for the event creation page. This mode simplifies the user interface by displaying only the essential fields required to create an event, making the process faster and more user-friendly.

## 2. Motivation
Users often want to create events quickly without navigating through numerous optional fields. The current form layout lists all options sequentially, which can be overwhelming. A "Simple Mode" will streamline this process.

## 3. Detailed Design

### 3.1. UI Changes
- **Tabs**: Introduce a tab interface at the top of the creation form.
  - **Simple Mode (かんたんモード)**: Default selected tab.
  - **Detailed Mode (詳細モード)**: Contains all available fields.

### 3.2. Fields by Mode

| Field | Simple Mode | Detailed Mode | Default Value (Hidden) |
| :--- | :--- | :--- | :--- |
| **Event Name** | ✅ | ✅ | - |
| **Organizer Name** | ✅ | ✅ | - |
| **Department** | ❌ | ✅ | undefined |
| **Email** | ❌ | ✅ | undefined |
| **Description** | ❌ | ✅ | undefined |
| **Candidate Dates** | ✅ | ✅ | - |
| **Edit Key** | ❌ | ✅ | undefined |
| **Deadline** | ❌ | ✅ | undefined |
| **Allow Maybe** | ❌ | ✅ | true |
| **Notify** | ❌ | ✅ | false |

### 3.3. Layout Adjustments
- **Add Candidate Button**: In both modes, the "Add Candidate" button will be moved to be inline with the end time input (or immediately adjacent), improving the flow of adding multiple dates.

### 3.4. Input Styling
- **Border Visibility**: Input borders changed from `gray.200` to `gray.300` (light mode) and `gray.700` to `gray.600` (dark mode) for 20% improved visibility.

## 4. Implementation Details
- **Frontend**: Modify `front/app/create/page.tsx`.
  - Use `useState` to manage the active tab.
  - Conditionally render the "Basic Info" and "Settings" cards based on the selected mode.
  - In Simple Mode, only show Name and Organizer Name in the Basic Info card.
  - In Simple Mode, hide the Settings card entirely (or just the fields, but hiding the card is cleaner).
  - Update the "Candidate Dates" section layout to position the "Add" button next to inputs.
  - **UX Improvement**: Keep the date input value after adding a candidate, allowing users to quickly add multiple slots for the same day.
  - **Optional End Time**: End time is optional. If not specified, defaults to start time + 1 hour.
  - **Time Validation**: End time must be after start time if specified.

### 4.1. Mini Calendar
A small always-visible calendar for quick date selection:
- **Component**: `front/components/ui/MiniCalendar.tsx`
- **Section Heading**: "1. 日付を選択してください" displayed above calendar
- **Features**:
  - Month navigation (prev/next buttons)
  - Displays year/month header in Japanese format
  - Weekday headers (日月火水木金土)
  - Sunday text in red, Saturday in blue
  - Today highlighted with subtle background
  - Selected date highlighted with brand color
- **Integration**: Clicking a date sets it in the candidate form

### 4.2. Duration Slider
A slider next to the end time input allows quick selection of meeting duration:
- **Range**: 0 to 120 minutes
- **Step**: 15 minutes
- **Default**: 0 (no duration set)
- **Marks**: "なし", 30, 60, 90, 120 (displayed below slider)
- **Tick Marks**: Visual tick lines at each step (0, 30, 60, 90, 120)
- **Vertical Alignment**: All inputs (開始, 終了, 所要時間) have consistent 40px height
- **Behavior**:
  - Moving slider automatically calculates and sets end time
  - Value 0 means "not set" (clears end time, tooltip shows "なし")
  - Manually editing end time resets slider to 0
- **Tooltip**: Shows current value on hover/drag

### 4.3. Time Input Controls
Custom Select-based time picker with fine control:
- **Section Heading**: "2. 時刻を選択してください" displayed above time inputs
- **Date Display**: Shows selected date in "XXXX年XX月XX日(曜)" format, or "----年--月--日(--)" when unselected
- **Hour Select**: Dropdown with 0-23 hours
- **Minute Select**: Dropdown with minute options
  - Default: 5-minute increments (00, 05, 10, ... 55)
  - Fine mode: 1-minute increments (00-59)
- **Fine Mode Checkbox**: "1分刻みで設定" (positioned below time inputs)
  - When unchecked: 5-minute increments
  - When checked: 1-minute increments
- **Quick Adjust Buttons**: Below start time
  - `-60` `-30` `+30` `+60` buttons for quick adjustment
  - Time is clamped to valid range (00:00-23:59)

### 4.4. Mini Calendar Sizing
- **Height**: `minH="280px"` to match time input area
- **Cells**: Larger day buttons (`h={9}`, `size="sm"`)
- **Spacing**: `gap={1}` between cells for better visibility

### 4.5. Mobile Share Button
On mobile devices, the "URLをコピー" button becomes a "共有" button:
- **Detection**: Uses `navigator.share` availability check
- **Desktop**: Shows "URLをコピー" with copy icon, copies to clipboard
- **Mobile**: Shows "共有" with share icon, opens native share sheet
- **Fallback**: If share fails (except user cancel), falls back to clipboard copy
- **Share Content**:
  - Title: Event name
  - Text: "{event name} - 日程調整に回答してください"
  - URL: Event page URL

## 5. Participant Response Management
After an event is created and participants have responded:

### 5.1. Token Storage (localStorage)
When a participant submits a response for the first time:
- The API returns an `edit_token` in the response
- The frontend stores this token in `localStorage` using the key `schedule_participant_token_{schedule_uuid}`
- This enables the same browser to edit or delete the response later

**Implementation**:
- `front/lib/tokenStorage.ts` - Utility for storing/retrieving tokens
- Functions: `storeEditToken()`, `getStoredToken()`, `getEditTokenForParticipant()`, `removeStoredToken()`

### 5.2. Edit Functionality
- **Edit Button**: Shown only for the participant whose token is stored in the current browser
- **Edit Flow**:
  1. Click edit button → Switch to "回答する" (Response Form) tab
  2. Form is pre-populated with participant's existing name, comment, and attendance selections
  3. Submit button shows "更新する" (instead of "回答を送信する")
  4. Submit updates the response via `edit_token` authentication
  5. Cancel button returns to Response Table without saving

### 5.3. Delete Functionality
- **Delete Button**: Shown only for the participant whose token is stored in the current browser
- **Confirmation Dialog**: Clicking delete opens an AlertDialog asking for confirmation
- **Delete Flow**:
  1. Click delete button → Confirmation dialog appears
  2. Confirm deletion → Uses stored `edit_token` to authenticate delete request
  3. On success, removes stored token from localStorage
  4. Cancel → Dialog closes, no action taken

### 5.4. Security Notes
- Tokens are stored per-browser in localStorage
- Users can only edit/delete responses from the same browser used to submit
- Users who clear browser data lose edit/delete access
- For full management, participants should save their `edit_url`

## 6. i18n Support
- Added `create` section to both `en.json` and `ja.json` with all create page strings.
- Added `account` section to `ja.json` (was missing).

## 7. Migration
No database schema changes required. Purely a frontend UI update.


