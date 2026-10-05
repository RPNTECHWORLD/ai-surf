### Changes on 03-08-2026

#### 1. User Management & Authentication (RBAC)
- **Role-Based Access Control (RBAC)**: Distinct account workflows configured for **Athletes (Students)**, **Coaches (Instructors)**, and **Admins**.
- **Backend Security & Session Management**: Zero-dependency password hashing (`PBKDF2-HMAC`) and custom HMAC-SHA256 signed session tokens, guaranteeing stable execution on Windows.
- **SSO Simulation**: Simulated Google and Apple ID Single Sign-On workflows, including an intermediate role-selection step for first-time signups.
- **Figma Split-Screen Login Page**: Refactored `AuthPage.jsx` to support a premium split-screen layout, featuring a compact 720px right panel (optimized with double columns and reduced vertical padding/margins to fit without scrolling) and a left-hand high-fidelity surfing hero panel. Includes full autofill override styling to prevent browser color hijacking.
- **Dynamic Sidebar**: Renders navigation paths dynamically by checking the active user's role, and includes an avatar/name footer with a Logout trigger.
- **Profile Edits & Modals**: Added in-page "Edit Profile" buttons and form modals for both Athletes and Coaches, syncing inputs directly with database PUT endpoints.

#### 2. Athlete Intelligence & AI Analytics Portals
- **Database Logs Schema**: Created SQLite tables for `NutritionLog`, `SCLog` (Strength & Conditioning), `TechnicalLog` (Surfing Technical Training), and `MentalLog` (Mental Performance).
- **Log Aggregations API**: Summary analytics endpoint calculates daily caloric averages, hydration levels, sleep scores, and total waves ridden.
- **Athlete Intelligence Portal (`AthleteIntelligence.jsx`)**: Designed a high-performance logging dashboard matching the light theme color palette of the application, with forms for:
  - *Nutrition*: Caloric intake, hydration metrics, macronutrients, meal timing notes.
  - *S&C*: Workouts, sleep/readiness scores, mobility notes, injury logs.
  - *Surfing Technical*: Wave counts, wave types, fin setups, notes, and video file upload/URL attachments (with embedded HTML5 video playback).
  - *Mental Prep*: Focus levels, pre-heat anxiety scores, post-heat reflection notes.
- **Local Video File Upload (`/api/upload-video`)**: Implemented multipart file upload handling on the FastAPI backend, saving videos securely to static folders and rendering an interactive inline video player for instantaneous review.
- **Drag-and-Drop Media Box (`NewSession.jsx`)**: Converted the static upload media card on the "New Session Log" screen into a fully operational drag-and-drop zone. Users can now drop local video/image files or click to upload, showing dynamic preview cards instantly. Video previews automatically auto-play on hover.
- **Cohesive Light Theme Aesthetics**: Refactored the Athlete Intelligence dashboard to match the software's clean light design language (background `#F8FAFC`, white card blocks with `#E2E8F0` borders, dark charcoal titles, and teal/purple highlight tags).
- **Coach Delegation Selector**: Enables Coaches or Admins to select any student from a top dropdown list to view their logs dashboard or submit training logs on their behalf.
- **Seed Performance Logs**: Populated database with initial workout and wave logs for Chloe Kim (student_id=1) to display instant analytics data.

---

### Proposed Node.js Production Architecture (AI, Real-Time Heats & Marketplace)

To support advanced computer vision tracking, real-time sync, and multi-coach workspaces, the backend can be migrated from Python/FastAPI to **Node.js** with zero changes to the frontend structure:

#### 1. AI Video Analysis Pipeline (YOLO + Meta SAM)
* **Video Frame Extraction**: Node.js extracts video files and triggers serverless GPU workers (e.g., Replicate / RunPod) running YOLO (pose/detection) and Meta SAM (segmentation).
* **Overlay Render**: GPU workers return frame-by-frame JSON coordinates. The React frontend renders real-time toggleable overlays (skeletons, silhouette, bounding boxes) dynamically via HTML5 Canvas on top of the playing video.
* **Export**: Node.js uses `fluent-ffmpeg` to burn overlays back into the original video for download exports.

#### 2. AI Coaching Feedback (Google Gemini)
* **SDK Integration**: Utilizes official `@google/generative-ai` Node.js SDK.
* **Video-to-Text Analysis**: Uploads video files directly to Gemini API to return structured JSON detailing timestamped strengths, per-wave comments, and homework assignments.

#### 3. Wellness & Group Session Management
* **Database & Concurrency**: Express.js/NestJS backend utilizing **Prisma ORM** with PostgreSQL.
* **Waitlists & Locks**: Redis integration for reliable capacity locking, automated waitlist queues, and coach alert triggers for low wellness/injury states.

#### 4. Integrations & Workspace Billing
* **Athlete Sync**: REST/GraphQL queries to WSL & LiveHeats APIs integrated via Node.js identity graph lookup.
* **Workspace Subscriptions**: Stripe Node SDK to manage multi-coach seat allocation and per-seat subscription billing.


###changes_on_03-08-26
 1.aws s3 created
 2. sqllite changed into postgressql
 

 ###changes_on_06-08-2026
 1. athlete changed into student
 2. work in aws
 3. connecting the login page 
 4. connect the event 


 ###changes_on_17-08-2026
 1. create the school dashboard 
 2. deployed aquaticxspotes on aws

 ###changes on 10-08-26
 1. Redesigned the entire user interface with premium modern styling, custom design tokens, and smooth layouts.
 2. Resolved AWS EC2 backend connection errors and configured CORS policies to allow seamless communication.
 3. ui changed fully


 ###changes on 11-08-26
 1. Made website statistics, instructor profiles, and charts fully dynamic from the database.
 2. Aligned dashboard welcome banner counter to show actual scheduled sessions for today.
 3. Enabled live competition events and heat results queries directly from the RDS tables.
 4. Created a dedicated Superadmin Dashboard at rpnsuperadmin featuring platform statistics.
 5. Stored and displayed plaintext coach passwords and database hashes for administrative access.
 6. Completed database migrations and successfully redeployed the live AWS EC2 backend.

 ###changes on 12-08-26
 1. Implemented Live Heats Integration & Mock Heats Engine with live countdown timers, priority state toggles, and wave scoring logs.
 2. Created rule-based AI tactical diagnostics analyzing wave scores to generate strengths, weaknesses, and coaching targets.
 3. Integrated mock heat history cards inside student profiles showing expandable detailed wave logs and AI reports.
 4. Developed Super Admin panel tabs at superadmin for marketplace items, user reports, AI token usage monitor, and app integration client keys.
 5. Configured dynamic API routing fallback to allow local testing while maintaining cloud AWS connection defaults.

 ###changes on 24-08-26
 1. Built Email OTP Login & 3-Step Registration System with real email verification.
 2. Replaced Division dropdown with Gender dropdown in signup form.
 3. Moved Quick Stats from left sidebar to horizontal row at top of dashboard.
 4. Switched auth storage from localStorage to sessionStorage - each browser tab has independent login.
 5. Added OTP verification gate - signup blocked until email is verified first.

 ###changes on 25-08-26
 1. Implemented role-based session privacy isolation in `Sessions.jsx` - Student users only see their own surf sessions with a locked badge.
 2. Enhanced SuperAdmin dashboard delete handlers for students, coaches, and surf schools with synchronous state removal.
 3. Added dedicated `JudgeScoring.jsx` component for real-time heat evaluation and wave scoring.

 ###changes on 26-08-26
 1. Created `purge_aws_db.py` script for AWS RDS database maintenance and user cleanup.
 2. Refactored backend user endpoints and updated mock data mappings for seamless frontend integration.
 3. request done for joinign the surf school 
 4. delect all old data
 5. invertlink created for join the surf school

 ###changes on 27-08-26
 1. Integrated live heat progress, scoring, and judge live-lock management in AquaticX and Results pages.
 2. Connected school registration invite links and student/coach onboarding sync.
 3. Fixed login authentication flows and CORS settings between frontend and AWS EC2 backend.
 4. Synchronized live competition event database tables with RDS.

 ###changes on 28-08-26
 1. Added `PUT /api/sessions/{session_id}` endpoint in backend to fix "Failed to save session" on session edit.
 2. Fixed session video saving and upload logic to support all video formats (.mp4, .mov, .webm, AWS S3 URLs).
 3. Removed dummy placeholder images from New/Edit Session page and added interactive media previews with remove (Ã—) buttons.
 4. Deployed updated backend to AWS EC2 (`aisurf-backend-server`) and verified live session editing and video storage.

