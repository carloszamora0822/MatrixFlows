01-system-overview.md
# VBT Vestaboard System – System Overview

## 1. Purpose

The VBT Vestaboard System is a full-production web application for a single
organization, **VBT**, which owns one or more Vestaboards.

The core purpose is to allow VBT staff to:

- Configure what content appears on each Vestaboard.
- Combine multiple “screens” into **workflows** (playlists).
- Schedule workflows and temporarily override them (e.g., “pin this screen for a day”).
- Minimize operator effort with an intuitive, low-friction UI.

All displayed content is converted into 6×22 matrices of character codes and sent
to the Vestaboard Write API.

## 2. Key Concepts

- **Organization (VBT)**  
  Single-tenant system. All users and boards belong to VBT.

- **Users**  
  Staff members who log in, manage content, configure workflows, and monitor boards.

- **Vestaboards**  
  Physical boards (e.g., Lobby, Hangar). Each board:
  - Has its own Vestaboard API credentials.
  - Has one **default workflow**.
  - Can have additional **special workflows** that override the default based on schedules.

- **Screens**  
  Logical units of content to display. Three categories:
  1. **Manual-input screens**
     - Birthday
     - Checkrides
     - Upcoming Events
     - Newest Pilot (Private Pilot)
     - Employee Recognition
  2. **External-data screens**
     - METAR (KVBT)
     - Weather (OpenWeatherMap)
  3. **Custom message screens**
     - Free text typed by the user with decorative borders.

- **Workflows**
  - Ordered playlists of screens for a specific Vestaboard.
  - Each step defines a screen type, configuration, and display duration.
  - Support daily schedules and override behavior.

- **Screen Engine**
  - A backend service that converts abstract screen configurations into final
    6×22 integer matrices using predefined templates, character-code mapping,
    and placeholder replacement.

## 3. Tech Stack

- **Frontend:** React (SPA), TypeScript (recommended), deployed on Vercel.
- **Backend:** Node.js (Express or similar), deployed as Vercel serverless functions or a Node API.
- **Database:** MongoDB (Atlas).
- **External APIs:**
  - Vestaboard Write API.
  - aviationweather.gov (METAR: KVBT).
  - OpenWeatherMap (`/data/2.5/weather` with imperial units).

## 4. High-Level User Flows

1. **Authentication**
   - User logs in with email + password.
   - Receives a session (JWT in HTTP-only cookie or similar).

2. **Data Management**
   - User manages manual data:
     - Birthdays
     - Checkrides
     - Upcoming Events
     - Newest Pilot entries
     - Employee Recognition entries
     - Custom Messages
   - UI provides validation and live preview.

3. **Workflow Management**
   - User selects a board (e.g., Lobby Board).
   - Creates or edits workflows:
     - Adds steps.
     - Chooses screen types.
     - Configures per-step options.
     - Sets display durations.
     - Configures schedules (always-on or daily windows).
   - May create **special workflows** (e.g., “Birthday Special”).

4. **Pin Screen for a Day**
   - User invokes a guided UI (“Pin this screen”).
   - Selects one or two screen types and a date/time window.
   - System creates a temporary, scheduled workflow that overrides default.
   - After window ends, board automatically reverts to default workflow.

5. **Runtime / Scheduler**
   - A scheduled process (cron) runs periodically (e.g., every minute).
   - For each Vestaboard:
     - Determine active workflow (consider overrides).
     - Check if it’s time to move to the next step.
     - Render screen via the Screen Engine.
     - Push matrix to Vestaboard.
     - Update board state.

## 5. Non-Goals

- Multi-tenant SaaS with many external organizations (design supports it, but scope is VBT only).
- Complex per-user permissions beyond simple roles and org-level access.
- Custom visual designer for arbitrary pixel editing beyond defined templates and simple borders.

02-domain-model.md
# VBT Vestaboard System – Domain Model

## 1. Overview

The domain model focuses on:

- Organization and users.
- Vestaboards.
- Data entities used by screens.
- Screens (logical).
- Workflows and workflow steps.
- Board state.

## 2. Entities

### 2.1 Organization

```ts
Organization {
  orgId: string;   // "VBT"
  name: string;    // "VBT"
}
Only one organization is used in production, but model supports more.
2.2 User
User {
  userId: string;
  orgId: string; // FK -> Organization
  email: string;
  passwordHash: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}
2.3 Vestaboard
Vestaboard {
  boardId: string;
  orgId: string;
  name: string;             // e.g. "Lobby Board"
  locationLabel?: string;   // e.g. "Bentonville, AR"
  vestaboardWriteKey: string; // encrypted and never exposed to frontend
  defaultWorkflowId?: string; // FK -> Workflow
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
2.4 Manual Data Entities
2.4.1 Birthday
Birthday {
  id: string;
  orgId: string;
  firstName: string; // trimmed
  date: string;      // "MM/DD"
  createdBy?: string; // userId
  createdAt: Date;
}
2.4.2 Checkride
Checkride {
  id: string;
  orgId: string;
  time: string;        // "HHmm" 0000-2359
  callsign: string;    // max 6 chars, displayed as name
  type: "PPL" | "IFR";
  destination: string; // max 6 chars, flight tag
  date?: string;       // optional "MM/DD" for filtering by day
  createdAt: Date;
}
2.4.3 Upcoming Event
UpcomingEvent {
  id: string;
  orgId: string;
  date: string;        // "MM/DD"
  time?: string;       // optional "HHmm"
  description: string; // <=16 chars
  createdAt: Date;
}
2.4.4 Newest Pilot
Pilot {
  id: string;
  orgId: string;
  name: string;   // trimmed
  isCurrent: boolean;
  createdAt: Date;
}
At runtime we typically use the latest isCurrent = true pilot.
2.4.5 Employee Recognition
EmployeeRecognition {
  id: string;
  orgId: string;
  firstName: string;
  lastName: string;
  isCurrent: boolean;
  createdAt: Date;
}
At runtime we typically use the latest isCurrent = true recognition.
2.5 Custom Message
CustomMessage {
  id: string;
  orgId: string;
  title: string;           // for UI selection
  message: string;         // arbitrary user text
  style: string;           // e.g. "rainbow_border", "solid_red", "blue_corners"
  maxLines?: number;       // optional override, default 4 lines inside border
  createdBy?: string;
  createdAt: Date;
}
2.6 Workflow
Workflow {
  workflowId: string;
  orgId: string;
  boardId: string;         // FK -> Vestaboard
  name: string;            // "Default Ops", "Birthday Special"
  isDefault: boolean;
  isActive: boolean;

  schedule: WorkflowSchedule;

  steps: WorkflowStep[];

  createdAt: Date;
  updatedAt: Date;
}
2.6.1 WorkflowSchedule
type WorkflowSchedule =
  | {
      type: "always";
    }
  | {
      type: "dailyWindow";
      startTimeLocal: string;   // "HH:mm", e.g. "08:00"
      endTimeLocal: string;     // "HH:mm", e.g. "17:00"
      daysOfWeek: number[];     // 0-6 = Sun-Sat
    }
  | {
      type: "specificDateRange";
      startDate: string;        // "YYYY-MM-DD"
      endDate: string;          // "YYYY-MM-DD"
      startTimeLocal: string;   // "HH:mm"
      endTimeLocal: string;     // "HH:mm"
      daysOfWeek?: number[];    // optional; if omitted, all days in range
    };
The specificDateRange schedule is useful for “pin this screen for a day” flows.
2.6.2 WorkflowStep
type ScreenType =
  | "BIRTHDAY"
  | "CHECKRIDES"
  | "UPCOMING_EVENTS"
  | "NEWEST_PILOT"
  | "EMPLOYEE_RECOGNITION"
  | "METAR"
  | "WEATHER"
  | "CUSTOM_MESSAGE";

WorkflowStep {
  stepId: string;
  order: number;
  screenType: ScreenType;
  screenConfig: any;        // type-specific config (see screen docs)
  displaySeconds: number;   // 5-60 seconds typical
  isEnabled: boolean;
}
2.7 Board State
BoardState {
  boardId: string;        // FK -> Vestaboard
  workflowId?: string;    // active workflow at last update
  currentStepId?: string; // step currently on-screen
  lastRenderedAt?: Date;  // timestamp when the current step was last pushed
  lastMatrix?: number[][]; // optional debug/preview cache
}
3. Relationships
One Organization → many Users.
One Organization → many Vestaboards.
One Vestaboard → many Workflows. Exactly one isDefault = true.
One Workflow → many WorkflowSteps.
Manual data (Birthday, Checkride, UpcomingEvent, Pilot, EmployeeRecognition) are per-org.
CustomMessage entries are per-org.
BoardState is per-board.

---

## 03-screen-engine.md

```md
# VBT Vestaboard System – Screen Engine

