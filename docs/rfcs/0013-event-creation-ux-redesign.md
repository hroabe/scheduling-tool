# RFC-0013: Event Creation UX Redesign - "Fastest Path to Share"

## 1. Overview

This RFC proposes a major UX redesign of the event creation page, optimizing for the "fastest path to share" workflow while maintaining all existing functionality.

### 1.1. Goals
- Reduce actions required to create and share an event
- Streamline UI by hiding advanced options behind collapsible sections
- Enable multi-date selection for batch candidate creation
- Provide clear visual feedback and guidance

### 1.2. Non-Goals
- Backend API changes (existing endpoints remain unchanged)
- New database fields (uses existing schema)

---

## 2. Design Changes

### 2.1. Dual CTA Buttons (Primary Improvement)

Replace single "Create" button with tiered CTAs:

| Button | Action | Priority |
|--------|--------|----------|
| **作成してリンクをコピー** | Create event + copy URL to clipboard | Primary (large, prominent) |
| **作成（リンク画面へ）** | Create event + navigate to event page | Secondary |
| **下書き保存** | Save as draft (future feature) | Tertiary (disabled for now) |

**Behavior:**
- Primary CTA disabled until: event name entered AND at least 1 candidate added
- On success: show toast "リンクをコピーしました" and copy URL
- On mobile: sticky footer that stays visible during scroll

### 2.2. Streamlined Event Info Section

**Current:** Two separate input fields (event name, organizer name)

**New:**
```
┌─────────────────────────────────────┐
│ 基本情報                             │
│ イベント名（必須）                    │
│ [ チームMTG                        ] │
│                                     │
│ 主催者：山田太郎            [変更]   │ ← Collapsed by default
└─────────────────────────────────────┘
```

**Features:**
- Organizer name auto-filled from: logged-in user name → localStorage previous value → empty
- "変更" button expands inline input field
- Event name input: Enter key moves focus to calendar
- Template chips for quick event names: `チームMTG` `1on1` `面談` `飲み会`

### 2.3. Multi-Date Calendar Selection

**Current:** Single date selection

**New:**
```
┌─────────────────────────────────────┐
│ 2026年1月        <  >               │
│ 日 月 火 水 木 金 土                │
│        1  2  3  4                   │
│  5  6  7  8  9 10 11                │
│ 12 13 14[15][16][17]18              │ ← Multiple dates selected
│ 19 20 21 22 23 24 25                │
└─────────────────────────────────────┘
  複数日を選択できます
```

**Behavior:**
- Click: toggle date selection
- Shift+Click (desktop): range selection
- Long press (mobile): start multi-select mode
- Selected dates shown with badge count
- "選択した日付を追加" button adds all at once

### 2.4. Duration Preset Chips

**Current:** Slider with 0-120 minute range

**New:**
```
所要時間
[ 30分 ][ 60分 ][ 90分 ][ 120分 ][ カスタム ]
```

**Behavior:**
- Chips are mutually exclusive (radio-like)
- "カスタム" opens minute input
- Default: 60分 selected
- End time calculated automatically: `開始 + 所要時間`

### 2.5. Collapsible Options Section

**Hidden by default in かんたんモード:**
```
▾ オプション
┌─────────────────────────────────────┐
│ [ ] 終了時刻を直接指定する           │
│     終了 [ 12 : 00 ▼ ]              │
│                                     │
│ 刻み  (●)5分   ( )1分               │
│                                     │
│ 微調整  [−15][+15] [−30][+30]       │
└─────────────────────────────────────┘
```

**Options included:**
- End time direct input toggle
- Minute step toggle (5min / 1min)
- Nudge buttons: ±15, ±30, ±60

### 2.6. Candidate List with Actions

**Current:** Display + delete only

**New:**
```
┌─────────────────────────────────────┐
│ 候補一覧                      3件   │
├─────────────────────────────────────┤
│ 2026/01/16(金) 11:00–12:00（60分）  │
│ [編集] [複製]                  [🗑] │
├─────────────────────────────────────┤
│ 2026/01/17(土) 11:00–12:00（60分）  │
│ [編集] [複製]                  [🗑] │
└─────────────────────────────────────┘
```

**Header with batch actions:**
```
候補一覧                    3件 [全選択] [🗑]
(選択時: "2件選択中")
```