### changes on 29-09-26
1. **Removed Default Auto-Assign School (`AuthPage.jsx`, `mockFetch.js`, `backend/main.py`)**:
   - Removed hardcoded `'Aquatic Indica Surf School'` fallback across student registration, mock fetch routines, and backend endpoints.
   - Students who sign up without selecting a surf school now remain unassigned (`school: null` / empty) instead of being automatically forced into a school.
2. **Interactive "Select Your Surf School" Flow (`StudentProfile.jsx`, `backend/main.py`)**:
   - Replaced default "Pending Approval" banner with an interactive **"Select Your Surf School"** card when a student has no school affiliation (`!hasSchool`).
   - Enabled searching, selecting, and submitting school join requests directly from the profile.
   - Added a **"Change School"** button allowing students with pending requests to cancel or switch their selected school.
   - Added backend endpoints `POST /api/students/{id}/join-school` and `POST /api/students/{id}/leave-school` and deployed them live to AWS EC2 backend.
3. **Dynamic Sidebar Header for School Affiliation (`Sidebar.jsx`)**:
   - Updated top header in the sidebar to dynamically display **"No School Selected"** when a student has not selected or joined a surf school, preventing false school branding.
4. **Optional Instructor Assignment on Student Creation (`StudentsManagement.jsx`, `backend/main.py`)**:
   - Removed mandatory instructor assignment when adding a student.
   - Added `-- No Instructor Assigned (Unassigned) --` option in the Add Student modal.
   - Updated backend validation so student creation succeeds without requiring an instructor.
5. **"Pending for Review" Session Status Filter (`StudentsManagement.jsx`, `Sessions.jsx`)**:
   - Added dedicated **"Pending for Review"** filter option to session rosters and filters.
   - Sessions whose scheduled time slot has completed or elapsed can now be filtered and reviewed.
6. **Competition Heat Arena Streamlining & Renaming (`Competitions.jsx`)**:
   - Completely removed "Solo Mock" arena from the Competitions page to streamline the interface.
   - Renamed competition heat management to **"Mock Heat"**.
7. **Student Profile Form Mandatory UI Updates (`StudentProfile.jsx`)**:
   - Enhanced Edit Profile form UI with required asterisk (`*`) for Gender field and improved styling.
8. **Interactive Accompanying Guests Dropdown & Details Popover (`StudentsManagement.jsx`)**:
   - Replaced static guest text with an interactive toggle badge `👥 {count} Guests ▼`.
   - Clicking opens a detailed dropdown popover displaying full guest details (Guest Name, Age, Gender, Stance, WhatsApp number, and Email) instead of only showing the guest count.
9. **Accompanying Guests Card Conditional Rendering (`StudentProfile.jsx`)**:
   - Completely hide the **"Accompanying Guests"** card and the empty state box (`👥 No accompanying guests registered`) when a student has 0 registered guests (`guestsCount <= 0`).
   - The card only appears on the student profile if the student actually has registered accompanying guests.
10. **Removed "Recent Activity" Timeline Card (`SchoolDashboard.jsx`)**:
   - Completely removed the "Recent Activity" (Live Feed) timeline card from the School Dashboard.
   - Updated the bottom dashboard grid (`.db-bottom-grid`) to `1fr` so that "Today's Sessions" expands across the full width cleanly.
11. **Invite Link Course Duration Lock (`StudentsManagement.jsx`, `AuthPage.jsx`, `backend/main.py`)**:
   - Added dedicated Course Duration / Allowed Days selector (1 Day, 3 Days, 5 Days, 7 Days, 10 Days, custom) to the School Invite Link modal.
   - When students register via the invite link, their registration and student profile are strictly locked to that duration so they can only come for those allowed days.
12. **Restricted Invite Link Creation to Admins Only (`StudentsManagement.jsx`)**:
   - Hidden the **`🔗 Invite Link`** button and modal from Coach accounts (`!isCoach && isAdminOrSchoolAdmin`).
   - Only School Admins and Super Admins can create and share registration invite links.
13. **3-Tiered Top Navigation User Info Hierarchy (`Sidebar.jsx`, `index.css`)**:
   - Updated top-right user info display into a clear 3-tiered hierarchy:
     - **Top (`mela`)**: User's Name in bold white.
     - **Middle (`kila`)**: School Name in clean slate gray.
     - **Bottom (`aparo`)**: User's Position / Role (`COACH`, `SCHOOL ADMIN`, `STUDENT`) in accent teal.
14. **Aligned Straight-Line Dropdown for Accompanying Guests (`StudentsManagement.jsx`, `backend/main.py`)**:
   - Replaced bulky popover modal with a sleek dropdown toggle badge (`👥 {count} Guests ▼`).
   - When clicked, reveals a clean, pixel-perfect aligned sub-grid directly underneath the student info.
   - Column alignment (`👥 Guest #`, Name, Gender/Age/Level, Phone, Email) lines up straight across all guests.
   - Students with 0 guests show nothing (`return null`).
   - Fixed database migration and `student_to_dict` so `guests_count` is accurately 0 for students with no guests.
15. **Accompanying Guests in Session Roster & Slot Assignment (`NewSession.jsx`)**:
   - Accompanying guests registered with a primary student (`guests_details`) are now automatically unpacked and displayed directly underneath their parent student in the **School Student Roster** (Step 2).
   - Displayed as full student rows with sub-row hierarchy indentation, branch connector (`↳`), distinct badge (`👥 Guest # of {Parent Name}`), avatar, swimmer badge, slot assignment status, course day info, duration, and level.
   - Accompanying guests can be independently selected for slots, counting towards slot capacity (e.g. 1 parent + 1 guest = 2 spots).
   - Guests remain strictly grouped directly beneath their parent student in all sort orders and searches.
   - Supported in Step 3 Training Groups (drag & drop, group chips) and mapped back cleanly to parent student IDs upon publishing bulk sessions without database constraint errors.