## 1. Purpose

The **Screen Engine** is a backend module responsible for converting
high-level screen configurations into final 6×22 integer matrices suitable
for the Vestaboard Write API.

It handles:

- Template matrices (borders, decorations, static text).
- Text placement (alignment within ranges).
- Character-to-code mapping.
- Placeholder replacement (e.g., temperature, wind, dates).
- Screen-type-specific rendering logic.

## 2. Matrix Representation

- The Vestaboard is a **6×22** grid:

  ```txt
  Rows: 0-5 (top to bottom)
  Cols: 0-21 (left to right)
Internally represented as:
type Matrix = number[][]; // [6][22]
Template matrices are defined per screen type and are immutable constants
in the backend code.
3. Character Code Mapping
The mapping is consistent across all screens:
0 – Blank/space.
1-26 – A–Z.
27-36 – digits 1–0:
"1" => 27
"2" => 28
"3" => 29
"4" => 30
"5" => 31
"6" => 32
"7" => 33
"8" => 34
"9" => 35
"0" => 36
Color codes:
63 – Red (🔴)
64 – Orange (🟠)
65 – Yellow (🟡)
66 – Green (🟢)
67 – Blue (🔵)
68 – Purple (🟣)
69 – White (⚪)
Punctuation and special characters:
At least:
Space → 0
Apostrophe ' (used in "VBT'S") – assign a dedicated code from the Vestaboard map.
Degree symbol ° – mapped to existing code (e.g., 62 used in examples).
Other punctuation as needed.
The exact mapping must be implemented once in a central "charMap" function.
4. Alignment Helpers
The engine exposes helpers:
Center a string in a column range:
Input: text: string, startCol: number, endCol: number
Output: array of codes placed centrally, padded with 0.
Left-align a string:
Start at startCol, fill characters, then 0s until endCol.
Truncation:
If string > range length, truncate to fit (last character is dropped as needed).
5. Placeholders
Templates can specify “placeholder slots”:
Example placeholder definition:
Placeholder {
  key: string;              // "firstName", "date", "temp", "wind", etc.
  row: number;
  startCol: number;
  endCol: number;
  alignment: "left" | "center";
}
For weather templates, numeric placeholders like [36, 36] are prefilled in the template and then replaced with the converted digits for temperature or wind.
6. Rendering Pipeline
Given (screenType, screenConfig):
Load Template
Retrieve the static base matrix and placeholder definitions for screenType.
Retrieve Data
For manual screens, fetch data from Mongo (e.g., latest birthday/recognition).
For external screens, fetch METAR or OpenWeather data (or from cache).
For custom message screens, fetch the CustomMessage record.
Prepare Text Values
Format fields (e.g., time HHmm, date MM/DD).
Uppercase text as needed.
Apply truncation where necessary (e.g., description max 16 chars).
Apply Placeholders
For each placeholder entry, compute character codes and assign into the matrix.
For multi-row structures (e.g. Checkrides, Events lists), row placeholders are iterated.
Post-Processing
Ensure matrix dimensions are exactly 6×22.
Verify all codes are valid per mapping.
Return Matrix
The final number[][] matrix is returned to the caller (workflow runner or preview API).
7. ScreenType-specific Behaviors
Birthday:
Center OZ1 WISHES, FIRSTNAME, A HAPPY BIRTHDAY!, MM/DD in row ranges.
Checkrides:
First row header: CHECKRIDES MM/DD with date.
Rows 1–5: formatted lines TIME NAME TYPE TAG based on up to 5 checkrides.
Upcoming Events:
Header row "UPCOMING FLY OZ EVENTS".
Rows 1–5: DATE DESCRIPTION with padding.
Newest Pilot:
Complex border with colored cells.
PILOT NAME, VBT'S, NEWEST, PRIVATE PILOT centered in given ranges.
Employee Recognition:
Complex pattern with color codes.
RECOGNIZE, FIRSTNAME, LASTNAME, FOR ALWAYS, GOING THE, EXTRA MILE.
METAR/Weather:
Use condition-specific templates (CLOUDY vs SUNNY).
Replace placeholders for temperature, wind, station code, etc.
Custom Message:
Layout text lines inside an inner rectangle; border pattern defined by style.
8. Testing Strategy
Unit tests for:
Character mapping.
Alignment logic.
Each screen type rendering with sample data.
Snapshot tests for matrices to detect layout regressions.

---

## 04-manual-screens.md

```md
# VBT Vestaboard System – Manual Input Screens

This document defines the schemas, validations, templates, and behavior for
all **manual input** screen types.

---

## 1. Birthday Screen

### 1.1 Input Schema