**Actions:**
- **☑ Checkbox**: Select/deselect individual candidate
- **全選択/選択解除**: Toggle all candidates selection
- **🗑 (header)**: Delete all selected candidates
- **編集**: Opens popover with start time + duration pickers
- **複製**: Copies candidate settings for next date selection
- **🗑 (item)**: Deletes individual candidate

**Empty state:**
```
候補一覧                         0件
まだ候補がありません
日付と時間を選んで「追加」してください
```

### 2.7. Two-Column Layout (Desktop)

```
┌─────────────────────────┬─────────────────────────┐
│ (Left) Input            │ (Right) Candidates      │
│                         │                         │
│ ┌─────────────────────┐ │ ┌─────────────────────┐ │
│ │ 基本情報            │ │ │ 候補一覧            │ │
│ └─────────────────────┘ │ └─────────────────────┘ │
│                         │                         │
│ ┌─────────────────────┐ │                         │
│ │ 候補日を追加        │ │                         │
│ │ [Calendar]          │ │                         │
│ │ [Time/Duration]     │ │                         │
│ └─────────────────────┘ │                         │
└─────────────────────────┴─────────────────────────┘
```

**Breakpoints:**
- Desktop (lg+): Two columns, 50/50 split
- Mobile (<lg): Single column, stacked

### 2.8. Mode Differences (かんたん vs 詳細)

| Feature | かんたんモード | 詳細モード |
|---------|---------------|-----------|
| Organizer | Collapsed (変更 button) | Collapsed (変更 button) ← **Same** |
| Duration | Preset chips | Preset chips |
| End time | ▸ オプション設定 (collapsed) | ▸ オプション設定 (collapsed) ← **Same** |
| 1-min step | ▸ オプション設定 (collapsed) | ▸ オプション設定 (collapsed) ← **Same** |
| Nudge buttons | ▸ オプション設定 (collapsed) | ▸ オプション設定 (collapsed) ← **Same** |
| **Email/Description** | Hidden | ▸ オプション設定 (collapsed in 基本情報) |
| **Edit key** | Hidden | ▸ オプション設定 (collapsed in イベントオプション) |
| **Deadline** | Hidden | ▸ オプション設定 (collapsed in イベントオプション) |
| **Allow maybe (△)** | Default: ON (hidden) | ▸ オプション設定 (collapsed in イベントオプション) |
| **Notify on response** | Default: OFF (hidden) | ▸ オプション設定 (collapsed in イベントオプション) |

### 2.9. Layout Structure (詳細モード)

```
┌─────────────────────────┬─────────────────────────┐
│ (Left) Input            │ (Right) Candidates      │
│                         │                         │
│ ┌─────────────────────┐ │ ┌─────────────────────┐ │
│ │ 基本情報            │ │ │ 候補一覧            │ │
│ │ ├ イベント名*       │ │ └─────────────────────┘ │
│ │ ├ テンプレートチップ│ │                         │
│ │ ├ 主催者：○○ [変更] │ │                         │
│ │ └▸ オプション設定   │ │                         │
│ │   ├ メール(任意)    │ │                         │
│ │   └ 説明(任意)      │ │                         │
│ └─────────────────────┘ │                         │
│                         │                         │
│ ┌─────────────────────┐ │                         │
│ │ 候補日を追加        │ │                         │
│ │ [カレンダー]        │ │                         │
│ │ [開始/終了/所要時間]│ │                         │
│ │ [追加ボタン]        │ │                         │
│ │ └▸ オプション設定   │ │                         │
│ │   ├ 終了時刻直接入力│ │                         │
│ │   ├ 刻み設定        │ │                         │
│ │   └ 微調整ボタン    │ │                         │
│ └─────────────────────┘ │                         │
│                         │                         │
│ ┌─────────────────────┐ │                         │
│ │ ▸ オプション設定    │ │                         │
│ │   ├ 編集キー        │ │                         │
│ │   ├ 回答期限        │ │                         │
│ │   ├ △を許可         │ │                         │
│ │   └ 通知            │ │                         │
│ └─────────────────────┘ │                         │
└─────────────────────────┴─────────────────────────┘
```

---

## 3. Component Structure

### 3.1. New Components