### changes on 02-10-26
1. **School Registration Invite Capacity Model (1 Main Email + Locked Accompanying Guests)**:
   - Re-architected school invite links so that total capacity strictly represents **1 Main Primary Student Email** + remaining slots as **Accompanying Guests** (`Capacity - 1`).
   - For example, an invite created with a capacity of 4 guarantees 1 primary student account and 3 accompanying guests.
2. **Locked Accompanying Guests on Signup (`AuthPage.jsx`)**:
   - In Step 3 Profile Setup of registration, the **Accompanying Guests** input field is strictly locked (`readOnly` and `disabled`) when accessing via a school invite link.
   - Displays a locked indicator badge: `🔒 Locked by Invite: X Guests` (or `0 Guests (Single Person Invite)` if capacity is 1).
   - Automatically pre-creates and displays guest detail cards (Full Name, Phone/WhatsApp, Email) for each accompanying guest so the primary user enters their group members' information.
3. **Disallowed Multiple Email Registrations on Single Invite Link (`AuthPage.jsx`, `backend/main.py`)**:
   - School invite links are now strictly single-use per group: multiple separate email accounts can no longer register on the same invite link.
   - In `backend/main.py` (`/api/auth/signup`), completing registration immediately consumes the full capacity (`used_count = max_count`, `is_active = False`).
   - If another user attempts to open or register with a used link, `/api/school-invites/{code}` returns `valid: False` and `AuthPage.jsx` displays `⛔ This invite link has already been used. Each invite link is valid for 1 primary account registration only`, blocking OTP dispatch and signup submission.
4. **Admin Invite Generator & History UI Updates (`StudentsManagement.jsx`)**:
   - Updated the Invite Link modal guidance card to clarify the 1 Main Account + Locked Accompanying Guests structure and single-use guarantee.
   - Updated the invite history list badges to show `1 Main Account + X Guests` and `⛔ Used (X/X slots registered)` status.
5. **AWS EC2 Backend Deployment & Verification**:
   - Deployed updated `backend/main.py` to AWS EC2 via S3 deployment script and SSM commands.
   - Verified live endpoint responses and validated production frontend build.

6. **Automatic Accompanying Guests Group Selection in Session Roster (NewSession.jsx)**:
   - In Step 2 Student Roster, selecting a main student now automatically selects all of their accompanying guests into the active time slot.
   - Accurately checks slot capacity for the entire group (e.g. 1 primary student + 5 guests = 6 spots) and alerts if slot capacity is insufficient.
   - Deselecting the main student automatically deselects all of their accompanying guests together, keeping booking groups synchronized.

7. **Visual Indentation & Synchronized Grouping in Step 3 Training Groups (NewSession.jsx)**:
   - Accompanying guest cards in Step 3 Column 1 (Student Pool) are now visually indented with a `24px` margin (`12px` on mobile), a branch connector `↳`, and a distinct `#F0F9FF` sky-blue accent with a `4px solid #0284C7` left border.
   - Main students with accompanying guests now display a badge showing `👥 +X Guests` to indicate that they have registered together as a unit.
   - In Step 3, checking/selecting the main student automatically selects/deselects all of their accompanying guests together as a single family unit.
   - Dragging an unselected main student automatically drags all of their unassigned accompanying guests into the target group card.
   - Inside training group cards, student chips are sorted so that main students and their accompanying guests remain clustered together.

8. **Session Header Modal Close Button Alignment (NewSession.jsx)**:
   - Fixed the positioning of the modal close button (`✕`) in the top navigation bar.
   - Grouped the stepper navigation and close button inside `.ns-header-right`, moving the close button to the far right (after Step 3) on desktop instead of awkwardly sitting in the middle between the title and stepper.
   - Styled with clean circular pill layout, border, and smooth red hover interaction.
   - Mobile responsive layout keeps title on the left, close button on top-right, and horizontal stepper cleanly underneath.

9. **Session History Card UI Redesign (StudentProfile.jsx)**:
   - Completely upgraded the "Session History" card from a plain dot text list to premium timeline interactive cards.
   - Added `{completedCount} Completed` emerald pill badge and sleek `All Sessions →` navigation button in header.
   - Each completed session now features:
     - 🏄‍♂️ Surf icon badge with soft emerald gradient.
     - 📅 Date with calendar tag and ⏰ time slot pill.
     - Emerald `✓ Completed` status badge.
     - Bold session location/title with participant indicator (`👥 Guest: ...` or `👤 You`).
     - Interactive coach pill with `★ Review` modal trigger so students can review their assigned coach after completed sessions.
     - Direct `View Details →` link to `/sessions`.
     - Smooth hover lift, border-left accent (`#10B981`), and subtle drop shadow.

10. **Complete Elimination of Dummy Data & Hardcoded Fallbacks (Production Readiness)**:
    - **Root Cause Resolution**:
      - Identified why 'Aquatic Indica Surf School' kept reappearing even after database deletion:
        1. Browser localStorage and sessionStorage retained old login session data (user, activeSchool, and savedAccounts).
        2. Sidebar.jsx contained a ternary fallback check user?.role === 'athlete' ? 'No School Selected' : 'Aquatic Indica Surf School'. Since the logged-in user's role was 'student', it evaluated to 'Aquatic Indica Surf School'.
        3. backend/main.py's /api/schools endpoint contained an auto-population check that automatically recreated 'Aquatic Indica Surf School' in the database whenever the schools table was queried while empty.
        4. seed_database() in backend/main.py and Column definitions had hardcoded demo seed routines (ericsheldon@gmail.com, Aarav, Chloe, etc.) and default='Aquatic Indica Surf School'.
    - **Frontend Clean-up & Storage Sanitization**:
      - Replaced all hardcoded school name fallbacks across Sidebar.jsx, SchoolDashboard.jsx, Sessions.jsx, CoachPortal.jsx, Competitions.jsx, CompetitorManagement.jsx, HeatManagement.jsx, and mockFetch.js.
      - Embedded an automatic client-side storage sanitizer in Sidebar.jsx that inspects localStorage and sessionStorage on mount and strips out any cached 'Aquatic Indica' values.
      - Updated header and mobile dropdown to only render school affiliation if a valid school exists.
    - **Backend Clean-up & AWS RDS Database Purge**:
      - Purged all fake accounts (ericsheldon04@gmail.com, ericsheldon@gmail.com, aarav@aisurf.com, etc.) and dummy school records from the AWS RDS PostgreSQL database.
      - Removed auto-population of demo schools in /api/schools.
      - Neutralized seed_database() to prevent demo data injection.
      - Deployed updated backend/main.py to AWS EC2 instance via S3 upload and SSM command, and verified active endpoints.