```json
{
  "firstName": "string (required, trimmed)",
  "date": "string (required, MM/DD format, e.g., \"04/21\")"
}
Validation:
firstName: non-empty after trim.
date: must match regex
/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.
1.2 Template Matrix
[
  [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63],
  [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
  [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
  [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
  [63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63],
  [63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63, 63]
]
Red border: 63 around the edges.
Inner area (columns 1–20) is text content area.
1.3 Placeholders
Row 1 (index [1][1-20]): "OZ1 WISHES" (centered).
Row 2 (index [2][1-20]): firstName (centered).
Row 3 (index [3][1-20]): "A HAPPY BIRTHDAY!" (centered).
Row 4 (index [4][1-20]): date (centered, e.g. "04/21").
2. Checkrides Screen
2.1 Input Schema
{
  "time": "string (required, 4 digits military time, e.g., \"1230\")",
  "callsign": "string (required, max 6 chars, displayed as \"Name\")",
  "type": "string (required, either \"PPL\" or \"IFR\")",
  "destination": "string (required, max 6 chars, displayed as \"Flight Tag\")"
}
Validation:
time: 4 digits, 0000–2359.
callsign: max 6 characters.
destination: max 6 characters.
type: PPL or IFR.
Screen uses up to 5 Checkrides, typically filtered by date (if date is tracked).
2.2 Template Matrix
[
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]
All blank initially; all content is text.
2.3 Placeholders
Row 0: "CHECKRIDES MM/DD"
CHECKRIDES + space + date of the flights being shown.
Rows 1–5: per Checkride (up to 5):
Format: TIME (4) + space + NAME (6) + space + TYPE (3) + space + TAG (6)
Example: "1230 DAVIDL PPL N32851"
Truncate if needed to keep each line ≤ 22 characters.
3. Upcoming Events Screen
3.1 Input Schema
{
  "date": "string (required, MM/DD format, e.g., \"12/25\")",
  "time": "string (optional, 4 digits military time, e.g., \"1800\")",
  "description": "string (required, max 16 chars)"
}
Validation:
date: MM/DD (month 01–12, day 01–31).
time: optional; if provided, must be 4 digits 0000–2359.
description: max 16 characters.
3.2 Template Matrix
[
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
]
3.3 Placeholders
Row 0: "UPCOMING FLY OZ EVENTS".
Rows 1–5: up to 5 events:
Format: DATE (5 chars "MM/DD") + space + DESCRIPTION (16 chars padded)
Example: "12/25 CHRISTMAS PARTY ".
4. Newest Pilot (Private Pilot) Screen
4.1 Input Schema
{
  "name": "string (required, trimmed)"
}
Validation:
name: non-empty, trimmed.
4.2 Template Matrix
[
  [67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67],
  [63, 63, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 63, 63],
  [0, 63, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 63, 0],
  [0, 0, 63, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 63, 0, 0],
  [0, 0, 0, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 0],
  [0, 0, 0, 0, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 67, 0, 0, 0, 0]
]
Colored blue top/bottom, red band for text.
4.3 Placeholders
Row 1 [1][4-17]: pilotName (centered, 14 chars).
Row 2 [2][4-17]: "VBT'S" (centered).
Row 3 [3][4-17]: "NEWEST" (centered).
Row 4 [4][4-17]: "PRIVATE PILOT" (centered).
5. Employee Recognition Screen
5.1 Input Schema
{
  "firstName": "string (required, trimmed)",
  "lastName": "string (required, trimmed)"
}
Validation:
Both are non-empty, trimmed.
5.2 Template Matrix
[
  [0, 63, 0, 67, 0, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67],
  [0, 0, 67, 63, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67],
  [67, 67, 63, 69, 63, 67, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67],
  [0, 0, 67, 63, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67],
  [0, 63, 0, 67, 0, 63, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 63, 67]
]
5.3 Placeholders
Row 0 [0][7-18]: "RECOGNIZE".
Row 1 [1][7-18]: firstName (left-aligned, max 12 chars).
Row 2 [2][7-18]: lastName (centered in 12 chars).
Row 3 [3][7-18]: "FOR ALWAYS".
Row 4 [4][7-18]: "GOING THE".
Row 5 [5][7-18]: "EXTRA MILE".
Rendering rules:
Truncate long names to fit.
Pad with spaces (code 0) to fill the range.

---

## 05-external-screens-weather-metar.md

```md
# VBT Vestaboard System – External Data Screens (METAR & Weather)

## 1. Overview

External-data screens are:

1. **METAR** – raw/current METAR for KVBT (or other configured station).
2. **Weather** – OpenWeatherMap current conditions for a configured city.

Both screens:

- Fetch real-time data from external APIs.
- Convert to structured data.
- Render using predefined templates.

## 2. METAR Screen

### 2.1 Data Source

- API: `https://aviationweather.gov/api/data/metar?ids=KVBT`
- HTTP method: `GET`.

Example configuration (conceptual):