```
front/components/create/
├── EventBasicsCard.tsx        # Event name + organizer
├── CandidateBuilderCard.tsx   # Calendar + time picker
├── DateMultiSelectCalendar.tsx # Multi-select calendar
├── DurationPresetChips.tsx    # Duration chip selector
├── BuilderOptionsDisclosure.tsx # Collapsible options
├── CandidateListCard.tsx      # Candidate list with actions
├── CandidateItem.tsx          # Single candidate row
├── CandidateQuickEdit.tsx     # Edit popover
└── StickyFooterCTA.tsx        # Dual CTA buttons
```

### 3.2. Modified Components

```
front/app/create/page.tsx      # Main page layout refactor
front/components/ui/MiniCalendar.tsx → DateMultiSelectCalendar.tsx
```

---

## 4. State Management

### 4.1. New State Variables

```typescript
// Multi-date selection
const [selectedDates, setSelectedDates] = useState<string[]>([]);

// Duration preset
const [durationPreset, setDurationPreset] = useState<number | 'custom'>(60);
const [customDuration, setCustomDuration] = useState<number>(60);

// Options visibility
const [showOptions, setShowOptions] = useState(false);
const [useDirectEndTime, setUseDirectEndTime] = useState(false);

// Organizer collapsed state
const [organizerExpanded, setOrganizerExpanded] = useState(false);

// Edit popover
const [editingCandidateIndex, setEditingCandidateIndex] = useState<number | null>(null);
```

### 4.2. Auto-fill Logic

```typescript
// Organizer name priority:
// 1. Logged-in user's name (from auth context)
// 2. localStorage 'lastOrganizerName'
// 3. Empty string

useEffect(() => {
  const savedName = localStorage.getItem('lastOrganizerName');
  if (user?.name) {
    setValue('organizer_name', user.name);
  } else if (savedName) {
    setValue('organizer_name', savedName);
  }
}, [user]);
```

---

## 5. Proposed File Changes

### 5.1. New Files

| File | Purpose |
|------|---------|
| `front/components/create/EventBasicsCard.tsx` | Event name + collapsible organizer |
| `front/components/create/CandidateBuilderCard.tsx` | Date picker + time/duration |
| `front/components/create/DateMultiSelectCalendar.tsx` | Multi-date calendar |
| `front/components/create/DurationPresetChips.tsx` | 30/60/90/120/custom chips |
| `front/components/create/BuilderOptionsDisclosure.tsx` | Collapsible advanced options |
| `front/components/create/CandidateListCard.tsx` | Candidate list with actions |
| `front/components/create/CandidateItem.tsx` | Single candidate with edit/duplicate/delete |
| `front/components/create/CandidateQuickEdit.tsx` | Edit popover component |
| `front/components/create/StickyFooterCTA.tsx` | Dual CTA footer |

### 5.2. Modified Files

| File | Changes |
|------|---------|
| `front/app/create/page.tsx` | Major refactor to use new components |
| `front/messages/ja.json` | Add new translation keys |
| `front/messages/en.json` | Add new translation keys |

---

## 6. Verification Plan

### 6.1. Functional Tests
- Create event with single date selection
- Create event with multi-date selection
- Duration preset chips work correctly
- Options disclosure expands/collapses
- Edit candidate via popover
- Duplicate candidate
- Delete candidate
- "作成してリンクをコピー" copies URL
- Organizer auto-fill from localStorage

### 6.2. Responsive Tests
- Desktop: Two-column layout
- Mobile: Single column + sticky footer
- Touch interactions (long press for multi-select)

### 6.3. Mode Tests
- かんたんモード: Options hidden
- 詳細モード: All options visible

---

## 7. Implementation Order

1. **Phase 1: Core Components**
   - DateMultiSelectCalendar
   - DurationPresetChips
   - BuilderOptionsDisclosure

2. **Phase 2: Candidate Management**
   - CandidateItem
   - CandidateQuickEdit
   - CandidateListCard

3. **Phase 3: Layout & CTAs**
   - EventBasicsCard
   - CandidateBuilderCard
   - StickyFooterCTA

4. **Phase 4: Integration**
   - Refactor create/page.tsx
   - Add translations
   - Testing

---

## 8. Migration Notes

- Existing functionality is preserved
- No breaking changes to API
- localStorage key `lastOrganizerName` is new
- Old single-date workflow still works (selecting one date)