24. **Calendar Date Filter & Daily Creation Count for Invite Links (`StudentsManagement.jsx`)**:
    - **Requirement**: In the Invite Link modal (`History` tab), add a compact calendar date selector. When a date is picked, show how many links were created on that date and filter the list accordingly.
    - **Updates**:
      - **Compact Date Picker Pill**: Added a sleek `📅 [YYYY-MM-DD]` calendar input pill in the top filter row alongside `All Links` and `⚡ Active Only`.
      - **Daily Creation Count Banner**: When a date is selected, displays a highlighted banner badge showing the exact count: `📅 {count} link(s) created on {formattedDate} ({activeCount} Active)`.
      - **Instant Reset / Clear**: Added a quick `✕ Show All Dates` action button in the banner and on the date input pill to easily clear the filter.
      - **Scoped Card List**: Filters the invite list to only cards created on that local calendar date (`inv.created_at`).
      - **Zero Count State**: If no links were created on the chosen date, displays `0 Links Created on {formattedDate}` with a one-click button to reset.

25. **Removed `+ Schedule on this Date` Button from Day Details Modal Footer (`Sessions.jsx`)**:
    - **Requirement**: Remove the pink `+ Schedule on this Date` button from the Day Details modal footer.
    - **Updates**:
      - Removed the `+ Schedule on this Date` button from the bottom-left of the Day Details modal footer.
      - Aligned the `Close` action button cleanly to the right (`justifyContent: 'flex-end'`).

26. **Compact Step 3 Header & Smooth Scroll Fix (`NewSession.jsx`)**:
    - **Problem**: In Step 3 (Instructor Groups Matching), the top session banner, large stat summary cards, and time slot card occupied excessive vertical space (~280px+), pushing the 3-column workspace below the fold. Additionally, wheel scrolling was trapped/blocked on `.ns-step3-workspace` due to conflicting overflow properties and unconstrained container heights.
    - **Updates**:
      - **Compact Header Elements**:
        - Reduced `.ns-selected-banner` padding and font size for a sleek single-line indicator.
        - Redesigned `.ns-stat-card` into compact horizontal cards (`padding: 8px 16px`, `font-size: 20px`, inline label), reducing stat card height by more than 50%.
        - Streamlined `.ns-step3-filters-card` with tighter padding (`10px 16px`) and compact gap spacing (`12px` between sections instead of `20px`).
      - **Restored Smooth Vertical Scrolling**:
        - Removed `overflow-x: auto` from `.ns-step3-workspace` which was trapping vertical wheel events, replacing fixed min-widths with responsive `minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr)`.
        - Enforced clean 100vh height boundaries on `.ns-root` and `-webkit-overflow-scrolling: touch` with `overflow-y: auto` on `.ns-container` and `.ns-modal-body-scroll`.
        - Allows the user to smoothly scroll down the entire page/modal across all 3 columns and sticky action bar.

27. **Common Multi-Slot Creation Count in Session Success Modal (`NewSession.jsx`)**:
    - **Problem**: When a user scheduled sessions across multiple time slots (e.g. 3 slots), the confirmation success modal previously printed a hardcoded single slot string: `Your session for Saturday, Oct 3, 2026 (01:00 PM) with 2 training group(s)...`, ignoring the other slots and causing confusion.
    - **Updates**:
      - Removed the misleading single slot timestamp `(01:00 PM)` from the confirmation description.
      - Added dynamic tracking of total published sessions and distinct scheduled time slots (`publishedStats`).
      - Updated modal title and message to display the exact overall creation count:
        - Multiple sessions: **`{count} Sessions Created & Published!`** &rarr; `"{count} sessions created for Saturday, Oct 3, 2026 across {slots} time slots have been successfully saved into the schedule."`
        - Single session: **`Session Created & Published!`** &rarr; `"1 session created for Saturday, Oct 3, 2026 has been successfully saved into the schedule."`

28. **Removed Subtext Breakdown Lines from Session Hub Metric Cards (`Sessions.jsx`)**:
    - **Requirement**: Remove the bottom subtext lines (`Days Upcoming`, `Days In Progress`, `Days Pending`, `Days Completed`, and `Students Breakdown`) from the 5 status metric cards in the Sessions Hub.
    - **Updates**:
      - Removed `.ses-smc-sub` rows from all 5 cards in `Sessions.jsx`.
      - Metric cards now display a clean, uncluttered layout showing the uppercase card label and large status count number.

29. **Removed `TYPE` Column from Sessions Table (`Sessions.jsx`)**:
    - **Requirement**: Remove the `TYPE` column header and `GENERAL` / Beginner type badges from the main Sessions table.
    - **Updates**:
      - Removed `<th style={{ width: '10%' }}>TYPE</th>` from the table header.
      - Removed type `<td>` cells across group parent rows, expanded child athlete rows, and ungrouped session rows.
      - Rebalanced column widths (`SESSION / STUDENT` to 26%, `INSTRUCTOR` to 16%, `STATUS` to 13%, and `ACTIONS` to 27%) for optimal table readability.

30. **Compact & Cleanly Aligned Students Header (`StudentsManagement.jsx`)**:
    - **Requirement**: Make the Students page header title and subtitle smaller and cleanly aligned.
    - **Updates**:
      - Reduced `.sm-title` from 32px to `24px` (`font-weight: 700; line-height: 1.2`), making it sleek and proportional to other dashboard pages.
      - Reduced `.sm-sub` from 16px to `13.5px` (`color: #64748B; margin-top: 4px; line-height: 1.4`).
      - Refined the accompanying guests breakdown indicator to a subtle, smaller inline tag (`12.5px`, semi-bold) that flows naturally without breaking line rhythm.
      - Enforced left alignment (`display: flex; flex-direction: column; align-items: flex-start; text-align: left;`) on `.sm-header-text`.

31. **Strict School & Coach Assignment Isolation in Athlete Intel (`AthleteIntelligence.jsx`)**:
    - **Problem**: In the Athlete Intelligence page (`Athlete Intel`), coaches were seeing athletes from other schools as well as all unassigned athletes (30 students globally in the `Logging for:` selector) because school resolution was falling back to null and coach role isolation was not applied.
    - **Updates**:
      - **Multi-Tenant School Isolation**: Robustly resolved `activeSchoolName` across `sessionStorage`, `localStorage`, and `currentUser` profiles. Filtered students strictly by the user's school (e.g. `rpn tech ac`), eliminating cross-school leakage.
      - **Coach Assignment Isolation**: For Coach accounts (`isCoach`), restricted the student list to ONLY students assigned to that coach (via primary instructor ID, coach name match, scheduled training sessions from `allSessions`, or created by that coach).
      - **Scoped Selectors & Empty States**:
        - `Level: All Levels (X)` now accurately reflects only the coach's assigned student count.
        - `Logging for:` dropdown only lists athletes assigned to that coach within their affiliated school.
        - Shows a graceful fallback `No assigned athletes found` if the coach does not yet have assigned students.