```json
{
  "type": "Http",
  "inputs": {
    "uri": "https://aviationweather.gov/api/data/metar?ids=KVBT",
    "method": "GET"
  },
  "runAfter": {
    "METAR": [
      "Succeeded"
    ]
  },
  "runtimeConfiguration": {
    "contentTransfer": {
      "transferMode": "Chunked"
    }
  }
}
The system should:
Perform HTTPS GET on the backend.
Parse the METAR text.
Extract main elements (wind, visibility, clouds, etc.) as needed.
2.2 Screen Behavior
At minimum, the METAR screen displays the raw or lightly formatted METAR string,
potentially split across multiple lines with consistent alignment.
The template for METAR is flexible (you can add later), but must fit within 6×22.
Note: The METAR screen can be simple initially:
Row 0: "METAR KVBT".
Rows 1–5: wrapped METAR text lines.
3. Weather Screen (OpenWeatherMap)
3.1 API Specification
Endpoint:
https://api.openweathermap.org/data/2.5/weather?q={location}&units=imperial&appid={apiKey}
Environment variables:
OPENWEATHER_API_KEY – OpenWeatherMap API key.
OPENWEATHER_LOCATION – e.g. "Bentonville,US".
3.2 Data Extracted
Temperature (°F) – rounded to nearest integer.
Wind speed (mph) – rounded to nearest integer.
Weather description string – e.g., "Clear", "Clouds", "Rain".
3.3 Weather Templates
3.3.1 CLOUDY Template
Used for "cloud", "rain", or as default fallback.
[
  [0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 12, 15, 21, 4, 25, 0, 69, 69, 69, 69, 69, 69, 0, 0, 69, 69, 69, 69, 69, 0, 0],
  [36, 36, 4, 5, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 69, 69, 69, 0],
  [36, 36, 13, 16, 8, 0, 0, 69, 69, 69, 69, 69, 69, 69, 0, 0, 0, 0, 0, 0, 0, 0],
  [11, 22, 2, 20, 0, 0, 69, 69, 69, 69, 69, 69, 69, 69, 69, 0, 0, 69, 69, 69, 69, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 69, 69, 69, 69, 69]
]
Visual intention:
Row 0: top cloud cluster (69 = white).
Row 1: "CLOUDY" + clouds.
Row 2: [TEMP] DEG with some clouds.
Row 3: [WIND] MPH with clouds.
Row 4: "KVBT" header with clouds.
Row 5: bottom cloud cluster.
36, 36 entries in rows 2 and 3 are placeholders for numeric values (temperature, wind).
3.3.2 CLEAR/SUNNY Template
Used when description includes "clear".
[
  [0, 0, 0, 0, 65, 65, 65, 65, 65, 65, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 65, 65, 65, 64, 64, 64, 64, 65, 65, 65, 0, 0, 0, 19, 21, 14, 14, 25, 0, 0],
  [0, 65, 65, 64, 64, 64, 63, 63, 64, 64, 64, 65, 65, 0, 0, 36, 36, 4, 5, 7, 0, 0],
  [65, 65, 64, 64, 63, 63, 63, 63, 63, 63, 64, 64, 65, 65, 0, 36, 36, 13, 16, 8, 0, 0],
  [0, 0, 0, 0, 23, 5, 12, 3, 15, 13, 5, 0, 20, 15, 0, 22, 2, 20, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 5, 14, 20, 15, 14, 20, 9, 12, 12, 5, 55, 1, 18, 0, 0, 0, 0]
]
Visual intention:
Rows 0–3: sun icon (yellow/orange/red).
Row 1: "SUNNY".
Row 2: [TEMP] DEG.
Row 3: [WIND] MPH.
Row 4: "WELCOME TO VBT".
Row 5: "BENTONVILLE.AR".
Codes:
65 = yellow (sun rays).
64 = orange (middle sun).
63 = red (sun center).
36, 36 = placeholders for numeric values.
4,5,7 = "D" "E" "G".
13,16,8 = "M" "P" "H".
3.4 Placeholder Replacement
Examples:
Temperature 72°F:
[33, 28, 62, 6]
33 = "7", 28 = "2", 62 = "°", 6 = "F".
Wind 15 mph:
[27, 31] for digits "1" and "5".
Exact degree code (62) is based on your char map.
3.5 Template Selection Logic
If weather.description contains "cloud" (case-insensitive) → CLOUDY template.
If weather.description contains "clear" → SUNNY template.
Else → CLOUDY template (fallback).
3.6 Caching
To avoid rate limits and unnecessary calls:
Cache the last weather/METAR results per board or per location.
TTL: 2–5 minutes typical.
Workflow runner uses cached data if available and fresh.

---

## 06-custom-message-screens.md

```md
# VBT Vestaboard System – Custom Message Screens

## 1. Purpose

Custom message screens allow VBT staff to quickly display arbitrary text with
decorative borders and minimal configuration. They are useful for announcements,
simple greetings, or ad-hoc messages.

## 2. Data Model

See `CustomMessage` in the domain model:

```ts
CustomMessage {
  id: string;
  orgId: string;
  title: string;
  message: string;
  style: string;       // e.g. "rainbow_border"
  maxLines?: number;
  createdBy?: string;
  createdAt: Date;
}
title: short label for selection in UI (e.g., "Hangar Safety Reminder").
message: arbitrary text; may include spaces and punctuation.
style: determines border color pattern.
maxLines: optional override (default ~4 for comfortable text inside border).
3. Template Structure
Custom messages generally follow:
Outer border (colors).
Inner text area.
Example conceptual template:
Row 0: [border]
Row 1: [border col 0] TEXT TEXT ... TEXT [border col 21]
Row 2: [border col 0] TEXT ...                   [border col 21]
Row 3: [border col 0] TEXT ...                   [border col 21]
Row 4: [border col 0] TEXT ...                   [border col 21]
Row 5: [border]
The exact matrix depends on style:
3.1 Example Styles (Conceptual)
"solid_red":
Top/bottom rows: all 63 (red).
Left/right columns: 63.
"blue_corners":
Corners: 67 (blue).
Edges: mix of 63 and 67.
"rainbow_border":
Use 63–69 in a repeating pattern around the edges.
The inner area (rows 1–4, cols 1–20) is dedicated to text.
4. Layout Algorithm
Split Message into Lines
Max inner width: 20 chars.
Wrap plaintext into lines of ≤20 characters.
Respect maxLines if provided; otherwise default to 4 lines.
Truncate excess text with a visual indication (...) or silently.
Center or Left-align
Basic rule:
Use center for short messages where each line stands alone.
Provide options in UI to choose alignment for advanced use; default center.
Assign to Rows
Map lines to inner rows:
For four lines, rows 1–4.
For fewer lines, vertical centering can be considered (optional).
Convert to Codes
For each character, use the char map.
Unknown characters either:
Omitted, or
Replaced with a placeholder (e.g., space).
Merge with Border Template
Start from border template for the selected style.
Insert text codes into inner cells.
5. Usage in Workflows
A workflow step for a custom message:
WorkflowStep {
  stepId: string;
  order: number;
  screenType: "CUSTOM_MESSAGE";
  screenConfig: {
    customMessageId: string;
  };
  displaySeconds: number;
  isEnabled: boolean;
}
At render time, the Screen Engine:
Loads the CustomMessage by customMessageId.
Loads the border template using style.
Computes text layout and returns the matrix.
6. UI Behavior
Custom Messages Page
List existing messages with title, style.
“Create New Message” form:
Title
Text area for message
Style selector (dropdown with preview).
Optional maxLines.
Preview panel for how the message will appear on Vestaboard.
Workflow Builder
When adding a step with CUSTOM_MESSAGE, user selects from a dropdown of titles.
Step preview uses the same Screen Engine preview endpoint.

---

## 07-workflows-and-scheduling.md

```md
# VBT Vestaboard System – Workflows and Scheduling

## 1. Overview

Workflows are **playlists of screens** for a single Vestaboard. They define:

- Which screens are displayed.
- In what order.
- For how long.
- When (schedule) they are active.

Each Vestaboard:

- Has one **default workflow** (always available as fallback).
- Can have multiple **special workflows** with schedules that override the default.

## 2. Workflow Structure

See domain model:

```ts
Workflow {
  workflowId: string;
  orgId: string;
  boardId: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  schedule: WorkflowSchedule;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
}
2.1 Steps
WorkflowStep {
  stepId: string;
  order: number;
  screenType: ScreenType;
  screenConfig: any;
  displaySeconds: number;
  isEnabled: boolean;
}
order determines playlist sequence.
displaySeconds is the dwell time for each step.
screenConfig is type-specific.
3. Scheduling Model
3.1 Schedule Types
Always-on:
{ type: "always" }
Daily Window:
{
  type: "dailyWindow",
  startTimeLocal: "08:00", // inclusive
  endTimeLocal: "17:00",   // exclusive
  daysOfWeek: [1,2,3,4,5]  // Mon–Fri
}
Specific Date Range:
{
  type: "specificDateRange",
  startDate: "2025-04-21",
  endDate: "2025-04-21",
  startTimeLocal: "09:00",
  endTimeLocal: "17:00",
  daysOfWeek: [1,2,3,4,5] // optional
}
Used mainly for “Pin this screen for a day”.
3.2 Active Workflow Determination
For a given board and timestamp now (local to the board):
Find all workflows for that board where isActive = true.
Filter workflows whose schedule is currently valid:
For always → always valid.
For dailyWindow:
now’s day-of-week in daysOfWeek.
startTimeLocal <= now.time < endTimeLocal.
For specificDateRange:
startDate <= now.date <= endDate.
startTimeLocal <= now.time < endTimeLocal.
If multiple workflows match:
If any are non-default, pick the most “specific” one:
Prefer specificDateRange over dailyWindow over always.
If tie, use last updated or explicit priority field.
If none match:
Use the board’s defaultWorkflowId if that workflow is active.
If even default is not active, board displays nothing or last matrix.
3.3 Override Logic
Special workflows (non-default) override default when their schedule is active.
When the special workflow window ends:
Next scheduler run will no longer see them as active.
The board falls back to the default workflow automatically.
4. Rotating Through Steps
The scheduler operates at regular intervals (e.g., every minute).
4.1 BoardState
BoardState {
  boardId: string;
  workflowId?: string;
  currentStepId?: string;
  lastRenderedAt?: Date;
  lastMatrix?: number[][];
}
4.2 Step Advancement Logic
Given BoardState and the active workflow:
If workflowId in state differs from active workflow:
Reset:
currentStepId = firstEnabledStepId.
lastRenderedAt = null.
If currentStepId is not set:
Set to first enabled step.
If lastRenderedAt is null or now - lastRenderedAt >= currentStep.displaySeconds:
Advance to next enabled step (order ascending, wrap around at end).
Render that step via Screen Engine.
Push matrix to Vestaboard.
Update:
workflowId = activeWorkflowId.
currentStepId = newStepId.
lastRenderedAt = now.
lastMatrix = matrix.
If now - lastRenderedAt < displaySeconds:
Do nothing.
5. “Pin This Screen for a Day” UX
5.1 Concept
User wants to temporarily show one or two screens for a particular window,
then revert to normal ops.
5.2 Implementation
When user invokes the “Pin this screen” flow:
UI gathers:
Target board.
Selected screen type(s) and configurations.
Date (YYYY-MM-DD).
Start time and end time (local).
Backend creates a new workflow:
Workflow {
  workflowId: "pin-...-timestamp",
  orgId: "VBT",
  boardId,
  name: "Pinned – {screenType(s)}",
  isDefault: false,
  isActive: true,
  schedule: {
    type: "specificDateRange",
    startDate: chosenDate,
    endDate: chosenDate,
    startTimeLocal,
    endTimeLocal
  },
  steps: [... 1 or 2 steps ...]
}
No manual action is needed to revert. Once window ends:
Scheduler sees that the pinned workflow is no longer valid.
Default workflow becomes active again.
5.3 UI Considerations
“Pin this screen” wizard:
Step 1: Choose board.
Step 2: Choose screen type and configuration (e.g., a specific custom message).
Step 3: Choose date/time window.
Step 4: Review & confirm preview.
The wizard should clearly indicate:
“During this window, this pinned workflow will override your normal workflow.”

---

## 08-api-design.md

```md
# VBT Vestaboard System – API Design

All endpoints are scoped to a single org (VBT) and require authentication
unless otherwise noted.

Base path assumed: `/api`.

---

## 1. Authentication

### 1.1 POST /api/auth/login

**Request**