32. **Student Session Resolution & Visibility Fix in Sessions (`Sessions.jsx`)**:
    - **Problem**: When a student (e.g. `Ericsheldon2604`) navigated to the "My Sessions" tab (`/sessions`), the page showed 0 sessions ("No sessions match your filter criteria - No sessions found for your account"), even though their 3 scheduled sessions were correctly visible under "Pending Sessions (3)" on their Student Profile (`/students/:id`).
    - **Root Cause**:
      1. `currentStudentName` in `Sessions.jsx` fell back to hardcoded string `'Eric Sheldon'`, which failed to match the username/student name `'Ericsheldon2604'`.
      2. `roleScopedSessions` for students only checked `s.student` and `currentUser?.student_id` (which was user table id `194` rather than student table id `94`), missing `student_name`, `guest_name`, notes, and email matching.
      3. `fetchSessions` appended `?school=${targetSchool}` which could restrict sessions if school context was mismatched.
    - **Updates**:
      - Added dynamic student resolution (`loggedInStudent`) by matching `currentUser` against `allStudentsList` via email, student ID, user ID, and username.
      - Built `studentCandidateNames` and `studentCandidateIds` sets covering all variations (`name`, `username`, `student_name`, email prefix, student ID, user ID).
      - For student accounts (`isStudent`), `fetchSessions` fetches `/api/sessions` without school parameter restrictions (matching `StudentProfile.jsx`), ensuring no sessions are dropped.
      - Enhanced `roleScopedSessions` for students to accurately match student IDs, student name, guest name, and group notes.
      - Added storage synchronization listeners (`storage`, `user_updated`) to keep `currentUser` fresh.

33. **Registration Invite Links for Individual / Freelance Coaches (`StudentsManagement.jsx` & `AuthPage.jsx`)**:
    - **Problem**: Individual / Freelance Coaches could not send or generate registration invite links because `canCreateInviteLink` was strictly restricted with `isAdminOrSchoolAdmin && !isCoach`, hiding the "🔗 Invite Link" button on their "My Students" dashboard.
    - **Updates**:
      - Updated `canCreateInviteLink` permissions in [StudentsManagement.jsx](file:///d:/surfing/ai/frontend/src/pages/StudentsManagement.jsx) to `isAdminOrSchoolAdmin || (isCoach && isCoachFreelance)`.
      - Enabled the **"🔗 Invite Link"** button for Individual Coaches alongside School Admins.
      - Dynamic Modal Context: Configured the invite modal to display **"Coach Registration Invite Link"** with the assigned coach's name (`Coach demo1`) and a locked coach assignment indicator (`Coach Assigned on Signup`).
      - Coach Attribution in Generated Link: Appended `&coach=...&coach_id=...` parameters to generated and copied URLs so registrations are linked directly to that coach.
      - Auto-assignment on Signup: In [AuthPage.jsx](file:///d:/surfing/ai/frontend/src/pages/AuthPage.jsx), newly registered students arriving via coach invite links are automatically assigned to that coach.

34. **Typography and Alignment Refinement in Instructors Management (`InstructorManagement.jsx`)**:
    - **Problem**: The page title "Instructors" and its subtitle were overly bulky (`font-size: 32px`, `font-weight: 800`), not aligning with the refined dashboard header proportions seen in Students and Sessions.
    - **Updates**:
      - Reduced `.im-title` from 32px to `24px` (`font-weight: 700; line-height: 1.2`), making it clean, modern, and perfectly aligned with the rest of the application.
      - Tuned `.im-subtitle` to `13.5px` (`color: #64748B; margin: 4px 0 0 0; line-height: 1.4`).
      - Enforced structured left alignment with `.im-header-text` (`display: flex; flex-direction: column; align-items: flex-start; text-align: left;`).
      - Refined mobile responsive rules to maintain clean line heights and proportions.

35. **Accompanying Guests Support in Athlete Intelligence (`AthleteIntelligence.jsx`)**:
    - **Problem**: In the "Athlete Intel" page (`/intel`), the "Logging for:" dropdown only showed primary registered students (e.g. `testing`), omitting accompanying guests (e.g. `kolaru`, `kplaru 34e`) who attend training sessions. Coaches and instructors could not select or log mental, nutrition, technical, or S&C records specifically for guest attendees.
    - **Updates**:
      - **Guest Discovery & Aggregation**: Implemented `getGuestsForStudent(student, sessions)` extracting unique guests from `student.guests_details`, `allSessions` (`s.guest_name` / `s.is_guest`), and local storage fallbacks.
      - **Unified Athlete Registry**: Computed `allAthletes` and `filteredAthletes` containing both primary students and their guests tagged with parent context (`key: "${s.id}__guest__${gName}"`, `isGuest: true`, `parentName`).
      - **Hierarchical Dropdown UI**: Rendered accompanying guests cleanly indented under their primary student in the "Logging for:" selector:
        - `testing (Beginner)`
        - `  ↳ kolaru (Guest of testing)`
        - `  ↳ kplaru 34e (Guest of testing)`
      - **Accurate Capacity Counts**: Updated `levelCounts` to reflect total athletes and guest attendees across skill levels.
      - **Guest-Attributed Performance Logging**: Form submissions for Nutrition, S&C, Technical, and Mental logs automatically route to the underlying student record while prepending `[Guest: <guest_name>]` to notes and details, displaying customized toast notifications confirming guest logs.

36. **Student Metric Cards and Chronological "Next Session" Sorting (`Sessions.jsx` & `StudentProfile.jsx`)**:
    - **Problem**:
      1. On the "My Sessions" tab (`/sessions`) for student accounts, a "NUMBER OF STUDENTS: 1" metric card was redundantly shown, which is irrelevant for an individual student.
      2. In the Student Profile page (`StudentProfile.jsx`), the "NEXT SESSION" top-right banner was showing the last scheduled slot (`Monday, Oct 5, 2026`) instead of the earliest upcoming slot (`Saturday, Oct 3, 2026`). Furthermore, "Pending Sessions" and the sessions list were displayed in reverse creation order rather than chronological order.
    - **Updates**:
      - **Hidden Student Metric Card**: In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx), hidden the `NUMBER OF STUDENTS` card for students (`!isStudent`), adjusting `.ses-metrics-row.student-view` to an even 4-column layout on desktop.
      - **Chronological Next Session Determination**: In [StudentProfile.jsx](file:///d:/surfing/ai/frontend/src/pages/StudentProfile.jsx), implemented `sortSessionsAscending` ensuring upcoming sessions are sorted by earliest date and time slot. `nextSession` now correctly identifies the immediate upcoming session (`Saturday, Oct 3, 2026, 10:30 AM - 12:00 PM`).
      - **Chronological Pending & Sessions List**:
        - "Pending Sessions" on the profile now lists slots in ascending chronological order (Saturday Oct 3 first, Sunday Oct 4 second, Monday Oct 5 third).
        - In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx), when viewing as a student or filtering by "Upcoming", group and ungrouped sessions sort in chronological ascending order so students see their nearest upcoming sessions first.

37. **Removal of Redundant "X Students + Y Guests" Breakdown Indicator (`StudentsManagement.jsx` & `SchoolDashboard.jsx`)**:
    - **Problem**: In the "Students" management page (`StudentsManagement.jsx`) and School Dashboard (`SchoolDashboard.jsx`), an inline blue subtext `5 Students + 2 Guests` was displayed under the TOTAL stat card and header subtitle, causing visual clutter.
    - **Updates**:
      - **Students Page**:
        - Removed `sub: ...` from `stats` and completely eliminated the `{s.sub && ...}` span in `.sm-stat-card`.
        - Reverted card label to a clean, canonical `'TOTAL'` (also fixing level filter reset on click).
        - Cleaned header subtitle (`sm-sub`) to remove parenthetical guest breakdown text.
      - **School Dashboard**:
        - Replaced dynamic guest subtext under "Active Students" stat card with standard clean `'Enrolled Athletes'` micro-text.

38. **Universal Headline & Header Alignment Standardization Across All Pages**:
    - **Problem**: Headlines across pages were mismatched in typography, size, spacing, and left alignment. Some pages had 32px bulky titles (`AthleteIntelligence.jsx`, `Competitions.jsx`, `Analytics.jsx`), some had 30px (`Sessions.jsx`), and some had 24px (`StudentsManagement.jsx`, `InstructorManagement.jsx`). Additionally, horizontal padding varied widely (80px on Students vs 40px on other pages), causing the headlines to jump and misalign when switching tabs.
    - **Updates**:
      - **Unified Title Typography**: Enforced `font-family: 'Outfit', sans-serif`, `font-size: 24px`, `font-weight: 700`, `line-height: 1.2`, `color: #0F172A`, and `margin: 0` across all pages (`.sm-title`, `.im-title`, `.ses-title`, `.ai-title`, `.cmp-title`, `.an-title`).
      - **Unified Subtitle Typography**: Enforced `font-size: 13.5px`, `color: #64748B`, `line-height: 1.4`, and `margin: 4px 0 0 0` with structured left alignment on all page headers.
      - **Uniform Horizontal Alignment**: Standardized page main padding across all views (`padding: 28px/32px 40px ...`), eliminating the 80px horizontal gap in `StudentsManagement.jsx` so every page's headline begins at the exact same 40px left-edge alignment.

39. **Accompanying Guests Visibility in Badge Progression & Analytics Table (`Analytics.jsx`, `main.py`, `mockFetch.js`)**:
    - **Problem**: In the "Badge Progression" page (`/analytics`), the student progress table only listed primary registered students, omitting accompanying registered guests (such as `kolaru` and `kplaru 34e` registered under `testing`).
    - **Updates**:
      - **Backend & Mock API Enrichment**: Updated `/api/analytics/students` in [backend/main.py](file:///d:/surfing/ai/backend/main.py) and [mockFetch.js](file:///d:/surfing/ai/frontend/src/mockFetch.js) to return `id`, `school`, `instructor_id`, `guests_details`, and `guests_count`.
      - **Guest Resolution**: Implemented `getGuestsForStudent` in [Analytics.jsx](file:///d:/surfing/ai/frontend/src/pages/Analytics.jsx) integrating guests from direct student details, `/api/students`, `/api/sessions`, and storage fallbacks.
      - **Hierarchical Table Presentation**:
        - Accompanying guests now render immediately under their primary athlete with indentation (`↳ <name>`) and a badge pill (`Guest of <parent>`).
        - Guests inherit their primary athlete's assigned instructor (e.g. `demo1`), display their badge progression circles starting at White badge level, and reflect estimated progression timing.

40. **Strict Session-Only Assignment Filtering for Coach Views (`StudentsManagement.jsx`, `AthleteIntelligence.jsx`, `Analytics.jsx`)**:
    - **Problem**: For coaches (e.g. `demo1`), students who did NOT have an active assigned session (e.g. `Liam Torres`, `Maya Chen`, `Nithishwaran RP`) were showing up on the "Students" page because they fell back to matching default primary instructor attributes on the student record. Furthermore, if a session was deleted, the student would remain visible.
    - **Updates**:
      - **Strict Active Session Requirement**: In [StudentsManagement.jsx](file:///d:/surfing/ai/frontend/src/pages/StudentsManagement.jsx), [AthleteIntelligence.jsx](file:///d:/surfing/ai/frontend/src/pages/AthleteIntelligence.jsx), and [Analytics.jsx](file:///d:/surfing/ai/frontend/src/pages/Analytics.jsx), eliminated static fallback matching (`idMatch`, `nameMatch`, `createdMatch`).
      - **Dynamic Session-Linked Visibility**: Coaches ONLY see students who currently have an active, non-cancelled scheduled session with that coach.
      - **Immediate Removal on Session Deletion**: If a session is deleted or no active sessions remain between that student and the coach, the student is instantly and completely removed from the coach's views.

41. **Removal of Duplicate Top Spacing Gap on Analytics, Competitions, and Athlete Intel (`Analytics.jsx`, `Competitions.jsx`, `AthleteIntelligence.jsx`)**:
    - **Problem**: In "Analytics" (`/analytics`), "Competitions" (`/competitions`), and "Athlete Intel" (`/intel`), a massive empty gap (~156px) appeared between the top fixed navbar and the page headline.
    - **Root Cause**: The global fixed navbar height (72px) was already compensated by `margin-top: 72px !important` in `index.css`. However, `.an-page`, `.cmp-page`, and `.ai-page` additionally had `padding-top: 84px;` (and `padding-top: 60px !important` on mobile), causing double navbar offset.
    - **Updates**: Set `padding-top: 0px` on `.an-page`, `.cmp-page`, and `.ai-page` (matching `Sessions.jsx` and `StudentsManagement.jsx`), completely eliminating the excessive gap and aligning all headlines right below the top navigation bar.
42. **Removal of Empty "SESSIONS / MONTH" Chart Card (`InstructorProfile.jsx`)**:
    - **Problem**: In the Instructor/Coach Profile right-hand sidebar (`InstructorProfile.jsx`), an empty `SESSIONS / MONTH` stat card with zero-activity dash bars was occupying space above the assigned students list.
    - **Updates**:
      - Removed the `SESSIONS / MONTH` monthly chart card (`ip-stats-row` and `ip-stat-card`) from [InstructorProfile.jsx](file:///d:/surfing/ai/frontend/src/pages/InstructorProfile.jsx).
      - Cleaned up the unused monthly session count computation loop, allowing the "Assigned Students" card to sit cleanly at the top of the right column.
43. **Mandatory Location / Region with Asterisk for Individual Coaches (`AuthPage.jsx`, `backend/main.py`, `mockFetch.js`)**:
    - **Problem**: During Coach account signup on [AuthPage.jsx](file:///d:/surfing/ai/frontend/src/pages/AuthPage.jsx), the "Location / Region" field was optional and lacked a mandatory `*` indicator when registering as an "Individual / Freelance Coach", allowing registrations without a primary coaching location.
    - **Updates**:
      - **UI Indicator**: Added a prominent red asterisk (`<span style={{ color: '#EF4444' }}>*</span>`) to `Location / Region *` on [AuthPage.jsx](file:///d:/surfing/ai/frontend/src/pages/AuthPage.jsx) whenever coaching independently.
      - **Client-Side Form Validation**: Set `required={!isCoachSchoolAffiliated}` on the input and added strict frontend validation in `completeRegistration` alerting `"Please enter your coaching location / region."` if submitted empty.
      - **Backend & Mock Enforcement**: Added validation in [backend/main.py](file:///d:/surfing/ai/backend/main.py) and [mockFetch.js](file:///d:/surfing/ai/frontend/src/mockFetch.js) returning HTTP 400 if an individual coach tries to register without specifying their coaching location.

44. **Fix Athlete Intel Header Overlapping Under Fixed Navbar (`AthleteIntelligence.jsx`, `index.css`)**:
    - **Problem**: On the "Athlete Intel" page (`/athlete-intelligence`), the page header ("Athlete Intelligence & Analytics") and subtitle were tucked underneath the fixed 72px top navigation bar because `.ai-main` was missing from the global `margin-top: 72px` panel rules in `index.css`.
    - **Updates**:
      - In [index.css](file:///d:/surfing/ai/frontend/src/index.css), added `.ai-page` and `.ai-main` to the global desktop and mobile responsive panel declarations (`margin-top: 72px !important; padding: 32px 40px !important`).
      - In [AthleteIntelligence.jsx](file:///d:/surfing/ai/frontend/src/pages/AthleteIntelligence.jsx), explicitly defined `margin-top: 72px; min-height: calc(100vh - 72px);` on `.ai-main`, ensuring the title and category tab buttons render clearly with proper top spacing directly beneath the navbar.

### Changes on 03-10-2026

01. **Analytics Page — Student Role Data Isolation (`Analytics.jsx`)**:
    - **Problem**: When a student (e.g. `kolaru`) opened the Analytics page (`/analytics`), the Badge Progression table displayed ALL other students in the school (`Pradeep Pujar`, `Aadya Singh`, `Saanvi Hegde`, `Praveen`, etc.) — a privacy and data scoping violation.
    - **Root Cause**: `filteredStudents` had no student-role check. For student users it fell through to the school-level filter, showing all students enrolled in the same school.
    - **Updates**:
      - Added `isStudent` flag (`athlete / student / user` roles) alongside `studentId`, `studentName`, and `studentEmail` derived from `currentUser`.
      - Added a **student-role guard at the top of `filteredStudents`**: when `isStudent` is true, the memo returns only the logged-in student's own record (matched by ID → email → name) plus their own registered guests.
      - Students still see the school-wide Badge Stat summary cards (WHITE / YELLOW / GREEN / BLUE / RED counts) as these are aggregate, non-personal statistics. Only the per-row progression table is scoped.

02. **Athlete Intel — "Logging for:" Guest Dropdown for Student Accounts (`AthleteIntelligence.jsx`)**:
    - **Problem**: On the Athlete Intelligence page (`/intel`), students who have accompanying guests (e.g. `testing` with guests `kolaru` and `kplaru 34e`) had no way to switch the logging context to one of their guests. The "Logging for:" selector was exclusively shown for Coach and Admin roles (`currentUser.role !== 'athlete'`), so students could only log data for themselves.
    - **Updates**:
      - Added `isStudent` flag (`athlete / student / user`) to `AthleteIntelligence.jsx`.
      - Implemented `myGuestOptions` useMemo with **3-source fallback strategy**:
        1. **API `students` list** — most authoritative; finds the student's own record and reads `guests_details`.
        2. **`currentUser` object from sessionStorage** — available immediately at component mount before the API resolves; reads `currentUser.guests_details` directly.
        3. **`localStorage school_join_requests`** — last-resort fallback for edge cases where neither source populates yet.
      - The `"Logging for:"` dropdown renders **only for students with at least 1 guest** (`myGuestOptions.length > 1`):
        - `testing (Me)`
        - `↳ kolaru (Guest of testing)`
        - `↳ kplaru 34e (Guest of testing)`
      - Coach/Admin users retain the full Level filter + Logging for combo as before; students with no guests see no dropdown (single-person accounts need no switch).
      - Fixed `selectedAthleteKey` initialization to cover all student role variants (`athlete` / `student` / `user`) and fall back to `currentUser.id` when `student_id` is absent.

03. **Multi-School Data Isolation & Leak Prevention (`backend/main.py`, `StudentsManagement.jsx`, `Sessions.jsx`)**:
    - **Problem**: In multi-school deployments, coach or student names could accidentally appear across schools or in freelance coach dropdowns if requests lacked school filtering.
    - **Updates**:
      - Enforced strict school isolation in backend routes: `GET /api/students?school=...` and `GET /api/instructors?school=...` strictly filter by school name. Unscoped calls are prevented from leaking cross-school records.
      - Performed read-only audit across AWS RDS PostgreSQL: verified **0% overlap** (`overlap = set()`) between `Aquatic Indica Surf School - Mulki` (20 students, 21 coaches), `rpn tech ac` (5 students, 1 coach), and `Individual / Freelance Coach` (5 students, 4 coaches).

04. **Sessions Hub — "✓ Saved" Persistent State (`Sessions.jsx`)**:
    - **Problem**: When a session was saved and then reopened, the save button appeared as a blank disabled button without indication whether changes were already saved.
    - **Updates**:
      - Added a `savedSessionIds` state tracking sessions saved during the browser session.
      - When reopening a previously saved session with no pending modifications, the button renders a clear **`✓ Saved`** label.
      - Editing any field or media instantly switches the button back to the active green **`Save Changes`** state.

05. **Competition Hub & Judges Management School Isolation (`JudgesManagement.jsx`, `HeatManagement.jsx`)**:
    - **Problem**: When opening the "Judge" tab in Competitions Hub, freelance coaches (`demo11`, `Coach Surfer`, `Eric Sheldon RS co`, `Bharath G`) and dummy legacy judges (`Head 1`) were showing up under Active Judges for all schools instead of only the school's own instructors.
    - **Root Cause**:
      1. `/api/instructors` called without the `?school=` query parameter defaulted on the backend to returning only "Individual / Freelance Coach" profiles to prevent full unscoped data leaks.
      2. `activeAdmitted` loop in `JudgesManagement.jsx` was merging existing judges indiscriminately into the active panel.
    - **Updates**:
      - Configured both `JudgesManagement.jsx` and `HeatManagement.jsx` to pass the logged-in user's school parameter (`/api/instructors?school=<userSchool>`).
      - Added strict filtering in `activeAdmitted` so non-superadmin accounts only see instructors belonging to their school or guests admitted via competition invite links.
      - Removed auto-synced dummy and freelance records from the local judging table.
      - Implemented safe fallback handlers for `handleRemove` and `handleResyncNumbers`.

06. **Session Heats Surfer Integrity & Routing Resiliency (`EventManagement.jsx`, `heats.js`, `App.jsx`)**:
    - **Foreign Key Constraint**: Fixed SQLite/PostgreSQL `FOREIGN KEY constraint failed` when generating session heats by verifying and registering missing students into the surfers registry before heat creation.
    - **Atomic Transactions**: Wrapped heat and heat-surfer batch creation in atomic database transactions.
    - **Routing Fallback**: Added `/srpnsa` redirect alias and a wildcard (`*`) route in `App.jsx` pointing to `/competitions` to prevent blank screens on mistyped URLs.

07. **Production Deployments (AWS EC2 & Vercel)**:
    - **AWS EC2**: Deployed updated FastAPI backend (`backend/main.py`) to AWS EC2 (`i-0c62e04f44a9ea237`) via S3 & SSM with verified 200 OK live health checks.
    - **Vercel Production**: Deployed latest frontend build to production at `https://www.athnexlive.com`.
    - **Git**: Pushed all changes to branch `03-10-26`.

### Changes on 05-10-2026

01. **Coach Leave Management & School Admin Review Modal (`InstructorProfile.jsx`, `InstructorManagement.jsx`, `backend/main.py`)**:
    - **Unified Admin Modal**: Streamlined the School Admin instructor management page by replacing fragmented buttons with a single, high-impact **"Leave Requests"** button that triggers a responsive Popup Modal dialog.
    - **Review Metrics & Filters**: Added summary metric pills (`Pending`, `Approved`, `Rejected`), status filters, coach profile tags, and date range badges inside the review modal.
    - **Stable Modal Height**: Fixed layout shifting and resizing when switching between "Apply Leave" and "My Requests" tabs in `InstructorProfile.jsx` by establishing a consistent modal height (`min(720px, 90vh)`).
    - **Streamlined Decision Workflow**: Removed redundant "Withdraw" buttons and eliminated the secondary "Admin Remarks / Feedback" input field. For already decided leave requests (Approved or Rejected), cards display a dedicated **"✏️ Change Approval"** button. Clicking this triggers a clean, focused dialog with coach summary details and direct **`✓ Approve`** / **`❌ Reject`** action buttons, enabling frictionless status updates without remarks.
    - **Status Reply Notifications**: Added real-time leave status indicators on the "Apply Leave" trigger button and an alert notification banner on the coach profile when leaves are reviewed or updated.

02. **Student Performance Report Card & Session Notes Redesign (`Sessions.jsx`)**:
    - **Executive Performance UI**: Replaced raw textarea form fields and 1-10 disabled rating buttons for students (`isStudent === true`) with a dedicated, presentation-ready **Student Performance Report Card**.
    - **Wave Count & Scoring Visuals**: Displays wave counts (`🌊 X Waves Ridden`), "🌟 What You Did Well" (with a vibrant score badge and coach remarks card), and "🎯 What to Improve" (with score pill and structured coaching advice).
    - **Student Safety & Read-Only Scoping**: Removed editable controls and the `Save Changes` button for student accounts, ensuring athletes have a focused, clean read-only evaluation view.

03. **Student Profile Coach Remarks Notification & Evaluation Modal (`StudentProfile.jsx`, `Sessions.jsx`)**:
    - **Session History Notification**: In `StudentProfile.jsx` ("Session History" -> "Recent Completed Sessions"), automatically identifies when a coach has recorded feedback or notes for a session.
    - **Visual Attention Cues**:
      - Header renders a `💬 Coach Remarks Available` badge when any completed session contains feedback.
      - Top row of session cards features a **`💬 See your remarks ★`** notification badge next to `✓ Completed`.
      - Session card body displays a prominent notification banner callout (*"Coach [Name] added evaluation scores & feedback for this session. [View Remarks →]"*).
      - Bottom row includes a quick-action `💬 See your remarks` pill button.
    - **Direct Full Session Opening on Notes Tab**: Clicking any remarks button or banner immediately opens the **Full Session Hub** modal directly on the **Notes & Feedback** tab in `/sessions`, presenting the athlete's complete **Performance Report Card** (Wave Count, What You Did Well with score, What to Improve with score, and navigation to full video analysis and photos) without intermediate mini modals.
    - **Deep Linking Query Support**: Configured `Sessions.jsx` to parse `?openSession=${id}&tab=notes` (or `?sessionId=${id}`), automatically resolving the session and opening the full session modal directly on the Notes tab.

04. **Calendar Modal & Roster Scheduler Stability (`Sessions.jsx`)**:
    - **Reliable Close & Backdrop Interaction**: Resolved issues where clicking the close button (`✕`) or modal backdrop in the Surf Sessions Calendar & Roster modal failed to dismiss. Added smooth closing animation state (`isDismissingCalendarModal`) with safe cleanup.
    - **Date Cell Quick Actions**: Restored the quick `+ Create` button on calendar date boxes and the bottom drawer `+ Schedule on this Date` trigger for School Admins to schedule training groups directly from any calendar date.

05. **Date-Aware Coach Leave Detection & Clean Badge UI (`backend/main.py`, `NewSession.jsx`)**:
    - **Backend Approved Leaves Endpoint**: Updated `instructor_to_dict` and `GET /api/instructors` in FastAPI to include `approved_leaves` list and support date-based querying (`?date=YYYY-MM-DD`).
    - **Calendar Date-Matched Leave Status**: Dynamically calculates whether an instructor has approved leave for the session date selected in the Schedule Session wizard (e.g. October 6).
    - **Single Badge UI**: Replaced redundant and duplicated "On Leave" labels in the instructor list with a clean layout: instructor role appears under the name, and a single prominent status badge (`🏖️ On Leave` in red or `✓ Active` in green) appears on the right.

06. **School Coach Session Management Restrictions & Route Protection (`Sessions.jsx`, `NewSession.jsx`, `SessionConfigure.jsx`)**:
    - **Business Rule Enforcement**: Coaches assigned to a school are strictly restricted to coaching and cannot create, schedule, or configure school sessions. Full session management permissions remain with School Admins and Super Admins.
    - **UI Element Hiding**: For school coaches (`isCoach && !isCoachFreelance`), the following controls are automatically hidden:
      - `+ Schedule Session` button in the Sessions page header.
      - `Configure Sessions` button in the Sessions page header.
      - `+ Create` quick buttons in the Calendar date cells.
      - `+ Schedule on this Date` buttons in the Calendar drawer.
      - Bulk session selection checkboxes and delete action bars.
    - **Route Redirection Guards**: Direct navigation to `/new-session` or `/sessions/configure` by a school coach or student immediately redirects them back to `/sessions`.
    - **Freelance Independence**: Individual and Freelance Coaches retain permissions to manage their own personal training rosters.

07. **Production Backend Deployment (AWS EC2)**:
    - **FastAPI Backend on EC2**: Deployed updated `backend/main.py` containing `approved_leaves` and date filter handling to AWS EC2 (`i-0c62e04f44a9ea237`) via S3 bucket `aisurf-media-uploads-149051628601` and AWS Systems Manager (Latest SSM Command ID: `f9073e65-1cd5-46d8-a7a1-a1f74875f25c`).
    - **Service Restart & Health Verification**: Restarted `aisurf-backend` systemd service with verified 200 OK live status, confirming active `approved_leaves` payload support on production.