```json
{
  "email": "user@example.com",
  "password": "plain-text-password"
}
Response (200)
{
  "user": {
    "userId": "u_123",
    "email": "user@example.com",
    "role": "editor"
  }
}
Sets an HTTP-only cookie or returns a bearer token (implementation choice).
Errors
400 – missing fields.
401 – invalid credentials.
429 – rate limited.
1.2 POST /api/auth/logout
No body required.
Clears auth cookie or invalidates token.
2. Me / Users
2.1 GET /api/me
Returns current authenticated user.
Response
{
  "userId": "u_123",
  "email": "user@example.com",
  "role": "editor"
}
3. Boards
3.1 GET /api/boards
Returns boards for current org.
Response
[
  {
    "boardId": "b_lobby",
    "name": "Lobby Board",
    "locationLabel": "Bentonville, AR",
    "isActive": true,
    "defaultWorkflowId": "wf_default_lobby"
  }
]
3.2 GET /api/boards/:boardId
Returns board details plus active workflow and state summary.
Response
{
  "boardId": "b_lobby",
  "name": "Lobby Board",
  "locationLabel": "Bentonville, AR",
  "isActive": true,
  "defaultWorkflowId": "wf_default_lobby",
  "activeWorkflow": {
    "workflowId": "wf_default_lobby",
    "name": "Default Ops"
  },
  "currentScreenSummary": {
    "screenType": "WEATHER",
    "stepId": "step_3",
    "lastRenderedAt": "2025-12-02T15:00:00Z"
  }
}
4. Manual Data Endpoints
All manual data endpoints are per-org, sorted by createdAt descending by default.
4.1 Birthdays
GET /api/birthdays
Optional query: ?date=MM/DD to filter.
Response
[
  {
    "id": "bd_1",
    "firstName": "CARLOS",
    "date": "04/21",
    "createdAt": "2025-01-01T12:00:00Z"
  }
]
POST /api/birthdays
Request
{
  "firstName": "Carlos",
  "date": "04/21"
}
Response (201)
{
  "id": "bd_1",
  "firstName": "CARLOS",
  "date": "04/21",
  "createdAt": "2025-01-01T12:00:00Z"
}
Validation errors return 400 with details.
4.2 Checkrides
GET /api/checkrides
Optional query ?date=MM/DD.
Response
[
  {
    "id": "cr_1",
    "time": "1230",
    "callsign": "DAVIDL",
    "type": "PPL",
    "destination": "N32851",
    "date": "12/02"
  }
]
POST /api/checkrides
Request
{
  "time": "1230",
  "callsign": "DavidL",
  "type": "PPL",
  "destination": "N32851",
  "date": "12/02"
}
4.3 Upcoming Events
GET /api/events
Response
[
  {
    "id": "ev_1",
    "date": "12/25",
    "time": "1800",
    "description": "CHRISTMAS PARTY"
  }
]
POST /api/events
Request
{
  "date": "12/25",
  "time": "1800",
  "description": "Christmas Party"
}
4.4 Newest Pilot
GET /api/pilots/current
Response
{
  "id": "p_1",
  "name": "ALYSON GARCIA",
  "isCurrent": true
}
POST /api/pilots
Creating a new current pilot implicitly deactivates previous current ones.
Request
{
  "name": "Alyson Garcia"
}
Response
{
  "id": "p_2",
  "name": "ALYSON GARCIA",
  "isCurrent": true
}
4.5 Employee Recognition
GET /api/recognitions/current
Response
{
  "id": "er_1",
  "firstName": "CARLOS",
  "lastName": "ZAMORA",
  "isCurrent": true
}
POST /api/recognitions
Request
{
  "firstName": "Carlos",
  "lastName": "Zamora"
}
5. Custom Messages
5.1 GET /api/custom-messages
Response
[
  {
    "id": "cm_1",
    "title": "HANGAR SAFETY",
    "style": "rainbow_border",
    "createdAt": "2025-02-01T12:00:00Z"
  }
]
5.2 GET /api/custom-messages/:id
Returns full details.
5.3 POST /api/custom-messages
Request
{
  "title": "Hangar Safety",
  "message": "PLEASE WEAR HEARING PROTECTION",
  "style": "solid_red",
  "maxLines": 3
}
6. Workflows
6.1 GET /api/workflows?boardId=...
Response
[
  {
    "workflowId": "wf_default_lobby",
    "name": "Default Ops",
    "isDefault": true,
    "isActive": true,
    "schedule": { "type": "always" },
    "steps": [
      {
        "stepId": "st_1",
        "order": 1,
        "screenType": "METAR",
        "screenConfig": {},
        "displaySeconds": 15,
        "isEnabled": true
      }
    ]
  }
]
6.2 POST /api/workflows
Create a new workflow.
Request
{
  "boardId": "b_lobby",
  "name": "Birthday Special",
  "isDefault": false,
  "schedule": {
    "type": "specificDateRange",
    "startDate": "2025-04-21",
    "endDate": "2025-04-21",
    "startTimeLocal": "09:00",
    "endTimeLocal": "17:00"
  },
  "steps": [
    {
      "screenType": "BIRTHDAY",
      "screenConfig": { "mode": "latest" },
      "displaySeconds": 20,
      "isEnabled": true
    }
  ]
}
Response
Returns created workflow with generated workflowId and stepIds.
6.3 PATCH /api/workflows/:workflowId
Update name, schedule, steps, isActive, isDefault (admin-only for default).
6.4 POST /api/boards/:boardId/set-default-workflow
Request
{
  "workflowId": "wf_default_lobby"
}
7. Preview Endpoint
7.1 POST /api/screens/preview
Used by frontend to show how a given step will look.
Request
{
  "screenType": "WEATHER",
  "screenConfig": {
    "locationOverride": "Bentonville,US"
  }
}
Response
{
  "matrix": [
    [0, 0, ... 22cols],
    ...
  ]
}
8. Scheduler / System Endpoint (Internal)
8.1 POST /api/system/run-scheduler (internal / cron)
No body. When invoked:
Evaluates active workflows for each board.
Determines next screen per board.
Renders and pushes to Vestaboard when needed.
Access restricted to internal calls or protected via secret token.

---

## 09-auth-and-security.md

```md
# VBT Vestaboard System – Auth and Security

## 1. Authentication Model

- **Email + password**.
- Passwords are never stored in plain text.

### 1.1 Registration

- In production, user creation is controlled by admins via internal tools
  (no public self-signup).
- New users:
  - Have `orgId = "VBT"`.
  - Are assigned a role (admin/editor/viewer).

### 1.2 Login

- Endpoint: `POST /api/auth/login`.
- On success:
  - Issue a signed JWT or session ID.
  - Store in HTTP-only cookie with `Secure` and `SameSite` attributes.

### 1.3 Logout

- Endpoint: `POST /api/auth/logout`.
- Clears cookie or marks token invalid.

## 2. Authorization

- **Roles**:
  - `admin`:
    - Manage users.
    - Manage boards.
    - Set default workflows.
    - Full CRUD on workflows and data.
  - `editor`:
    - CRUD on manual data and custom messages.
    - Manage workflows for existing boards.
    - Cannot create/delete boards or users.
  - `viewer`:
    - Read-only access.
    - Can see dashboards and previews, not modify.

- Each API endpoint checks:
  - Authenticated session.
  - Role-based permissions.

## 3. Password Security

- Use strong hashing (e.g., bcrypt) with proper cost factor.
- Enforce minimum password complexity:
  - Length ≥ 8.
  - Or integrate with corporate SSO in future.

## 4. Session Security

- Use HTTP-only cookies with:
  - `Secure` (HTTPS only).
  - `SameSite=Lax` or `Strict` as appropriate.
- Short TTL for tokens (e.g., 1 day) with refresh logic if needed.

## 5. Secrets and Keys

Environment variables (never exposed to frontend):

- `MONGODB_URI`
- `JWT_SECRET`
- `OPENWEATHER_API_KEY`
- `OPENWEATHER_LOCATION` (default location)
- `VESTABOARD_WRITE_KEY_*` (or stored encrypted in DB per board)
- Any cron secret key for scheduler endpoint.

Load them server-side only.

## 6. API Security

- Rate limiting:
  - Login endpoint is rate-limited by IP/user to prevent brute-force.
- Input validation:
  - Central validation layer for all user input.
  - Return structured errors; never echo raw DB/stack traces.

## 7. Data Privacy

- Single org; no cross-org data issues.
- Access to manual data is limited to logged-in users (VBT staff).

## 8. Logging and Monitoring

- Log:
  - Auth attempts (without passwords).
  - Scheduler runs and push failures to Vestaboard.
  - External API failures (METAR, Weather).
- Use structured logging to help debug scheduling and rendering issues.

10-frontend-ux-structure.md
# VBT Vestaboard System – Frontend UX Structure

## 1. Overview

Frontend is a React SPA (TypeScript recommended). It provides:

- Authentication.
- Data input/management.
- Workflow configuration.
- Dashboard + previews.
- “Pin this screen” wizard.

## 2. Routing Structure

Example routes:

- `/login`
- `/` → Dashboard
- `/boards`
- `/boards/:boardId`
- `/screens`
  - `/screens/birthdays`
  - `/screens/checkrides`
  - `/screens/events`
  - `/screens/newest-pilot`
  - `/screens/recognition`
  - `/screens/custom-messages`
- `/workflows`
  - `/workflows/:boardId`
- `/pin` (Pin this screen wizard)

## 3. Core Pages

### 3.1 Login Page

- Email + password form.
- Error messaging on failed login.
- On success, redirect to `/`.

### 3.2 Dashboard

- Board selector (dropdown).
- Current board summary:
  - Active workflow name.
  - Current screen type.
  - Last updated time.
- Preview pane:
  - Renders 6×22 matrix as colored tiles.
- Quick actions:
  - “Manage Workflows”.
  - “Pin a Screen”.

### 3.3 Data Management Pages

Each manual data type has a dedicated page:

#### Birthdays

- Table:
  - First name.
  - Date.
  - Created at.
- New Birthday form:
  - First name.
  - Date (MM/DD).
- Inline validation.
- Preview panel:
  - Shows Birthday screen using `/api/screens/preview`.

Similar pattern for:

- Checkrides.
- Upcoming Events.
- Newest Pilot.
- Employee Recognition.

#### Custom Messages

- List:
  - Title.
  - Style.
- Create form:
  - Title.
  - Message (textarea).
  - Style selector.
  - Optional maxLines.
- Preview panel showing border style and wrapped text.

### 3.4 Workflows Page

#### Board Selector

- Dropdown to select a board.
- Once selected, show all workflows for that board in a side list.

#### Workflow List Pane

- For selected board:
  - List:
    - Workflow name.
    - Tags: [Default], [Active], [Scheduled].
  - Actions:
    - Create new workflow.
    - Toggle `isActive` ( except default can't be deactivated if it is only fallback).
    - Set as default (admin-only).

#### Workflow Editor Pane

For the selected workflow:

- **Properties**
  - Workflow name (editable).
  - Is default (toggle, admin-only).
  - Schedule editor (see below).

- **Steps Editor**
  - Steps displayed as a vertical list.
  - Each step row has:
    - Drag handle (for reordering).
    - `screenType` dropdown.
    - Config area (type-specific).
    - `displaySeconds` input (number).
    - Enable/disable toggle.
    - Delete button.
  - “Add step” button at bottom.

- **Preview**
  - On selecting a step, show preview:
    - `POST /api/screens/preview` with `screenType` and `screenConfig`.
  - Optional “cycle preview” mode to auto-advance through steps for demonstration.

#### Schedule Editor

- Controls:
  - Radio buttons:
    - Always on
    - Daily window
    - Specific date range
  - Time pickers (start/end).
  - Day-of-week toggles (Mon–Sun).
  - Date pickers where applicable.

---

## 4. “Pin This Screen” Wizard

Route: `/pin`

Steps:

1. **Choose Board**
   - Dropdown of boards.

2. **Choose Screen(s)**
   - Option: “Single screen” or “Two screens alternating”.
   - For each chosen screen:
     - ScreenType dropdown (METAR, WEATHER, BIRTHDAY, CUSTOM_MESSAGE, etc.).
     - Type-specific configuration (e.g., which custom message ID).

3. **Schedule**
   - Pick date (default: today).
   - Pick start time and end time.

4. **Review**
   - Show summary:
     - Board.
     - Screen types.
     - Date/time window.
   - Show a preview of at least the first screen.
   - “Create pinned workflow” button, which calls `/api/workflows`.

---

## 5. UI Patterns

- Input validation:
  - Inline errors for invalid dates, times, string lengths.
- Consistent design:
  - Use a component library if desired (e.g., MUI, Chakra, etc.) or custom design.
- Accessibility:
  - Ensure forms and interactive elements are keyboard-accessible.
  - Color contrast for matrix preview where possible.

11-backend-services-and-integration.md
# VBT Vestaboard System – Backend Services and Integration

## 1. Backend Structure

Backend is a Node.js app (Express or similar) organized into logical modules:

- `auth` – authentication, sessions.
- `users` – user management.
- `boards` – Vestaboard config.
- `workflows` – workflow CRUD and schedule evaluation.
- `data` – manual data (birthdays, checkrides, etc.).
- `customMessages` – custom message CRUD.
- `screenEngine` – rendering engine.
- `externalClients` – wrappers for METAR and OpenWeather APIs.
- `scheduler` – orchestrates workflow execution per board.
- `vestaboardClient` – pushes matrices to Vestaboard.

## 2. Module Responsibilities

### 2.1 Auth Module

- Login verification (email/password).
- Password hashing and checking.
- Token or session issuance.

### 2.2 Users Module

- List users (admin).
- Create user (admin).
- Change role (admin).

### 2.3 Boards Module

- CRUD for boards (admin).
- Association with workflows.
- Hand-off to `vestaboardClient` with per-board credentials.

### 2.4 Data Modules

- `birthdays`, `checkrides`, `events`, `pilots`, `recognitions`:
  - CRUD operations, with validations.
  - Provide domain-level queries (e.g., “get events sorted by date”, “get current pilot”).

### 2.5 CustomMessages Module

- CRUD for custom messages.
- Provide styling info to screen engine.

### 2.6 ScreenEngine Module

- Single entry point: `render(screenType, screenConfig)`:
  - Fetches underlying data if necessary.
  - Applies templates and mapping to produce a matrix.
- Also exposes a `preview` function for `/api/screens/preview`.

### 2.7 External Clients

#### METAR Client

- Function: `getMetar(stationId: string): Promise<MetarData>`.
- Handles raw HTTP GET and parsing.
- Caches results for short duration.

#### OpenWeather Client

- Function: `getWeather(location: string): Promise<WeatherData>`.
- Calls OWM API using `OPENWEATHER_API_KEY`.
- Extracts temp, wind, description.
- Caches results.

### 2.8 Vestaboard Client

- Function: `sendMatrix(board: Vestaboard, matrix: number[][]): Promise<void>`.
- Uses board’s `vestaboardWriteKey`.
- Handles API-specific payload format.

### 2.9 Scheduler

- Function: `runSchedulerNow(): Promise<void>`.
- Steps:
  1. Load all active boards.
  2. For each board:
     - Determine active workflow via `workflowService.getActiveWorkflow(boardId, now)`.
     - Load `BoardState`.
     - Determine if step change is required.
     - If yes:
       - Render matrix via `screenEngine.render`.
       - Call `vestaboardClient.sendMatrix`.
       - Update `BoardState`.

- Exposed as internal API endpoint `/api/system/run-scheduler`, invoked via cron.

## 3. Integration Flow Example

For a given board at scheduler tick:

1. `scheduler` → `workflowService`:
   - Determine active workflow.
2. `scheduler` → `boardStateService`:
   - Get `BoardState`.
3. `scheduler`:
   - Choose which step to display.
4. `scheduler` → `screenEngine`:
   - `render(screenType, screenConfig)`.
   - `screenEngine` → `dataModules` / `externalClients` as needed.
5. `scheduler` → `vestaboardClient`:
   - `sendMatrix(board, matrix)`.
6. `scheduler` → `boardStateService`:
   - Update stored state.

12-operations-and-deployment.md
# VBT Vestaboard System – Operations and Deployment

## 1. Deployment Targets

- **Frontend:** Vercel (React app).
- **Backend:** Vercel serverless functions (Node.js).
- **Database:** MongoDB Atlas.

## 2. Environments

- `development`
- `staging` (optional)
- `production`

Each with distinct:

- Mongo connection strings.
- API keys (OpenWeather).
- Vestaboard credentials.

## 3. Environment Variables

| Name                     | Description                                  |
|--------------------------|----------------------------------------------|
| MONGODB_URI              | MongoDB connection string                    |
| JWT_SECRET               | Secret for signing JWT tokens                |
| OPENWEATHER_API_KEY      | OpenWeatherMap API key                       |
| OPENWEATHER_LOCATION     | Default location, e.g., "Bentonville,US"     |
| VESTABOARD_WRITE_KEY_*   | Write keys per board (or stored in DB)       |
| CRON_SECRET              | Secret used to protect scheduler endpoint    |

Environment variables are configured in Vercel project settings.

## 4. Build & Deploy

- Frontend:
  - `npm run build` (React).
  - Deployment triggered on push to main branch (CI).
- Backend:
  - Vercel functions auto-deployed on code changes.
  - Node version pinned in configuration.

## 5. Scheduler Setup

- Use Vercel Cron to hit `/api/system/run-scheduler`:
  - Every minute or every 30 seconds depending on granularity needed.
- Protect endpoint with:
  - `CRON_SECRET` query parameter or header.

Example cron schedule:

- `* * * * *` (every minute).

## 6. Logging and Monitoring

- Use structured logging in backend:
  - `console.log` with JSON format, consumed by Vercel logs.
- Optionally integrate:
  - Log aggregation service (e.g., Datadog, Logtail).
- Monitor:
  - Error rates.
  - Scheduler success/failure counts.
  - External API failure rates.

## 7. Backups

- Rely on MongoDB Atlas backups.
- Optionally export configuration collections periodically (workflows, boards).

## 8. Incident Handling

- If scheduler fails:
  - Error logs should capture stack trace.
  - Board might show last successful matrix.
- Recovery steps:
  - Fix underlying bug.
  - Manually trigger scheduler endpoint.

13-data-validation-and-error-handling.md
# VBT Vestaboard System – Data Validation and Error Handling

## 1. Validation Strategy

Validation occurs at:

- **Frontend** (early feedback).
- **Backend** (source of truth).

All inputs must pass backend validation before being persisted.

## 2. Manual Data Validation

### 2.1 Common Rules

- All strings are `.trim()`ed server-side.
- All dates `MM/DD` validated with regex:
  - `/^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/`.

### 2.2 Birthday

- `firstName`:
  - Required.
  - Non-empty after trim.
- `date`:
  - Required.
  - Must match date regex.

### 2.3 Checkride

- `time`:
  - Required.
  - 4 digits.
  - `0000`–`2359`.
- `callsign`:
  - Required.
  - Max length 6.
- `type`:
  - Required.
  - Must be `"PPL"` or `"IFR"`.
- `destination`:
  - Required.
  - Max length 6.
- `date` (if used):
  - Same MM/DD validation.

### 2.4 Upcoming Event

- `date`: Required, `MM/DD`.
- `time`: Optional, but if set, must be 4-digit `0000`–`2359`.
- `description`: Required, length ≤ 16.

### 2.5 Newest Pilot

- `name`: Required, trimmed, non-empty.

### 2.6 Employee Recognition

- `firstName`: Required, trimmed.
- `lastName`: Required, trimmed.

### 2.7 Custom Message

- `title`: Required, trimmed, non-empty.
- `message`: Required, trimmed, non-empty.
- `style`: Required, must be one of supported styles.
- `maxLines`: Optional; if provided, must be a positive integer and ≤ 4 or 5.

## 3. Workflow Validation

- At least one step in `steps` array.
- For each step:
  - `screenType` is valid.
  - `displaySeconds` between reasonable bounds (e.g., 5–120).
  - `screenConfig` validated per `screenType` (e.g., must reference an existing `customMessageId`).
- `schedule`:
  - `type` is valid enum.
  - Time strings are well-formed (`HH:mm`).
  - Date strings `YYYY-MM-DD` valid.
  - `daysOfWeek` contains only integers 0–6.

## 4. Error Handling and Response Format

### 4.1 Error Response Structure

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": {
      "fieldErrors": {
        "date": "Invalid format; expected MM/DD.",
        "description": "Must be <= 16 characters."
      }
    }
  }
}
Common code values:
VALIDATION_ERROR
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
INTERNAL_ERROR
RATE_LIMITED
4.2 Frontend Handling
Display message in a toast or inline alert.
Field-specific errors shown next to inputs.
5. Screen Engine Errors
If rendering fails (e.g., missing data):
Log detailed error server-side.
Return a fallback matrix that indicates an error (optional) or skip the screen for that cycle.
For preview:
Return error response to frontend, which shows a human-readable message.
6. External API Errors (METAR, Weather)
If METAR or OpenWeather call fails:
Use cached result if available.
If no cache:
Render a fallback screen:
Row 0: "WEATHER ERROR" or "METAR ERROR".
Indicate “DATA UNAVAILABLE”.
Log error with HTTP status and body.

---

## 14-future-extensions-and-design-constraints.md

```md
# VBT Vestaboard System – Future Extensions and Design Constraints

## 1. Design Principles

- **Single Source of Truth**:
  - Backend is authoritative for workflows, schedules, and rendering rules.
- **Predictable Behavior**:
  - Workflow overrides and “pin screen” behavior must be easy to understand for users.
- **Safety and Robustness**:
  - Fail gracefully when external APIs fail.
  - Avoid overloading Vestaboard API with too many writes.

## 2. Performance Constraints

- Vestaboard API:
  - Calls should be limited (e.g., at most 1 update per board per 5–60 seconds, as configured by `displaySeconds`).
- Scheduler:
  - Must be efficient even as workflows and boards increase (though currently single org).
  - Use caching for external data.

## 3. Extensibility

Potential future additions:

- Additional screen types:
  - E.g., “Quote of the Day”, “Random Fun Fact”.
- Multi-org support:
  - Introduce `orgId` in more places, separate config per org.
- Advanced scheduling:
  - Per-date-specific workflows for holidays.
- User-specific permissions:
  - Limit which boards certain users can manage.

## 4. UI Enhancements

- Drag-and-drop board layout preview.
- Workflow comparison and cloning.
- Template library UI for custom border styles.

## 5. Testing

- End-to-end tests:
  - Simulate login, create data, configure workflows, run scheduler (mocked).
- Integration tests:
  - Validate Screen Engine output for example data sets.
- Load tests:
  - Validate scheduler behavior with multiple boards and workflows.

## 6. Non-Functional Requirements

- Availability:
  - Aim for 99.9% uptime for production.
- Observability:
  - Centralized logging and metric dashboards for scheduler runs.
- Security:
  - Keep dependencies updated.
  - Apply secure coding practices for Node and React.
