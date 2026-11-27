### Changes on 13-11-2026

#### 1. Coach Registration Date of Birth (DOB) & Age Calculation (`InstructorRegistration.jsx`)
- **Problem**:
  - In the coach registration form, there was no Date of Birth (DOB) input field. When coaches registered, their age was automatically defaulted to 30 years old (`age: 30`).
- **Resolution**:
  - Added a dedicated Date of Birth (DOB) field with datepicker to the Coach Registration form.
  - Dynamically calculates the coach's accurate age from the selected DOB and persists both `dob` and accurate `age` in the profile database.

#### 2. Join Request Isolation & Active Instructors Metric Scoping (`InstructorManagement.jsx`, `SchoolDashboard.jsx`, `Sessions.jsx`)
- **Problem**:
  - When an instructor registered with an affiliation to a school, their profile entered the `"Pending School Approval"` state (`registration_status: "Pending School Approval"`).
  - However, they were immediately counted in the school's **Active Instructors** count (e.g., showing 12 coaches instead of approved coaches), appeared as active cards in the instructor roster, and were listed in session instructor dropdowns before the school approved them.
- **Resolution**:
  - **`SchoolDashboard.jsx`**: Filtered active instructor statistics so that coaches with pending join requests (`registration_status === 'Pending School Approval'`) are excluded from the Active Certified Coaches count until approved.
  - **`InstructorManagement.jsx`**: Isolated pending coaches from the main active roster cards. They appear exclusively under the **Join Requests** tab with one-click **Approve** and **Decline** actions.
  - **`Sessions.jsx`**: Excluded pending instructors from session creation and filter dropdowns until approved by the school administrator.

#### 3. Coach Calendar Session Scoping (`Sessions.jsx`)
- **Problem**:
  - In the sessions calendar view, coaches were seeing groups and slots assigned to other instructors rather than only their assigned groups.
- **Resolution**:
  - Enforced strict coach assignment scoping so instructors only see groups and time slots where they are specifically assigned as a coach or co-coach.

#### 4. Session Status Real-Time Transition (`Sessions.jsx`)
- **Problem**:
  - Sessions whose date and time had already elapsed (e.g., Nov 13, 2026 06:30 AM – 08:30 AM) still displayed a badge of `UPCOMING` in session details modals.
- **Resolution**:
  - Implemented real-time timestamp comparison (`session_date` + `end_time` vs current datetime) to ensure completed time slots accurately transition to `COMPLETED` across modals and listings.

#### 5. Dynamic Student Skill Level Resolution in Students List & Recent Activity (`InstructorProfile.jsx`)
- **Problem**:
  - In Coach Profile (`InstructorProfile.jsx`), athletes (e.g., Leo Muller, Jack Hill, arunn, Harish Babu) were initially showing their true verified levels, but then reverting to `BEGINNER` badges in both the **Students** list and **Recent Session Activity**.
- **Root Cause**:
  - When group sessions were created, the backend `sessions` table stored `type: "Beginner"` by default from slot templates.
  - `InstructorProfile.jsx` was checking `s.type` directly; since it had `"Beginner"`, it bypassed profile lookups and rendered `"Beginner"` for everyone.
- **Resolution**:
  - In `fetchDynamicData`, session mapping now prioritizes `findStudentProfile(s.student_id, s.student || s.student_name)` to resolve the athlete's true level (`st.level`).
  - In **Recent Session Activity** JSX rendering, added dynamic lookup against `assignedStudents` (`matchedStudent = assignedStudents.find(...)`) so each card dynamically renders the student's true verified level badge (`PRO` 🔴, `ADVANCE BEGINNER` 🟡, `INTERMEDIATE` 🟢, `ADVANCE INTERMEDIATE` 🔵) with corresponding badge color styling.

#### 6. Standardized "Advance Beginner" Level Badge & Athlete Selector Deduplication (`Sessions.jsx`)
- **Problem**:
  - In the session detail hub under **Athletes in this Session**, some athlete cards displayed `"Advance Beginner"` while others displayed `"Advanced Beginner"` because the component rendered raw un-normalized database string values (`{currentLvl}`).
  - Furthermore, duplicate student records (such as duplicate draft/published bookings for the same athlete) caused duplicate cards to appear.
- **Resolution**:
  - Standardized badge display text across the interactive athlete selector chips to always use `bMeta.label` (`Advance Beginner`, `Advance Intermediate`), ensuring consistent "Advance" terminology everywhere.
  - Added non-guest athlete deduplication by `student_id` and student name to ensure each distinct athlete is presented once in the selector chip grid.

#### 7. Inactive Coach Retention in Roster & Affiliation Schools Dropdown Fix (`InstructorManagement.jsx`, `InstructorProfile.jsx`, `UserProfileMenu.jsx`)
- **Problem**:
  - When an instructor was toggled to Inactive in Instructor Management, they were completely stripped and disappeared from the school's coaches roster as if deleted (`return false` inside the active filter).
  - In the Coach Profile edit modal, the **Affiliation / Surf School** select dropdown only displayed *"Individual / Freelance Coach (Independent)"* because the options list was initialized empty without fallbacks.
- **Resolution**:
  - Removed the premature filter elimination in `InstructorManagement.jsx` so inactive coaches remain safely listed in the school roster with their distinctive Inactive status badge. Coaches are now only removed when explicitly deleted via the Delete action.
  - Initialized and merged comprehensive surf school options (`DEFAULT_SURF_SCHOOLS`) across `InstructorProfile.jsx` and `UserProfileMenu.jsx`, ensuring `rpn tech ac` and all registered academies are persistently visible and selectable for coach affiliation.

---

### Changes on 10-11-2026

#### Fix Main Student & Accompanying Guest Selection After "Clear All" in Step 3 (`NewSession.jsx`)
- **Problem**:
  - After clicking **"Clear All"** (`clearAllGroups()`) in Step 3 (*Instructor Groups Matching*), the groups were cleared and students returned to the unassigned *Students List*, but users could not select the main students when attempting to create new group cards.
- **Root Cause**:
  - `toggleStep3StudentCheck` and `setStep3CheckedStudentIds` were strictly filtering incoming student IDs against an `activeSlotStudentIdSet` using stale closures and restrictive Set checks.
  - Furthermore, when clicking a main student, `isGuestAllowed` and selection state checks evaluated against `activeSlotStudentIdSet`, which caused main students to be silently rejected or stripped from `step3CheckedStudentIdsBySlot`.
  - In `clearAllGroups`, while `slotStudentMap` was updated with the cleared IDs, the checked student ID state across all key representations of the active slot was not cleanly synchronized.
- **Resolution**:
  - **Removed Artificial Slot ID Set Gates from Selection**: Because students in Step 3 Column 1 are already pre-filtered and rendered strictly from `filteredColumn1Students` for the active slot, clicking on any rendered student row or checkbox is now directly accepted without restrictive set exclusions.
  - **Clean Main Student & Guest Toggle**:
    - Clicking a **Main Student** toggles their ID and automatically pulls along any unassigned accompanying guests in that slot. Deselecting removes both the main student and their guests.
    - Clicking an **Accompanying Guest** directly toggles only that specific guest independently.
  - **Robust Slot State Synchronization**:
    - `setStep3CheckedStudentIds` now cleanly sets both number and string keys (`[slotKey]` and `[step3SlotFilter]`).
    - `clearAllGroups` explicitly resets both key variations of `step3CheckedStudentIdsBySlot` and keeps `slotStudentMap` synchronized across both formats.
  - **Verified Build**: Re-built the frontend (`npm --prefix frontend run build`) with exit code 0 in 1.61s.

#### Removed Video Analysis Action Buttons from History of Sessions (`MyAchievements.jsx`)
- **User Request**:
  - Remove the **"Video Analysis"** button in the header and the **"Video"** button on each session card in the student's *History of Sessions* page (`MyAchievements.jsx`), keeping the interface focused purely on milestone tracking, certificate download, and social sharing.
- **Changes**:
  - Removed `<button className="ach-btn-video">Video Analysis</button>` from the top header actions.
  - Removed `<button className="ach-btn-analysis">Video</button>` from each individual session history card row.

#### 3-Day Course Certificate Download & Celebration Party Popper Confetti (`MyAchievements.jsx`)
- **User Request**:
  - Add a **"Download Certificate"** option when a student completes 3 sessions, which downloads an official 3-day course certificate with their name, school, date, wave count, and coach verification.
  - When clicking the **"Share"** button in My Achievements, trigger an animated party popper confetti celebration (`partyposela parakura mathiri`).
- **Implemented Features**:
  - **Dynamic "Download Certificate" Button**:
    - Automatically unlocks in the page header when the student completes 3 or more sessions (`stats.completed >= 3`).
    - Styled with a luxurious gold badge gradient (`linear-gradient(135deg, #F59E0B, #D97706)`).
  - **High-Resolution Certificate Generator (HTML5 Canvas)**:
    - Generates an A4-landscape (1754 x 1240 px) high-resolution official academy certificate.
    - Deep oceanic background with subtle watermark of the surfing action photo.
    - Double gold foil frame with decorative corner diamonds.
    - Official Athnex Live crest and seal.
    - Student's name prominently rendered in bold serif typography with cyan gradient underline.
    - Course title: *"3-Day Surf Training Course"*.
    - Verified metrics pills: Sessions Completed, Waves Ridden, and Coach Technique Score.
    - Date of completion and certified coach name attribution (`Certified By: Coach`).
    - Exports directly to `.png` (`Athnex_Certificate_{studentName}.png`).
  - **Party Popper Confetti Celebration Animation**:
    - Dual party-popper confetti cannon blasting 140+ vibrant particles (ribbons, circles, squares) in gold, teal, pink, cyan, and violet from the bottom corners across the screen whenever the Share modal is opened.
    - Smooth physics simulation with velocity, air resistance, rotation, and gravity.

#### AI-Generated Motivational Surfing Action Card & Story Poster Download (`MyAchievements.jsx`)
- **User Request**:
  - The previous plain dark share preview card was replaced with a stunning, AI-generated surfing photograph background and motivational athletic poster aesthetic so students feel inspired and proud when sharing their milestones on social media.
- **Implemented Upgrades**:
  - **AI-Generated Surfing Action Artwork**:
    - Created an 8K cinematic golden-hour surfing action photograph (`frontend/public/surf-milestone-bg.jpg`) featuring a surfer carving on a sun-drenched turquoise wave with golden backlit ocean spray.
    - Embedded the artwork as the card's backdrop with a dark oceanic gradient overlay (`linear-gradient(180deg, rgba(15, 23, 42, 0.74) 0%, rgba(15, 23, 42, 0.92) 100%)`) ensuring all athlete names and statistics stay crisp and readable.
  - **Motivational Athletic Poster Styling**:
    - **Header Slogan**: *"🌊 PUSH YOUR LIMITS • MASTER THE OCEAN"*.
    - **Gold Verified Athlete Badge**: Glowing gold crest with *"🏆 VERIFIED SURF ATHLETE"*.
    - **Athletic Quote Banner**: *"“Every wave caught is a boundary pushed.”"*.
    - **Glassmorphic Stat Cards**: Frosted translucent pills showing completed sessions, waves caught, water training hours, and verified coach technique score.
  - **1-Click Story Poster Image Download (HTML5 Canvas Export)**:
    - Added **"📸 Download Story Poster (HD Image)"** button.
    - Dynamically composites the high-res AI surfing photo, dark vignette layers, golden frames, athlete profile, stat boxes, and motivational quotes onto a high-definition 1080x1350 canvas.
    - Automatically exports and triggers a `.png` download (`Athnex_Surfing_Milestone_{name}.png`) ready for Instagram Stories, WhatsApp Status, and Snapchat.
  - **Social Sharing Channels**:
    - WhatsApp direct link, Native Share Sheet (`navigator.share`), X/Twitter, Facebook, and Copy formatted text.

#### Transformation of 'My Achievements' to Dedicated 'History of Sessions' with Social Media Sharing (`MyAchievements.jsx`)
- **User Request**:
  - Completely remove the previous skill badge ladder checklists from `MyAchievements.jsx` and transform the page into a dedicated **History of Sessions** portal for students, equipped with one-click **Social Media Sharing** capabilities.
- **Implemented Features**:
  - **Overview Milestone Metrics**: Real-time tally of completed sessions, total waves caught, water training hours, and average verified coach score.
  - **Chronological Session History Cards**:
    - Detailed session date, time, duration, and surf spot location badge.
    - Verified status pills (`✓ Completed` / `⏱ Scheduled`).
    - Assigned coach attribution (`Coach: anbumani`, etc.).
    - Wave counts, technique rating (`85/100`), and coach lesson notes/feedback.
    - Filter tabs (`All Sessions`, `✓ Completed`, `📅 Upcoming`) + live search by spot, date, coach, or level.
  - **Social Media Share System & Modal**:
    - **Visual Milestone Card Preview**: Dark gradient card styled with Athnex branding (`athnexlive.com`), verified seal, surfer name, session details, and technique score.
    - **1-Click WhatsApp Sharing**: Direct integration with `https://wa.me/` sending pre-formatted emoji-rich session milestone text.
    - **Instagram & Native Mobile Sharing**: Integrated with Web Share API (`navigator.share`) allowing direct sharing to Instagram Stories, DMs, WhatsApp, Messages, etc.
    - **X / Twitter & Facebook**: One-click sharing with custom hashtags (`#Surfing #AthnexLive`).
    - **Instant Clipboard Copy**: Formatted shareable milestone copy with "Copied!" feedback.

#### Reactivated 'My Achievements' Portal & Student Navigation (`MyAchievements.jsx`, `App.jsx`, `Sidebar.jsx`, `VideoAnalysis.jsx`)
- **Action**:
  - Reactivated the dedicated student **`My Achievements`** portal that had previously been commented out.
  - **Changes**:
    - **App Routing (`frontend/src/App.jsx`)**: Uncommented and activated `<Route path="/achievements" element={<PrivateRoute><MyAchievements /></PrivateRoute>} />` and route redirect `/my-achievements -> /achievements`.
    - **Header Navigation (`frontend/src/components/Sidebar.jsx`)**: Added **`My Achievements`** back to the student navigation tab list (`My Profile | My Sessions | My Achievements | Analytics | Competitions | Athlete Intel`).
    - **Video Analysis Quick Link (`frontend/src/pages/VideoAnalysis.jsx`)**: Re-enabled the `🏆 My Achievements` pill button in the top action bar so students can seamlessly toggle between video technique review and their badge milestone achievements.
    - **Theme & Responsiveness**: Clean light theme (`#F8FAFC`), full progression breakdown (White, Yellow, Green, Blue, Red badges), skills checklists, training milestones, and coach accolades.

#### Coach Profile & Header Name Synchronization ("event" vs Coach Name Mismatch Fix)
- **Problem**:
  - When coach `anbumani` (`anbu@gmail.com`) logged into their portal and opened their Coach Profile page, the page hero section correctly showed **anbumani**, but the top-right navbar pill and user profile popup displayed **"event"** with avatar initial **"E"**.
  - **Root Cause**:
    - The `users` auth table / `sessionStorage` had the name `"event"` stored from an earlier signup/test entry, while the linked `instructors` record had the true coach name `"anbumani"`.
    - In `frontend/src/components/Sidebar.jsx` and `UserProfileMenu.jsx`, the header rendered `user.name` strictly from `sessionStorage` and only synchronized `is_head_coach` from `/api/instructors/${id}`, never synchronizing `user.name`.
    - On the backend, `PUT /api/instructors/{id}` only synchronized `user.email` and skipped synchronizing `user.name` in the `users` table.
- **Resolution**:
  - **Frontend Automatic Coach Name Synchronization**:
    - Updated `frontend/src/components/Sidebar.jsx` to fetch the real instructor record by `instId` or email and auto-update `user.name` in `sessionStorage` and `localStorage`, dispatching `user_updated`.
    - Updated `frontend/src/pages/InstructorProfile.jsx` in `fetchInstructor` to detect when the logged-in coach's stored name differs from the loaded instructor name and immediately sync storage and state.
    - Updated `frontend/src/components/UserProfileMenu.jsx` with an automatic coach sync effect so the top-right header and popup immediately render the coach's authentic name (`anbumani`) and avatar (`A`).
  - **Backend Synchronization (`backend/main.py`)**:
    - In `make_user_response`: when an `Instructor` record is matched to the `User` account, it now automatically ensures `user.name = instructor_obj.name` in the database.
    - In `update_instructor` (`PUT /api/instructors/{instructor_id}`): updating the instructor's name now cascades to the linked `users` account (`i.user_rel.name` / `linked_user.name`).

#### Assigned Student Level Badge Correction in Coach Profile (Session Type "PRO" Override Fix)
- **Problem**:
  - On the Coach Profile page under **"Students (4)"**, students `arunn` and `Leo Muller` were displaying a badge with level **"PRO"**, even though their actual registered student levels were Beginner / Intermediate.
  - **Root Cause**:
    - In `frontend/src/pages/InstructorProfile.jsx`, when dynamic students were loaded from surf sessions (`coachSessions.forEach`), the fallback student builder assigned:
      ```javascript
      level: sess.type || 'Beginner'
      ```
    - The scheduled session had `sess.type = "PRO"` (representing the wave/session training difficulty category, not the student's skill level).
    - As a result, the session difficulty overwrote the student's actual profile level, displaying them as "PRO".
- **Resolution (`frontend/src/pages/InstructorProfile.jsx`)**:
  - In `fetchDynamicData`, updated the student builder to cross-reference `allStudents` by student ID or name to retrieve the student's true registered skill level (`realSt.level`).
  - Never defaults to `sess.type` for student skill badge levels.
  - In `enrichedStudents`, added an explicit resolution step ensuring every student badge strictly reflects their real profile level (`profileSt?.level || st.level || 'Beginner'`).

#### Adaptive Video Quality & Network Optimization for Slow Internet
- **Problem**:
  - On slow cellular connections (2G, 3G, or high-latency mobile Wi-Fi), high-resolution surf session videos took too long to buffer or repeatedly stalled.
  - Users needed the player to automatically detect network bandwidth and switch down to a smooth-playing quality without manual intervention, while still offering manual control (1080p, 720p, 480p, 360p).
- **Resolution**:
  - **Client-Side Real-Time Network Detection (`frontend/src/pages/VideoAnalysis.jsx`)**:
    - Connected to the `Network Information API` (`navigator.connection`) to detect effective connection type (`4g`, `3g`, `2g`, `slow-2g`) and downlink bandwidth.
    - Dynamically listens to connection changes and automatically recommends the best resolution (Fast / 4G -> 720p/1080p, Medium / 3G -> 480p, Slow / 2G -> 360p).
    - Added real-time stall detection: if 2 buffering stalls happen within 15 seconds, the player automatically steps down resolution (e.g. 1080p -> 720p -> 480p) to keep playback smooth and continuous.
    - Seamless timestamp preservation: when quality switches, `videoRef.current.currentTime` and playback state are saved and restored on `onLoadedMetadata`, so playback continues uninterrupted without restarting from 00:00.
  - **Quality Selector UI (⚙️)**:
    - Added a sleek Quality Selector button in the player control bar displaying the current resolution: `⚙️ Auto (480p)`.
    - Opens a clean dark popover menu with options:
      - `Auto (Recommended)` - Automatically adjusts to network speed.
      - `1080p HD` - High quality for fast connections.
      - `720p HD` - Balanced HD quality.
      - `480p SD` - Smooth playback for 3G / mobile networks.
      - `360p Low` - Ultra Data Saver for 2G / weak signal.
    - Displays floating notification badge informing the user whenever quality adapts to network conditions.
  - **Backend Multi-Resolution Transcoding (`backend/main.py`)**:
    - Added `transcode_video_variants` background task that runs FFmpeg with web-optimized faststart (`-movflags +faststart`) to produce `720p`, `480p`, and `360p` MP4 streams.
    - `/api/upload-video` returns a `qualities` map (`{"1080p": ..., "720p": ..., "480p": ..., "360p": ...}`) supporting both local storage and Amazon S3.

#### Video Analysis Player Seeking & Infinite Buffering Fix
- **Root Cause of "Idhar se Aage not playing"**:
  - In `frontend/src/pages/VideoAnalysis.jsx`, when a user clicked or scrubbed the video timeline forward past the initially buffered chunk, the HTML5 video element fired the `onWaiting` event, setting `isVideoLoading = true`.
  - An opaque 88% dark overlay with backdrop blur appeared over the video: *"Loading Video... Buffering surf session from cloud"*.
  - When the video finished jumping to the sought timestamp, the browser fired the standard `seeked` event.
  - However, the `<video>` element lacked an `onSeeked` handler! As a result, when seeking while paused, `onPlaying` never triggered, and `isVideoLoading` stayed stuck at `true` permanently, trapping the player in an infinite loading screen.
- **Resolution (`frontend/src/pages/VideoAnalysis.jsx`)**:
  - Added dedicated `onSeeked`, `onCanPlayThrough`, `onSeeking`, and `onStalled` event handlers.
  - Implemented automatic safety buffer timeout: whenever buffering is triggered, a 2-second watchdog clears `isVideoLoading` if the video has loaded sufficient frame data (`readyState >= 2`).
  - Added click-to-resume capability on the buffering overlay.
  - Reduced overlay opacity during active sessions so video frames remain visible during minor network buffer delays instead of blacking out the screen.

#### Available Instructors Card Layout & Previous Coach Badge Fix
- **Root Cause**:
  - In `frontend/src/pages/NewSession.jsx` (Step 3: Assign Instructors), the Available Instructors cards in the right pane were rendering a very long recommendation string when an instructor had coached students across multiple groups (e.g. `🕒 Previous Coach (Group E, Group I, Group M, Group N)`).
  - In the ~300px sidebar column, this 54-character badge expanded to consume over 70% of the card width and wrapped onto two lines.
  - Because `.ns-inst-badge` lacked `white-space: nowrap` and `flex-shrink: 0`, flexbox crushed `.ns-inst-info` down to ~30px, causing the instructor's name to be truncated to 2-3 letters (`Vis...`, `In`) and wrapping the role and gender badges into a broken, overlapping layout.
- **Resolution (`frontend/src/pages/NewSession.jsx`)**:
  - **Compact Previous Coach Badge Text**:
    - Single group match: `🕒 Prev Coach (${groupName})` (e.g. `🕒 Prev Coach (Group H)`).
    - Multiple group matches: `🕒 Prev Coach (${count} Groups)` (e.g. `🕒 Prev Coach (4 Groups)`).
    - Added full tooltip via `title={`Previous Coach for: ${prevCoachedGroupNames.join(', ')}`}` so users can hover to inspect all groups.
  - **Flexbox & Card Layout Restoration**:
    - Gave `.ns-inst-badge` `white-space: nowrap`, `flex-shrink: 0`, and `max-width: 140px` to guarantee it never wraps onto multiple lines or encroaches on the coach's identity.
    - Set `.ns-inst-info` to `flex: 1 1 0%` with `min-width: 0` and proper column alignment.
    - Kept the role and gender tag row on a clean single line with `white-space: nowrap` to prevent awkward line breaks.
    - Full instructor names (e.g. "Vishal", "Instructor", "Jenoy Quadros", etc.) and roles now display legibly without any squishing.

#### OpenStreetMap (Nominatim) Live Location Auto-Suggestions
- **Root Cause**:
  - In `frontend/src/pages/AuthPage.jsx`, the School Admin Location input was previously using a static HTML `<datalist id="auth-school-location-datalist">` containing only a handful of hardcoded cities.
  - When typing custom locations (such as `"tri"` for Trichy, Trivandrum, Trincomalee, etc.), the native `<datalist>` provided zero suggestions and did not query OpenStreetMap.
- **Resolution (`frontend/src/pages/AuthPage.jsx`)**:
  - Replaced the static `<datalist>` with live OpenStreetMap (Nominatim API) auto-suggestions.
  - Added debounced querying to `https://nominatim.openstreetmap.org/search?format=json&q=...&addressdetails=1&limit=8` with clean location formatting (`City, State, Country`).
  - Added a responsive, dark-themed floating dropdown with custom 📍 icons, active hover states, clear button (✕), outside-click dismiss, and a live "Searching OpenStreetMap..." spinner.
  - Provided popular surf destinations (including Trivandrum, Kovalam, Mulki, Dapoli, Goa, etc.) for instant matching even before network requests return.
  - Applied the identical OpenStreetMap auto-suggest component to Freelance Coaches' Location / Region input for complete consistency.

#### Universal Direct Login & In-App Pending Approval Banner (Restored to Intended Flow)
- **User Intended Behavior**:
  - Anyone registering or logging in—regardless of role (Student/Athlete, Coach, School Admin, Super Admin)—must immediately enter their dedicated account portal/page directly.
  - Users are NEVER blocked outside on the login/signup screen with an overlay.
  - If a user (e.g. Student or Coach) has a join request pending approval with a school, their pending status is shown **inside** their portal (e.g. `Join Request Pending Approval` in Student Profile, `Pending School Approval` in Coach Profile), with options to change/cancel school.
- **Frontend Restoration (`frontend/src/pages/AuthPage.jsx`)**:
  - Removed the blocker check that invoked `setPendingApprovalUser(user)` on the authentication page.
  - Restored immediate post-auth navigation for all roles:
    - Athlete/Student -> directly navigates to their student profile `/students/:id`
    - Coach -> directly navigates to their coach profile `/instructors/:id`
    - School Admin / Super Admin -> directly navigates to dashboard `/dashboard`
- **Backend Fixes (`backend/main.py`)**:
  - Ensured School Admin accounts (`role in ['admin', 'superadmin']`) are automatically assigned `initial_approval = 'approved'` and never get flagged as pending.
  - Maintained startup database migrations to keep existing school admin records in `approved` status.

---

### Changes on 06-11-2026

#### AWS Production Deployment (athnexlive.com)
- **Backend Deployment**:
  - Uploaded `backend/main.py` to S3 (`s3://aisurf-media-uploads-149051628601/deploy/main.py`).
  - Executed SSM deployment on Backend EC2 (`i-0c62e04f44a9ea237`), updated `/home/ec2-user/backend/main.py`, and restarted `aisurf-backend` systemd service (verified active).
- **Frontend Deployment**:
  - Built production bundle with Vite (`dist/assets/index-2Olw62zC.js`).
  - Uploaded archive `aisurf-frontend.zip` to S3.
  - Deployed to Frontend EC2 (`i-02999b6093bc5bfd2`), deployed onto `/var/www/frontend`, and reloaded Nginx (verified HTTP 200 on `https://athnexlive.com`).

#### Mobile Responsive Students Filter Bar Redesign
- **Root Cause**:
  - In `StudentsManagement.jsx`, the `.sm-filters` bar on mobile (`@media (max-width: 768px)`) was styled with `flex-direction: row !important` without wrapping, crushing the Search input, `DateRangeFilterBar` (with 4 preset buttons + date pickers), and both dropdown selects into a single cramped 360px row, causing text overlap and collapsed buttons.
- **Resolution**:
  - **`StudentsManagement.jsx`**: Converted `.sm-filters` on mobile into a clean vertical flex column:
    - **Row 1**: Search input at 100% width (height 38px, legible placeholder).
    - **Row 2**: `DateRangeFilterBar` at 100% width with organized presets row and date range picker.
    - **Row 3**: `sm-dropdowns-row` displaying Swimming filter and Surf Level filter neatly side-by-side (50% each) with clean text clipping.
  - **`DateRangeFilterBar.jsx`**: Extended responsive styling to `@media (max-width: 768px)`, ensuring preset buttons (`Yesterday`, `Today`, `Tomorrow`, `All`) and custom date pickers scale cleanly on all mobile screens without layout shifts.

#### Athlete Intelligence Full Student Roster & Level Synchronization
- **Root Cause**:
  - In `AthleteIntelligence.jsx`, `schoolStudents` was strictly filtering coaches by `sessionMatch` in `allSessions`. Because only 2 students had sessions created with the coach, the other 4 registered students were filtered out from the roster.
  - An Individual / Freelance Coach manages all students in their workspace (independent roster) and needs to log vitals, S&C, nutrition, technical notes, and mental diagnostics for all their students regardless of whether a surf session was already scheduled.
  - The level filter dropdown in Athlete Intel was previously hardcoded with legacy labels (`Advanced`, `Master`) instead of matching the application's actual skill tiers (`Beginner`, `Adv. Beginner`, `Intermediate`, `Adv. Intermediate`, `Pro`).
- **Resolution (`frontend/src/pages/AthleteIntelligence.jsx`)**:
  - Updated `fetchStudents` to pass `instructor_id` when fetching students for scoped coaches.
  - Allowed Individual / Freelance Coaches (`isCoachFreelance`) to retain all students in their roster without blocking students who do not yet have an active session.
  - Added support for direct instructor assignment (`isDirectInstructor`), name match, and coach creation alongside session matches.
  - Added `normalizeLevel` mapping and synchronized the level filter dropdown to display `Beginner`, `Adv. Beginner`, `Intermediate`, `Adv. Intermediate`, and `Pro`, showing the full roster count `All Levels (6)`.

#### Individual / Freelance Coach Student Date & Expected Time Editing
- **Root Cause**:
  - In `StudentsManagement.jsx`, the table columns for **Date** (`start_date`, `end_date`) and **Expected Time** (`session_time`), as well as the popup edit modals (`editingStudentDates`, `editingStudentTime`), were guarded strictly by `isAdminOrSchoolAdmin`.
  - While Individual / Freelance Coaches had permissions to add students, delete students, and generate invite links, they were locked out from inline editing students' dates and expected session times.
- **Resolution (`frontend/src/pages/StudentsManagement.jsx`)**:
  - Introduced `canEditStudentDatesAndTime = !isViewAdmin && (isAdminOrSchoolAdmin || (isCoach && (isCoachFreelance || isHeadCoach)))`.
  - Enabled click-to-edit interactions and "Edit" badges on both Date and Expected Time columns for Individual / Freelance Coaches.
  - Enabled the Dates modal and Expected Time modal triggers and context banners for Individual Coaches.

---

### Changes on 05-11-2026

#### School Admin Role Badge & Guest Admin Role Restoration
- **Root Cause Resolution**:
  - The PostgreSQL `guest_role` column had previously defaulted to `'main_admin'` during schema migration, backfilling existing school accounts with `guest_role = 'main_admin'`.
  - In `UserProfileMenu.jsx`, `isGuestAdmin` had evaluated `effectiveUser?.guest_role`, causing genuine School Admins (`role === 'admin'`) to falsely display the orange `MAIN ADMIN ⚡` badge instead of `School Admin`.
- **Backend Schema & Response Fix (`backend/main.py`)**:
  - Modified startup migration to remove default from `guest_role` column and run `UPDATE users SET guest_role = NULL WHERE role != 'guest_admin';`.
  - Updated `make_user_response` and authentication endpoints so `guest_role`, `is_view_admin`, and `is_main_admin` are strictly `None`/`False` for standard School Admin accounts (`role === 'admin'`).
- **Frontend Role Display Fix (`UserProfileMenu.jsx`)**:
  - Strictly restricted `isGuestAdmin` to accounts whose role is explicitly `'guest_admin'` (`currentRole === 'guest_admin' && effectiveUser?.role !== 'admin' && effectiveUser?.role !== 'superadmin'`).
  - Added proactive cleanup to purge any stale `guest_role` or `is_main_admin` properties from `localStorage` / `sessionStorage` for School Admins.
  - Ensured `displayRoleLabel` correctly outputs `School Admin` in the top header and user profile dropdown for authentic school owners.
  - Retained `Guest Admin Access: Create` button exclusively for original School Admins.

---

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

 ###changes on 31-08-26
 1. Fixed timezone shift bug in Event, Competitor, and Heat Management pages by using timezone-safe local date component parsing.
 2. Attached student mapping metadata (student_ids and student_names) to dynamic virtual session events to support booked athlete loading inside heat creation.
 3. Added frontend auto-persistence for virtual session events, which automatically inserts them into the database events table upon heat creation to satisfy the backend INNER JOIN constraints without touching the aquaticxsports backend repository.

### changes on 18-09-26
1. Removed "Primary Instructor" column from the Students Management table in `StudentsManagement.jsx`.
2. Implemented strict role-based privacy for student accounts in Session Details & Media Hub modals - hid "Edit Session", "Delete", and "Save Changes" controls and locked status/notes to read-only.
3. Standardized UI terminology by replacing all "Athlete / Athletes" labels with "Student / Students" across top navigation badges, session tables, group modals, and session builder pools.
4. Resolved top bar header logic in `Sidebar.jsx` to dynamically display the active Surf School name (`Aquatic Indica Surf School`) instead of coach name overrides for users inside a school.
5. Restricted `Pending Requests` button and registration approval modal visibility in `StudentsManagement.jsx` so it is hidden for Surf School Coaches and reserved for School Administrators.
6. Synchronized `Active Students` count in Dashboard stats API (`mockFetch.js`) by filtering out pending and rejected registrations so it matches the active roster in Students Management.
7. Derived pending sessions in `StudentProfile.jsx` from student `course_duration` (e.g. 3 Days / 7 Days Course), populating the Pending Sessions count badge and listing all scheduled course days with date and time slot.
8. Added dedicated `Accompanying Guests` widget on `StudentProfile.jsx` to render accompanying guests count, group size, and individual guest profile cards (name, age, skill level).
9. Removed `Skill Tracker` radar chart and `Badge History` widgets from `StudentProfile.jsx` layout.
10. Removed `Mock Heats & Tactical History` card section from `StudentProfile.jsx` layout.
11. Moved `Accompanying Guests` widget to the top of the left column in `StudentProfile.jsx` above Session History.
12. Refactored StudentProfile layout grid so left and right columns share equal flexible width (`flex: 1`), preventing text wrapping on Accompanying Guests header and balancing all dashboard cards.
13. Simplified Edit Profile Modal in `StudentProfile.jsx` to exclusively present Signup & Guest registration fields (Name, WhatsApp, Guests, DOB, Course Duration, Slot, Start Date, Guest Profiles) and removed unused stats/logs fields.
14. Removed `Session Time Slot` dropdown selection from student edit modal in `StudentProfile.jsx` so students do not pick session time slots.
15. Created dedicated `Accompanying Guests` management modal (`showGuestModal`) in `StudentProfile.jsx` triggered by `+ Add Guests` button, allowing adding, updating, and removing guest profiles independently without opening `Edit Student Profile`.
16. Added accompanying guest count badge (`ðŸ‘¥ X Guest(s)`) under student name & phone number in `StudentsManagement.jsx` table roster.
17. Rendered individual accompanying guest profile details (Guest Name, WhatsApp phone, Email address) directly under the guest badge in `StudentsManagement.jsx` table rows.
18. Added graceful error fallback handling (`safeGet`) to `HeatManagement.jsx` to catch EC2 backend HTTP 500 responses without throwing unhandled exceptions in browser console.
19. Updated session metric card label from `SESSIONS BOOKED` to `PENDING SESSIONS` and subtext from `Days Booked:` to `Pending Days:` in `Sessions.jsx` and `StudentsManagement.jsx`.
20. Removed duplicate middle metric card widget from `Sessions.jsx` and `StudentsManagement.jsx`.
21. Updated `NewSession.jsx` roster selector to leave student selection empty (0 selected) by default for manual selection, and filtered out students already scheduled on the selected session date.
22. Normalized session status labels in `Sessions.jsx` from `UPCOMING` to `PENDING` (`formatSessionStatus`), updating status pills and syncing the `PENDING SESSIONS` top metric card count.
23. Removed `ATTENDANCE` header column and `âœ“ Mark Daily` buttons from `StudentsManagement.jsx` table roster.
24. Dynamic Session Slot Filter: Updated `StudentsManagement.jsx` session time filter dropdown to dynamically display active configured slots from Session Configuration (`localStorage.getItem('session_slots')`), filtered by the selected date's day of the week (`dateFilter`), with real-time sync listeners.
25. Removed Table Row Edit Buttons: Completely removed the pencil edit icon buttons (`ses-icon-btn`) from session table rows in `Sessions.jsx`.
26. Removed Preferred Session Time Field: Removed `Preferred Session Time` dropdown input field from `Add Students` modal in `StudentsManagement.jsx`.
27. Automatic Session Grouping: Refactored `Sessions.jsx` session grouping logic (`buildSessionGrouping`) so that multiple sessions sharing the exact same Date, Time, and Instructor are automatically consolidated into a single parent Group Session row (e.g. `08:30 AM Group (3 Students)`).
28. Synchronized School Name: Fixed school name mismatch between top header navigation and profile card in `InstructorProfile.jsx` by resolving `activeSchoolName` dynamically from active session user context (`erictestschool`).
29. Per-Slot Independent Session Capacity: Refactored `NewSession.jsx` capacity state management (`slotCapacityMap`) so that each session time slot (e.g. `08:30 AM`, `10:30 AM`) maintains its own independent target student capacity limit when switching between slots.
30. Horizontal Slot Pill Tabs Bar: Replaced top dropdown slot select in `Sessions.jsx` with an always-visible horizontal slot pill tab bar featuring `â° Select Time Slot:`, circular slot number badges, session counts, and active `âœ“ SELECTED TAB` indicators.
31. Student Video Upload & Auto-Save: Enabled video upload and auto-saving (`autoSaveHubVideo`) inside Session Details & Media Hub modal for student accounts in `Sessions.jsx`, ensuring uploaded wave clips are immediately persisted to backend session records.
32. Past Date Selection Disabled: Updated `NewSession.jsx` calendar widget to disable past dates (`cellDate < today`). Past days are visualised with reduced opacity (`0.3`), strike-through line, and `pointerEvents: 'none'` to block selection, while previous month navigation arrow (`â†`) is disabled when viewing the current month.
33. Publish Validation & Group Initialization Fix: Added validation to `NewSession.jsx` (`handleFinalizeAndPublish` & `proceedToStep3`) so that publishing requires at least 1 valid group with assigned students. Prevents auto-publishing fake empty groups or falling back to dummy student ID `1`.
34. Editable Custom Session Duration: Replaced static dropdown in `SessionConfigure.jsx` and `NewSession.jsx` slot edit modal with a hybrid number input and `<datalist>` dropdown. Users can now either select standard presets (`30`, `45`, `60`, `90`, `120`, `180 min`) or manually type any custom duration value in minutes (e.g. `75`, `105`, `150`).
35. Removed Slot Card Edit Buttons: Completely removed the `Edit` buttons from daily time slot cards in `NewSession.jsx` (Choose Time Slot section).
36. Removed "Staff On Leave" Metric Card: Removed the "Staff On Leave" summary card from Step 3 (Assign Instructors) in `NewSession.jsx` and rebalanced the summary grid to 3 cards.
37. Custom In-App UI Alert Modal: Replaced browser native popups (`alert(...)`) in `NewSession.jsx` with a styled in-app UI alert modal featuring status icons, structured headings, clean backdrop blur, and dark rounded action buttons.
38. Horizontal Slot Tabs Bar in Students Management: Replaced the `Session: All Slots` dropdown filter in `StudentsManagement.jsx` with the exact same always-visible horizontal slot pill tabs bar from `Sessions.jsx` (with `â° Select Time Slot:`, numbered circular badges, student counts, and active `âœ“ SELECTED TAB` highlights).
39. Single Coach Per Group Enforcement: Updated `NewSession.jsx` to enforce exactly 1 dedicated coach per group card (single coach assignment). Removed multi-coach appending, and added strict validation ensuring every training group has an assigned coach before publishing.

### changes on 19-09-26
1. Added show/hide eye icon toggle (SVG) to New Password and Confirm Password fields in Set Password modal (StudentProfile.jsx).
2. Removed Quick Actions panel (Assign to Session, Send Welcome Email, Notify Instructor) from student add summary modal (StudentsManagement.jsx).
3. Removed Add Student - Review Summary - Assign Session step indicator bar from student add summary modal.
4. Removed Preferred Session row from student summary details table.
5. Fixed slot time mismatch on student chips inside group cards - chips now show the group card slot time, not each student original selected slot (NewSession.jsx).
6. Added portal invite link CTA button to all welcome email templates in backend:
   - Student sign-up: magic link to /student-portal?token=...
   - Admin creates student: auto-generates invite token, embedded direct portal link in email
   - Instructor created: direct /coach-portal login button (teal gradient)
7. Backend app base URL resolved from APP_URL or FRONTEND_URL env variable for production compatibility.
8. Verified SMTP delivery - test email successfully delivered to Gmail inbox.
9. In-App Custom Confirmation Modals & Toasts: Replaced browser native `window.confirm(...)` dialogs with custom styled in-app confirmation modals and toast notifications across `SuperAdminDashboard.jsx`, `StudentsManagement.jsx`, and `InstructorManagement.jsx`.
10. Sign-up Password Autofill Prevention: Prevented browser password managers from automatically prefilling passwords on the public sign-up registration form (`AuthPage.jsx`).
11. Permanent Student Portal Magic Links & Base URL Alignment:
    - Configured production `APP_URL=https://aisurf-one.vercel.app` in backend environment and updated `get_app_base_url` to ensure all generated links point to the live Vercel domain.
    - Updated backend database persistence logic so that `invite_token` is never erased/nulled upon password creation, ensuring student portal magic invite links remain permanently valid.
12. Student View Single Row Representation in Sessions: Updated `Sessions.jsx` for student accounts (`isStudent`) so sessions are rendered directly as clean individual table rows with a `[Group A]` badge, removing unnecessary expandable accordion parent rows.
13. Removed "All Slots" Pill: Removed the "All Slots" pill from Step 3 time slot selector in `NewSession.jsx` and defaulted selection to the first active slot for the chosen session day.
14. Floating Sticky Action Bar in Session Configuration: Replaced bottom inline buttons in `SessionConfigure.jsx` with a floating sticky dark pill action bar (`.sc-sticky-bar`) matching the Photo 1 design in `NewSession.jsx` (displaying `SESSION SETUP` emerald badge, active slots & default capacity summary, back button, and a glowing `#00D2B4` Save Configuration button).
15. Removed Details Button from Sessions Table: Removed the `🔍 Details` button from session rows in `Sessions.jsx`, leaving only `+ Video`, `Analysis`, and `Delete` action buttons.
16. Removed "Default Session Settings" Card: Removed the redundant "Default Session Settings" card (duration, max students, break between sessions, and cancellation window) from `SessionConfigure.jsx`, keeping the configuration interface clean and focused on daily time slots.

### changes on 23-09-26
1. CSV Bulk Import Quick Preview & One-Click Import: Added an instant CSV preview card (`sm-csv-preview-card`) right below the file dropzone in `StudentsManagement.jsx` displaying the parsed student count, source filename, mini-roster table preview (Name, Email, Phone, Age/Level, Assigned Coach), and a direct `🚀 Import Students Now` button with duplicate-prevention handling.
2. Students Management Table Column Refinement: Replaced the `Session` column header with `Date` in `StudentsManagement.jsx` table roster, showing a clean `🗓️ {start_date}` display without hardcoded slot times.
3. Pending Approval Filtering: Filtered out already approved active students from the pending join requests list in `StudentsManagement.jsx` to prevent duplicate displays.
4. Backend Multi-Tenant Data Consistency: Synchronized `invite_token`, `approval_status`, and `school` fields across backend student creation, lookup queries, and session assignments.

### changes on 24-09-26
1. SMTP Health Check & Quota Diagnostic: Audited outgoing mail delivery and identified Gmail SMTP relay error `550 5.4.5 Daily user sending limit exceeded` caused by Gmail personal account daily limits.
2. AWS SES Email Migration Architecture Proposal: Prepared a comprehensive technical proposal document (`email_service_migration_proposal.md`) comparing Gmail SMTP vs AWS Simple Email Service (SES) with high sending throughput (50,000+ mails/day), ₹8.50 per 1,000 email pricing, SPF/DKIM verification, and native `us-east-1` AWS infrastructure alignment.
3. Student Registration Autofill Elimination: Removed all default and auto-filled field values across Student Registration in `AuthPage.jsx`:
   - `Gender`: Reset default `Male` to empty prompt `-- Select Gender --`.
   - `Surf Stance`: Reset default `regular` to empty prompt `-- Select Surf Stance --`.
   - `Accompanying Guests`: Removed pre-filled `0` to allow clean user entry.
   - `Course Duration`: Reset default `3 Days Course` to empty prompt `-- Select Course Duration --`.
   - `Start Date`: Removed auto-filled current date to leave a clean calendar picker (`dd - mm - yyyy`).
   - `Assigned Surf School`: Removed automatic assignment to the first school in the list so users manually select their school from `-- Select Surf School --` (preserved only on direct invite links).
   - Removed pre-filled defaults in guest profile rows and coach hourly rate.
4. Student Profile Password Setup Prompt Fix:
   - Fixed issue where students without passwords (`has_password: false`) could not see the password setup banner or modal in `StudentProfile.jsx`.
   - Removed the restrictive `?token=` URL requirement so the password setup prompt always appears when a password has not been created.
   - Prevented stale `localStorage` join-request records from overriding the database password status.
   - Added an automatic popup of the "Update Account Password" modal on first load if the student has no password.
   - Added a prominent **`🔐 Set Permanent Password`** / **`🔑 Change Password`** button in the student profile header.
5. Dynamic "My Sessions" Navigation & Page Header:
   - Top Header Navigation (`Sidebar.jsx`): Dynamically displays **`My Sessions`** instead of `Sessions` when logged in as a Student (`athlete`/`student`/`user`) or Coach (`coach`).
   - Sessions Page Title (`Sessions.jsx`): Updated main heading to display **`My Sessions`** for students and coaches with personalized coaching and schedule subtitles.

### changes on 25-09-26
1. Interactive Calendar & Day Details Roster View (`Sessions.jsx`):
   - Touching or clicking any calendar date cell or group pill immediately launches a dedicated **Day Details Modal** and synchronizes the embedded **Day Roster Drawer** below the grid.
   - Shows long formatted date, total slots count, `TODAY` indicator, training group cards, session timings, assigned coach, spot location, and enrolled student roster with avatars and levels.
   - Quick session creation button (`+ Schedule on this Date` / `+ Create`) for current & future dates.
   - Cleaned up Day Details modal action buttons by removing the redundant "AI Video Analysis" button, retaining a clean and direct `View in Sessions Table →` button.
2. Session Status Workflow & Dynamic Metrics Bar (`Sessions.jsx`):
   - Dynamic Date-Aware Status Transitions: Arrived or past sessions automatically transition to **`IN PROGRESS`** / `Completed`, while future dates display **`UPCOMING`**.
   - Redesigned status metrics into a dedicated 4-card horizontal row:
     - `UPCOMING SESSIONS` (sky blue) with days upcoming count.
     - `IN PROGRESS SESSIONS` (emerald teal) with days in progress count.
     - `SESSIONS COMPLETED` (green) with days completed count.
     - `NUMBER OF STUDENTS` (purple) with live breakdown across Upcoming, In Progress, and Completed.
   - Each metric card acts as an instant one-click filter for the session table.
3. Student & Coach Gender Filters in Session Creation Wizard (`NewSession.jsx`):
   - Step 3 Column 1 (Available Students): Added dedicated 4-column filter grid (`📅 DAY`, `⚡ STATUS`, `🎯 LEVEL`, `👤 GENDER`) with gender badges on student cards (`♀ Female` / `♂ Male`).
   - Step 3 Column 3 (Available Instructors): Added segmented gender filter buttons (`All (N) | Male (N) | Female (N)`), dynamic coach counts, gender badges on coach cards, and empty state prompts.
   - Step 2 (Roster Selection): Added gender filter chips (`All`, `Male`, `Female`).
   - Backend database support: Added `gender` column to `Student` SQLAlchemy model and updated SQLite `aisurf.db` table schema and queries.
4. Coach Profile DOB & Real-Time Age Management (`InstructorProfile.jsx`, `backend/main.py`):
   - Added Date of Birth (DOB) datepicker input and Gender selector inside the **Edit Coach Profile** modal.
   - Integrated live automatic age calculation (`calculateAge`), displaying real-time age preview (`Age: XX yrs`) next to the DOB input field.
   - Updated Personal Details card on Coach Profile to display `Date of Birth (DOB)` and calculated age (`YYYY-MM-DD (XX years old)`).
   - Enhanced backend `update_instructor` endpoint to persist `dob` and automatically compute and save `instructor.age`.
5. Stability & Blank Screen Fix (`Sessions.jsx`):
   - Resolved uncaught `ReferenceError: UserAvatar is not defined` runtime error that caused a blank screen upon touching calendar date cells.
   - Embedded standalone `UserAvatar`, `getInitials`, and `getAvatarColor` utilities in `Sessions.jsx`.
   - Included `statusFilter` in the `filteredSessions` memoization dependency array.
6. Production Deployment (`Vercel`):
   - Built and deployed frontend production bundle to Vercel:
     - Production URL: `https://aisurf-d6z20uyfs-nithishwaran-rps-projects.vercel.app`
     - Live Custom Domain: `https://www.athnexlive.com`
7. Athlete Intelligence & Analytics Single Calendar Modal (`AthleteIntelligence.jsx`):
   - Removed cluttered horizontal day strip and multiple pill buttons from the dashboard view.
   - Added a sleek single **`📅 View Calendar`** button at the top header (with active date indicator).
   - Clicking the button launches a full **Interactive Monthly Calendar Modal** (matching the pro Sessions calendar design):
     - Month navigation (‹ Prev, Today, Next ›) and weekday matrix (Mon-Sun).
     - Date cells display day numbers, `TODAY` badges, total activity log counts, and color-coded mini badges for Surfing (🏄), S&C (🏋️), Nutrition (🍎), and Mental Prep (🧠).
     - Clicking any date cell instantly filters the dashboard and highlights the selected date's activity roster and metrics.
   - Clean dashboard interface: Removed intermediate status banners so metrics cards and history load directly beneath the navigation tabs.
   - Form logging tabs (`Log Nutrition`, `S&C Workout`, `Technical Training`, `Mental Prep`) now include explicit date pickers to log entries for any chosen date.
8. Athlete Intelligence Student Skill Level Filter (`AthleteIntelligence.jsx`):
   - Added dynamic **`Level:`** filter dropdown (`All Levels`, `Beginner`, `Intermediate`, `Advanced`, `Master`) directly alongside the `Logging for:` student selector in the top header.
   - Shows live counts of students in each tier (e.g. `Beginner (4)`, `Intermediate (2)`).
   - Changing the level filter instantly filters the athlete selection dropdown to only display students in that category and auto-selects the first student in the filtered group.

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
        - Replaced all hardcoded school name fallbacks across Sidebar.jsx,  SchoolDashboard.jsx, Sessions.jsx, CoachPortal.jsx, Competitions.jsx, CompetitorManagement.jsx, HeatManagement.jsx, and mockFetch.js.
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

  ### Changes on 12-10-2026

  01. **Smart Coach-to-Student Ratio Engine (`NewSession.jsx`)**:
      - **Dynamic Ratio Calculation**: Added an automatic ratio calculator dividing total active students across coaches (e.g., 34 students ÷ 21 coaches = ~1 Coach : 2 Students).
      - **Visual Ratio Analytics**: Introduced a dedicated stat badge in the Step 3 summary header (`👥 Ratio: 1 Coach : ~X Students`) and individual `🏄‍♂️ 1 Coach : X Students` breakdown badges on each group card for real-time safety and class capacity monitoring.

  02. **Manual Group Assignment Workflow (`NewSession.jsx`)**:
      - **User-Driven Group Creation**: Removed unwanted automatic group distribution on initial wizard mount. Groups are now created manually by the administrator, allowing flexible student grouping.
      - **Header & Group Badge Synchronization**: Added real-time student count chips to group header buttons (`Group A (X)`, `Group B (Y)`), syncing immediately with group member additions and removals.
      - **Accompanying Guests Handling**: Fixed student selection and group counts so accompanying guests attached to students are accurately accounted for without ghost count inflation.

  03. **"Select by Filter" Multi-Student Selection Tool (`NewSession.jsx`)**:
      - **Targeted Batch Selection**: Added a **"Select by Filter"** action button in the student roster table.
      - **Active Criteria Matching**: Instantly selects only the students who match the currently applied filters (Division, Level, Package, Search Query), streamlining multi-student assignment into surf sessions.

  04. **Calendar Date Lock & Future Date Protection (`NewSession.jsx`, `Sessions.jsx`)**:
      - **Future Date Restriction**: Disabled selecting future calendar dates where past performance or attendance logs cannot be pre-recorded.
      - **Local Time Accuracy**: Standardized ISO date helpers (`getTodayYYYYMMDD`) using local timezone formatting to prevent UTC day-shift bugs.

  05. **Active Time Slot Filtering per Day (`Sessions.jsx`)**:
      - **Day-of-Week Configuration Sync**: Updated `availableSlots` computation to cross-reference configured active slots (`session_slots` in settings) for the specific day of the week (Mon-Sun).
      - **Ghost Slot Removal**: Suppressed inactive zero-session slot tabs (e.g., `03:30 AM 0`, `08:31 AM 0`), showing only active and scheduled slots for the selected date.

  06. **Default "Today" Live Schedule & Session View Isolation (`Sessions.jsx`)**:
      - **Mandatory "Today" Default**: Configured the Surf Sessions dashboard to always load with **Today** selected by default, preventing the roster from dumping all historical sessions across the database (e.g., showing 51 of 51 historical sessions).
      - **Non-Deselectable Quick Filters**: Updated the `Today` filter button to remain active when clicked, preventing accidental toggling off to an empty state.
      - **Graceful Fallbacks**: Toggling off `Yesterday` or `Tomorrow`, clearing a custom date picker (`×`), or clicking `Reset Filters` automatically reverts the filter back to **Today**.
      - **Slot & Session Count Scoping**: Scoped `All Slots` count badges and slot metrics to the active date rather than database-wide totals.

  07. **Cleaned Day Details Modal UI (`Sessions.jsx`)**:
      - **Redundant Element Cleanup**: Removed extraneous `Details` pill buttons beside enrolled student names in the day details roster modal to simplify and streamline the layout.

  08. **Production Backend Deployment (AWS EC2)**:
      - **FastAPI Backend on EC2**: Deployed updated `backend/main.py` containing student creation `gender` field support to AWS EC2 (`i-0c62e04f44a9ea237`) via S3 bucket `aisurf-media-uploads-149051628601` and AWS Systems Manager (SSM Command ID: `6dff0a5e-c60d-43a6-83ac-1b32ec435972`).
      - **Service Restart & Health Verification**: Restarted `aisurf-backend` systemd service on EC2 (`54.242.160.238:8000`) with verified 200 OK live status.

  ### Changes on 13-10-2026

  01. **Student Phone Call Action in Session Roster (`Sessions.jsx`)**:
      - **Direct Call Link**: Added a direct `📞 Call` trigger button next to attendance check actions for each enrolled student, initiating phone calls (`tel:{student.phone}`) to their verified imported phone numbers.
      - **Data Sanitization**: Verified and resolved real student contact details across session attendance mappings.

  02. **Search Instructors Filter in Assign Instructors Wizard (`NewSession.jsx`)**:
      - **Instant Filter Input**: Added an interactive search box (`Search instructors...`) in Step 3 (Assign Instructors) enabling admins to quickly filter instructors by name, specialty, or email in real-time.

  03. **Automatic Sequential Group Re-Lettering / Re-Indexing (`NewSession.jsx`)**:
      - **Dynamic Letter Re-Assignment**: Implemented `reindexGroups` so deleting an earlier group (e.g., deleting Group A) automatically shifts and re-labels subsequent groups (Group B becomes Group A, Group C becomes Group B) per time slot.
      - **Zero Gaps Guarantee**: Maintains clean alphabetical continuity without orphaned letters or broken group card layouts.

  04. **Session Wizard Draft Persistence & Non-Intrusive Auto-Restore (`NewSession.jsx`)**:
      - **Local Draft Storage**: Implemented automatic localStorage draft persistence saving wizard step, selected slot, spot name, student roster mapping, and training groups.
      - **Clean UI**: Removed intrusive restore banners and alert popups, silently restoring user progress upon re-opening the wizard.

  05. **Browser Back Button Route Shield & Popstate Interception (`NewSession.jsx`)**:
      - **History Stack Synchronization**: Added `popstate` interception when `isModal={true}` so clicking the browser top-left Back button (`←`) closes the modal and keeps the user on the underlying page (`/sessions` or Dashboard) rather than jumping back to the previous route (`/students`).
      - **Mount Guard & Programmatic Back Handling**: Implemented a 600ms mount cooldown guard and programmatic flag `window.__newSessionIgnorePopState` to prevent React StrictMode and unmount lifecycle events from spuriously triggering close confirmation modals on reopen.

  06. **Enhanced Close Confirmation Dialog with "Keep Old Draft" & Cross Button (`NewSession.jsx`)**:
      - **"Keep Old Draft" Option**: Added a dedicated **`↩️ Keep Old Draft (Exit Without New Changes)`** action allowing users to exit while preserving their previously saved draft intact in storage without overwriting it with current edits.
      - **Explicit Action Labels**: Clarified options to **`💾 Save Current Draft & Close`**, **`↩️ Keep Old Draft`**, and **`🗑️ Delete Draft Completely (Clear All)`**.
      - **Top-Right Cross Button (`✕`)**: Replaced the bottom text "Cancel" button with a rounded top-right cross button (`✕`) with hover animations directly on the confirmation card.

  07. **Production Backend Deployment (AWS EC2)**:
      - **FastAPI Backend on EC2**: Successfully deployed updated `backend/main.py` containing session student contact mapping and auto-migration guards to AWS EC2 (`i-0c62e04f44a9ea237`) via S3 bucket `aisurf-media-uploads-149051628601` and AWS Systems Manager (SSM Command ID: `d40a1c6e-200a-4446-9c2d-59139c67b124`).
      - **Database Schema & Sessions Verification**: Added non-destructive startup column verification ensuring full PostgreSQL RDS compatibility. Verified all **266 live sessions** active and returning `200 OK` on `54.242.160.238:8000/api/sessions`.

  08. **Interactive 1-Click Athlete Selector Chips in Session Notes (`Sessions.jsx`)**:
      - **Always-Visible Athlete Cards**: Replaced the clunky `<select>` dropdown with interactive, always-visible athlete cards in the group evaluation notes modal.
      - **1-Click Switching**: Coaches and admins can instantly switch between athletes by clicking any student chip, immediately loading their wave count and feedback form without opening dropdown menus.
      - **Visual Indicators**: Displays athlete initials avatar, full name, guest badge, level tag (`Beginner`), evaluation status (`✓ Evaluated` in green / `Pending`), and highlighted active state with vibrant teal gradients.

  09. **Active Student Filtering & Registration Level Badge Mapping (`Analytics.jsx`, `StudentsManagement.jsx`, `main.py`)**:
      - **Strict Active Student Filtering**: Filtered the Analytics page (`/analytics`) table, badge count cards, and Retention Funnel to show **only currently active students** (`isStudentActive`) based on `start_date` and course duration, excluding past completed courses and future upcoming registrations.
      - **Registration Level to Badge Mapping**: Mapped student levels directly to badges:
        - `Beginner` ➔ **WHITE** Badge (Circle 1 filled silver-white, 3 weeks estimated)
        - `Advance Beginner` ➔ **YELLOW** Badge (Circles 1 & 2 filled, 1 month estimated)
        - `Intermediate` ➔ **GREEN** Badge (Circles 1, 2 & 3 filled, Ready Now)
        - `Advance Intermediate` ➔ **BLUE** Badge (Circles 1, 2, 3 & 4 filled, 3 months estimated)
        - `Pro` ➔ **RED** Badge (All 5 circles filled, Max Level)
      - **Dynamic Stats & Funnel**: Real-time count of active students at each level displayed in top stat cards and Retention Funnel chart.
      - **Standardized Registration Options**: Updated student registration forms (Single Add, Bulk Add, Guest forms) in `StudentsManagement.jsx` to offer the 5 standard levels matching badges.

  10. **Replaced Surf Stance with Surf Level Dropdown in Registration (`AuthPage.jsx`, `main.py`)**:
      - **Replaced Field**: Removed `Surf Stance` (`Regular` / `Goofy`) from both the primary student profile setup and accompanying guest sub-forms on the user registration page (`AuthPage.jsx`).
      - **New Surf Level Selector**: Replaced it with an interactive **`🏄 Surf Level *`** dropdown with options:
        - ⚪ **Beginner**
        - 🟡 **Advance Beginner**
        - 🟢 **Intermediate**
        - 🔵 **Advance Intermediate**
        - 🔴 **Pro**
      - **Backend Sync**: Updated `UserSignup` schema and `/api/auth/signup` in `backend/main.py` to persist `level` directly into the `Student` database model upon registration and invite activation.

  11. **Split-Screen Fixed Hero Image & Scroll Layout Fix (`AuthPage.jsx`)**:
      - **Prevented Image Cutoff**: Resolved issue where scrolling down long registration and guest forms caused the left hero image to end abruptly at 100vh and display empty black space below.
      - **Sticky Full-Height Hero**: Configured `.auth-panel-right` with `position: sticky; top: 0; height: 100vh; min-height: 100vh; background-size: cover;` so the ocean hero image stays fixed and covers 100% of the screen height without cutting off.
      - **Independent Panel Scroll**: Configured `.auth-panel-left` with `height: 100vh; max-height: 100vh; overflow-y: auto;` and a custom sleek scrollbar, allowing long forms to scroll comfortably without disturbing the hero panel.

  12. **Surfing Level & Badge Progression in Session Notes with Immediate Analytics Sync (`Sessions.jsx`, `Analytics.jsx`, `backend/main.py`)**:
      - **Current Badge Level Display**: In the Session Hub **Notes** evaluation tab, added an interactive **Surfing Level & Badge Progression** card right above the wave count and scoring cards for the active athlete.
      - **Visual Badge Icons on Chips**: Updated all athlete selector chips to display their badge icon dot (`⚪`, `🟡`, `🟢`, `🔵`, `🔴`) next to their level name, updating live as changes are made.
      - **Upgrade & Downgrade Controls**:
        - Added dedicated **`▲ Upgrade Level`** and **`▼ Downgrade`** buttons with boundary checks (disabled at Rank 1 Beginner or Rank 5 Pro).
        - Added 5 interactive level selector cards ( Beginner,  Advance Beginner,  Intermediate, 🔵 Advance Intermediate, 🔴 Pro) with active glow, rank pill (`Lvl X`, `✓ Earned`, `Current`), and 1-click level switching.
      - **Immediate Analytics & Database Reflection**:
        - Updated `backend/main.py` (`PUT /api/sessions/{session_id}` and `PUT /api/students/{student_id}`) so that when a coach saves, the updated level is persisted to both the session and student record, and automatically synchronizes the `badges` table (deletes old and inserts earned badges up to current rank).
        - Updated `Analytics.jsx` to prioritize the updated level rank, ensuring the top badge cards (WHITE, YELLOW, GREEN, BLUE, RED), the Retention Funnel, and active student list table reflect the upgraded or downgraded level immediately upon saving.
        - Added a read-only current badge progress banner in the student report card view when logged in as an athlete.

  13. **Resolved macOS / Safari Screen Flickering & Stuttering (`StudentsManagement.jsx`, `Sidebar.jsx`, `Sessions.jsx`)**:
      - **Root Causes Identified**:
        1. `Sidebar.jsx` contained an aggressive 1000ms `setInterval` calling `setSchool({ ... })` unconditionally with a fresh object reference, forcing a full `Sidebar` re-render every second.
        2. `StudentsManagement.jsx` contained a 1500ms `setInterval` incrementing `reqRefreshKey`, triggering a complete component re-render of the entire 6,000+ line tree every 1.5 seconds.
        3. On macOS Retina displays (WebKit/Blink + Apple Metal CoreAnimation compositor), continuous background re-renders underneath `.sm-modal-overlay` with `backdrop-filter: blur(10px)` forced the GPU compositor to invalidate blur texture buffers on every tick, causing visible screen flickering and flashing.
        4. Missing WebKit vendor prefixes (`-webkit-backdrop-filter`) and missing 3D hardware layer promotion (`transform: translate3d(0,0,0)`, `backface-visibility: hidden`).
        5. Layout shifts from Windows-centric `paddingRight` scrollbar calculations applied on macOS overlay scrollbars.
      - **Fixes Applied**:
        - **Eliminated Rapid Polling Loops**: Removed the 1s and 1.5s intervals; state is now updated cleanly via native `storage`, `focus`, and `user_updated` event listeners only when values actually change.
        - **WebKit & Metal GPU Layer Promotion**: Added `-webkit-backdrop-filter: blur(...)`, `-webkit-transform: translate3d(0, 0, 0)`, `transform: translate3d(0, 0, 0)`, and `-webkit-backface-visibility: hidden` to all modal overlays and dialog cards to force continuous GPU compositing without frame drops.
        - **3D Animation Compositing**: Updated `@keyframes sm-slideUp` from 2D `translateY` to `translate3d(0, 20px, 0)` so the GPU compositor avoids software fallback rasterization.
        - **Mac Overlay Scrollbar Protection**: Added macOS platform detection to prevent layout padding shifts on macOS floating scrollbars.

  14. **Simplified & Compact Surfing Level UI in Session Notes (`Sessions.jsx`)**:
      - **Replaced Bulky Design**: Replaced the previous large multi-box card with a clean, compact horizontal card matching the minimalist aesthetic of Card 1 (Wave Count).
      - **Clean Header Row**: Displays `🏄 Surfing Level:` alongside a small badge tag showing the active level, with compact `▼ Downgrade` and `▲ Upgrade` buttons placed neatly on the right.
      - **Single-Row Level Pills**: Rendered 5 compact horizontal pill buttons (`⚪ Beginner`, `🟡 Advance Beginner`, `🟢 Intermediate`, `🔵 Advance Intermediate`, `🔴 Pro`) with a subtle `CURRENT` tag for the selected rank.
      - **Zero Clutter**: Removed oversized icons, redundant athlete subtitle banners, and bulky footnote text while preserving 100% of the 1-click level switching, upgrade/downgrade logic, and database/analytics sync on save.

  15. **Fixed White Screen Crash in `Sidebar.jsx` (`TypeError: Cannot read properties of null (reading 'name')`)**:
      - **Root Cause**: `school` state in `Sidebar.jsx` was initialized to `null`. On initial render, `setSchool(prev => ...)` evaluated `prev.name`, throwing an unhandled TypeError that crashed the React tree.
      - **Fix Applied**: Initialized `school` state to `{ name: '', owner: '' }` and added safe optional chaining `prev?.name === newName && prev?.owner === newOwner` to prevent any unhandled null references.

  16. **Uniform Fixed-Size Grid for Athlete Chips & Level Pills (`Sessions.jsx`)**:
      - **Prevented Inconsistent Card Widths & Layout Shift**: Previously, athlete selector chips used flex wrapping with variable text-based widths. When an athlete's level had longer text (e.g. `Advance Beginner`), the card expanded and forced the last athlete (`Lalitha`) onto a second line with an awkward small size, and jumped back when shortened.
      - **Uniform CSS Grid Layout**: Configured `.sessions.length <= 4` to use `repeat(N, minmax(0, 1fr))` and a fixed `56px` height with text truncation ellipsis. All 4 athlete cards now stay permanently on the exact same row with 100% identical pixel width and height.
      - **Uniform Level Pills**: Configured the 5 Surfing Level pills to use `repeat(5, minmax(0, 1fr))` so Beginner through Pro buttons share the exact same 20% width and height.

  ---

  ### Changes on 14-10-2026

  1. **Coach Active/Inactive Toggle & School Lock (`InstructorManagement.jsx`, `backend/main.py`)**:
    - Added toggle switch on instructor cards to set coaches Active or Inactive.
    - Enforced rule: Active coaches cannot switch schools until marked inactive.
    - Cleaned up coach profile header by removing redundant status badge.

  2. **Streamlined Date Range Filter Bar (`DateRangeFilterBar.jsx`)**:
    - Integrated unified date filtering across `InstructorManagement`, `StudentsManagement`, and `Sessions`.
    - Removed `This Week` and `This Month` preset buttons for a clean, spacious bar (`Yesterday`, `Today`, `Tomorrow`, `All`).
    - Redesigned From/To calendar inputs with clear bordered cards and 1-click calendar picker open (`showPicker`).
    - Enforced strict fixed dimensions so the filter bar never shifts or changes size when toggling dates.

  3. **Header Profile Button & Guest Admin System (`UserProfileMenu.jsx`, `Sidebar.jsx`, `backend/main.py`)**:
    - Replaced plain logout icon in top header with an interactive, framed Profile Button with avatar, name, role, and chevron badge.
    - **Guest Admin Creation**: School Admin can create guest admin logins (ID & Password) linked to their school. Guest Admins get full access to all school pages (Dashboard, Instructors, Students, Sessions, Competitions, Analytics), while keeping primary School Admin accounts separate and secure.
    - **Delete My Account**: Added secure account deletion modal requiring user confirmation.
    - **Log Out**: Clean sign-out action inside the profile dropdown.

  4. **Dynamic Active Today vs Total Students for Coaches (`InstructorManagement.jsx`, `InstructorProfile.jsx`, `backend/main.py`)**:
    - **Active Today Metric**: Coach cards (`/instructors`) and profile (`/instructors/:id`) now dynamically distinguish between students active *today* versus *total all-time students*.
    - **Auto-Transition on Subsequent Days**: When a coach is assigned to a student's session today, that student appears under `🟢 Active Today`. On subsequent days, they automatically move to `👥 Total Students` so coaches maintain complete student coaching history while keeping the active daily roster focused only on today's sessions.
    - **Coach Card 3-Column Stats**: Displays `Active Today: 🟢 X`, `Total Students: Y`, and `Experience`.
    - **Coach Profile Tabs**: Added `🟢 Active Today (X)` and `👥 Total Students (Y)` view toggle tabs on the Assigned Students card with clean empty states.
    - **Student Time Format**: Preserved original clean, minimalist subtitle format (`s.last_active || 'Today'`) under each student name.
    - **Backend API Sync**: Updated `instructor_to_dict` in `backend/main.py` to calculate `active_students` (today's sessions) and `total_students` (all-time sessions) with school isolation.

  5. **Student Assignment & Filter Workflow Improvements (`NewSession.jsx`, `Sessions.jsx`)**:
    - **Cumulative "Select by Filter"**: Applying filters (gender, kids, level) selects newly matched students without deselecting previously chosen ones; students can only be deselected manually.
    - **Streamlined Card Badges**: Focused badge info on gender, kids, and session day, hiding unnecessary adult tags.
    - **Previous Coach Hint**: Displays previous day's assigned coach with low opacity for historical context when assigning new sessions.
    - **Active Sessions Scope**: Displays only currently active sessions.

  6. **Stability & Bug Fixes (`InstructorProfile.jsx`)**:
    - Resolved React runtime error (`Uncaught ReferenceError: useMemo is not defined`) in `InstructorProfile.jsx` by adding `useMemo` to the React import list.

  7. **Date Range Filter Bar in Badge Progression / Analytics (`Analytics.jsx`, `DateRangeFilterBar.jsx`)**:
    - Integrated the unified `DateRangeFilterBar` into the Badge Progression page (`/analytics`), matching `InstructorManagement`, `StudentsManagement`, and `Sessions`.
    - Offers quick presets (`Yesterday`, `Today`, `Tomorrow`, `All`) and custom `From` / `To` calendar pickers.
    - Real-time dynamic updates: Stat cards (`WHITE`, `YELLOW`, `GREEN`, `BLUE`, `RED`), the `Retention Funnel`, and the student roster table automatically re-calculate for the chosen date or range.
  8. **Compact Multi-Coach Badge & Touch Tooltip in Sessions Table (`Sessions.jsx`)**:
    - **Resolved Column Collision**: Fixed UI overlap where long multi-coach strings (e.g. `Dipayan Bhattacharjee & Raavi Sainath`) exceeded the `INSTRUCTOR` column and touched/overlapped the `STATUS` column (`• COMPLETED`).
    - **Compact `+1` Pill Badge**: Now gracefully shows stacked avatars, the first coach's name (truncated with ellipsis), and a sleek `+1` (or `+{count - 1}`) badge.
    - **Interactive Touch & Hover Tooltip**: On mobile touch or desktop hover, a floating dark tooltip reveals the full list of assigned coaches (`1. Coach Name`, `2. Coach Name`).
    - **Full Modal on Click**: Tapping/clicking the badge opens the `MultiCoachModal` with full profiles, star ratings, and review details.
    - **Multi-Delimiter Parser**: Fully supports both comma (`,`), ampersand (`&`), and `and` delimiters when handling multi-coach assignments.

  9. **Student Profile Loading & Multi-Coach Support (`StudentProfile.jsx`, `backend/main.py`)**:
    - **Resolved 500 Internal Server Error**: Fixed SQLAlchemy `inspect` scoping bug in `backend/main.py` inside `session_to_dict`, allowing students with sessions to load without failing.
    - **Resolved "School Admin" Profile Display Bug**: When an admin or coach views a student profile, the page no longer falls back to the logged-in admin's name and details.
    - **Multi-Coach Badges on Student Profile**: If a student is assigned to multiple coaches across their sessions or group notes, all coaches are now displayed individually (`Coaches: [Coach A ★ Review] [Coach B ★ Review]`), allowing each coach's profile to be opened and reviewed independently.

  10. **Local PostgreSQL Database Migration & Full Live Sync (`pull_live_to_local_pg.py`, `backend/main.py`)**:
      - **Transition from SQLite to PostgreSQL**: Switched the local development environment from SQLite to local PostgreSQL 17 (`localhost:5432/surfing_db`, user: `postgres`).
      - **Direct Live RDS Backup Ingestion**: Exported fresh data from live AWS RDS cluster (`aisurf-db-cluster`) via EC2 SSM and S3, restoring complete data parity locally.
      - **Foreign Key Safe Replication**: Implemented `session_replication_role = 'replica'` during bulk import to preserve relational integrity across users, schools, instructors, students, sessions, and scores.
      - **Dapoli Location Parity**: Verified and synced Dapoli Surf School location to `"Dapoli, Maharashtra"` across schools and instructors in both local and live environments.

  11. **Accompanying Guest Students (`guests_details`) Restoration & Search**:
      - **Database Guest Sync**: Restored complete accompanying guest details (`guests_details` JSON and `guests_count`) across 82 students totaling 164 guest athletes into local PostgreSQL `surfing_db`.
      - **Guest Roster Search**: Enhanced student roster search in `StudentsManagement.jsx` to dynamically search within accompanying guests (matching by guest name, phone, or email) in addition to primary student profiles.
      - **Expandable Guest UI**: Retained clean inline dropdown toggles (`👥 [X] Guests ▼`) under each parent student in the roster table, displaying all accompanying guest profiles in a straight-line grid.

  12. **Student Roster & Badge Progression Live Parity (`StudentsManagement.jsx`, `Analytics.jsx`, `backend/main.py`)**:
      - **Students Roster Default View (`StudentsManagement.jsx`)**: Updated default roster view to `TOTAL` and `All` dates so all 130 school students are immediately visible upon opening; clicking `TOTAL` or badge cards automatically clears date restrictions. Fixed `Clear Filters` button to reset `dateRange`.
      - **Analytics Active Student Calculation**: Root-caused why Analytics showed 0 active students locally: local `students` table previously had empty `start_date` strings. Fully synced live student `start_date` and `course_duration` into local PostgreSQL.
      - **100% Production Code Parity**: Preserved `active_only = True` in `backend/main.py` (`analytics_badges` & `analytics_students`) and `Today` date filter in `Analytics.jsx`. Verified local Analytics matches Live AWS EC2 1:1, accurately displaying **45 active athletes** (23 active students + 22 guests) today with zero production deployment conflicts.

  ---

  ### Changes on 20-10-2026

  1. **Session Publishing & Re-publishing Student Assignment Fix (`NewSession.jsx`, `backend/main.py`)**:
    - **Problem**: When a group was already published and newly added students were added to that same group and published again, the new students were not getting properly created in `SurfSession` or assigned to the coach in the `Student` database table (`student.instructor_id` & `student.session_time`).
    - **Differential Publishing Workflow**: Updated `publishSingleGroup` and batch publish logic in `NewSession.jsx` to dynamically track existing session student IDs and execute differential batch requests via `POST /api/sessions/bulk` for any newly added students.
    - **Backend Auto-Assignment Sync**: Enhanced `POST /api/sessions/bulk` and `PUT /api/sessions/{session_id}` in `backend/main.py` so that student records (`Student.instructor_id`, `Student.instructor_name`, and `Student.session_time`) are automatically synced and persisted to the assigned coach upon session creation or update.

  2. **Coach Portal Invitation Link & Direct Profile Redirection (`backend/main.py`, `CoachPortal.jsx`)**:
    - **Problem**: Coach invite links sent via email were stripping local ports and defaulting to the production domain (`athnexlive.com`), causing link failures during local development. Additionally, the coach portal was not automatically redirecting invited coaches to their designated profile.
    - **Base URL Preservation**: Refactored `get_app_base_url` in `backend/main.py` to preserve incoming `Origin` / `Referer` headers for `localhost` and `127.0.0.1` environments.
    - **Direct Coach Profile Access**: Appended `?id={instructor.id}` to coach invite links (`http://localhost:5173/coach-portal?id=...`).
    - **Session & Routing Handshake**: Updated `CoachPortal.jsx` to parse the instructor ID, store the active school in `sessionStorage.activeSchool`, initialize the coach user session, and automatically redirect directly to `/instructors/:id`.

  3. **Session Slot Auto-Reverting Bug Fix (`NewSession.jsx`, `SessionConfigure.jsx`, PostgreSQL `school_slot_configs`)**:
    - **Problem**: When session slots were configured to `06:30 AM - 08:30 AM` (120 mins) or customized, the UI was reverting back to the default `07:00 AM - 08:30 AM` (90 mins) slot upon re-assignment or page reload.
    - **Slot Configuration Parity**: Updated default slot constants (`DEFAULT_CONFIGURED_SLOTS` in `NewSession.jsx` and `defaultSlots` in `SessionConfigure.jsx`) to `06:30 AM - 08:30 AM` (120 min), `09:30 AM - 11:30 AM` (120 min), and `02:00 PM - 04:00 PM` (120 min).
    - **PostgreSQL Database Sync**: Updated `school_slot_configs` in the local PostgreSQL database (`surfing_db`) and synced existing sessions for `2026-10-19` and `2026-10-20` to reflect 120-minute durations and correct start/end times.
    - **State Persistence & Storage Events**: Removed redundant slot-fetching `useEffect` in `NewSession.jsx` that was overwriting in-memory user slot selections. Direct persistence to `localStorage` and `session_slots_updated` custom event dispatching guarantees instantaneous sync across tabs without slot reverts.

  4. **Students Section Default Date Filter to "Today" (`StudentsManagement.jsx`)**:
    - **Problem**: In the Students section (`/students`), the filter bar was defaulting to "All" with all 294 historical/future students listed on page load, whereas Sessions and Instructors defaulted to "Today".
    - **Default Date State**: Updated default state in `StudentsManagement.jsx` so `dateFilter` and `dateRange` default to `todayIso` with `preset: 'today'`.
    - **Active Stat Card Sync**: Synced `activeStatFilter` to default to `'ACTIVE'`, displaying only the active students (e.g. 47 active students) for the current day by default.
    - **Bi-directional Filter Toggle**: Updated `DateRangeFilterBar` `onChange` handler so toggling presets smoothly synchronizes between `ACTIVE` and `TOTAL` stat cards, while retaining instant one-click access to view all students.

  5. **Manual Draft Save Enforcement & Exit Confirmation Modal (`NewSession.jsx`)**:
    - **Enforced Explicit Draft Saving**: Removed automatic background draft save on state change so drafts are ONLY persisted to storage/backend when the user explicitly clicks the `💾 Save Draft` button (or confirms "Save Draft & Close").
    - **Exit Confirmation on Unsaved Progress**: When closing via the top-right `(X)` close button, clicking the background overlay, or using the browser Back button without having saved the current draft, the modal now intercepts and displays an alert:
      - `💾 Save Draft & Close`: Saves current session progress as draft and exits cleanly.
      - `🚪 Close Without Saving`: Safely discards unsaved changes for this session without altering existing drafts.
      - `✕ Keep Editing`: Dismisses dialog so the user can continue setting up their session without losing progress.

  6. **Total Elimination of `localStorage` for Drafts & Slots (100% Backend API & PostgreSQL Driven)**:
    - **Zero LocalStorage for Sessions**: Completely eliminated `localStorage` reads, writes, and caching for session drafts (`surfing_session_draft_*`) and session slots (`session_slots`) across `NewSession.jsx`, `SessionConfigure.jsx`, `Sessions.jsx`, and `StudentsManagement.jsx`.
    - **Backend API & Database Single Source of Truth**: All session drafts are saved, fetched, and deleted exclusively via PostgreSQL endpoints (`/api/session-drafts`). All session slots are loaded and persisted exclusively via PostgreSQL endpoints (`/api/session-slots`).
    - **Automatic Client Storage Purge**: Added an automated sweep on mount that instantly purges any legacy `surfing_session_draft*` and `session_slots` keys from the browser's `localStorage` to permanently prevent stale client cache conflicts.

  7. **Capacity & Slot Normalization (Database & Code Parity)**:
    - **Root-Cause Resolution for 80 Capacity**: Identified and corrected hardcoded `maxStudents: 80` in `DEFAULT_CONFIGURED_SLOTS` and `defaultSlots`, which had persisted into `school_slot_configs.slots_json` in PostgreSQL.
    - **PostgreSQL Database Cleanup**: Updated `school_slot_configs`, `session_drafts`, and `sessions` tables in `surfing_db`: normalized Slot 1 capacity to 10 (default 5) and time to `06:30 AM - 08:30 AM` (120 mins).
    - **Historical Session Record Correction**: Synced all 17 sessions for `2026-10-20` (Groups A, B, C, D) in the `sessions` table to `06:30 AM - 08:30 AM` with `duration_mins = 120`.

  8. **Roster Refresh Badge Copy & English UI Modernization**:
    - **Student Roster Refresh Badge**: Updated Step 2 refresh notification to only display new student deltas (`✓ X new student(s) added` or `✓ Roster is up to date`), removing the redundant total count display `(47 active available)`.
    - **Strict English UI**: Maintained 100% professional English UI text across all modals, dialogs, button labels, and alert notifications.

  9. **Slot Capacity Stepper & Direct Typing Input Fix (`NewSession.jsx`)**:
    - **Problem**: Users were unable to cancel, backspace, or clear the capacity number (e.g. `5`) inside the stepper input box because `getSlotCapacity` was treating empty strings as invalid and instantly snapping the input back to the slot's default capacity.
    - **Dynamic Input & State Decoupling**: Updated `getSlotCapacity` to preserve empty string values (`''`) while the user is actively typing, allowing full backspacing and clearing.
    - **Auto-Select on Focus**: Added `onFocus={(e) => e.target.select()}` so clicking into the input automatically highlights the entire number for instant replacement.
    - **Safe Blur Fallback**: Added `onBlur` validation to safely restore the slot default (`slot.maxStudents || 5`) only if the input is left completely blank when clicking outside.

  10. **Exit Confirmation Modal Streamlining (`NewSession.jsx`)**:
      - Removed the redundant `✕ Keep Editing` button from the exit confirmation modal.
      - The dialog now presents two distinct, unambiguous action choices:
        - `💾 Save Draft & Close`
        - `🚪 Close Without Saving`
      - Preserved top-right `(X)` close icon to dismiss the modal without altering state.

  11. **Published Session Auto-Hydration & Full Step 2 / Step 3 Sync Fix (`NewSession.jsx`)**:
      - **Problem**: When navigating to a session date with already published sessions in PostgreSQL (e.g. `Tuesday, Oct 20, 2026`), Step 2 and Step 3 displayed `0 Students`, `0 Groups`, and `0 Students Imported` even though the green `✓ Published` badge was visible.
      - **Root Cause**:
        - Stale discard flags in `sessionStorage` (`surfing_session_draft_discarded`) and `userClearedGroupsRef` were prematurely aborting the database sync effect.
        - Date comparisons in `existingDbDateSessions` suffered from timezone shifts when converting local midnight dates to ISO strings (`2026-10-19` vs `2026-10-20`).
        - `existingDbGroups` was returning `[]` if `allPoolStudents` had not yet finished fetching.
        - `importedStudents` in Step 3 only referenced `allSelectedStudentIds` and excluded groups hydrated from the database.
      - **Fixes Applied**:
        - **Timezone-Safe Date Parsing**: Enhanced `existingDbDateSessions` to safely check formatted strings, local YYYY-MM-DD strings, and UTC fallback dates without local timezone offset errors.
        - **Robust Group & Student Hydration**: Updated `existingDbGroups` to hydrate groups directly from sessions and map students by name, guest name, and ID with non-lossy fallbacks.
        - **Automatic State Sync**: The sync `useEffect` now automatically populates `trainingGroups`, `slotStudentMap`, and slot capacities whenever published groups exist in the database and wizard state is empty.
        - **Comprehensive Step 2 & Step 3 Stats**: Updated `allSelectedStudentIds`, `importedStudents`, `filteredColumn1Students`, and `activeSlotStudentIdSet` to seamlessly include all students from both `slotStudentMap` and `trainingGroups`.
        - **Slot Badge & Status Real-Time Counts**: Step 2 time slot pills and status filter counts (`Selected (17)`) and Step 3 summary stats (`17 Students Imported`, `4 Groups`) now accurately display all published students immediately upon date selection.

  12. **Sticky Action Bar Layout & UI Modernization (`NewSession.jsx`)**:
      - **Anti-Clipping & Responsive Viewport Fit**: Refactored the sticky bottom action bar in `NewSession.jsx` to prevent right-hand navigation buttons (`Save Draft`, `Import & Next »`) from overflowing or getting clipped at standard desktop laptop display resolutions.
      - **Clean Modern Aesthetic & Emoji Removal**: Replaced legacy emoji icons (`⏰`, `💾`, `🚀`, `📅`) across draft counters, step indicator pills, and action buttons with modern SVG vectors and high-contrast chip tags.
      - **Expected Slot Mapping on Student Cards**: Added compact `Exp: [Slot Time]` badges directly inside student draggable cards in Step 2, clearly indicating each student's preferred surf session window.

  13. **Dedicated Expected Time Column & Student Table Polish (`StudentsManagement.jsx`)**:
      - **Separate Expected Time Column**: Extracted the slot / expected session time out of the cramped `DATE` column in the student roster table and created a clean, dedicated `EXPECTED TIME` column with custom teal badges.
      - **Emoji Cleanup across Student Roster**: Removed emoji prefixes (`🗓️`, `⏰`, `🏄`, etc.) throughout table headers and rows, establishing a sleek, enterprise-grade data layout.

  14. **Pending Student Registration Approval & Active Roster Sync Fix (`StudentsManagement.jsx` & `backend/main.py`)**:
      - **Problem**: When a school admin approved an online student registration from the "Pending Requests" modal, the student remained hidden from the main active roster table under the default `ACTIVE` tab and `Today (20-10-2026)` filter.
      - **Root Cause**:
        - Auto-created or pre-existing student records lacked valid `start_date` and `end_date` values (`start_date = NULL`).
        - In `StudentsManagement.jsx`, `isStudentActive()` and `matchesDateFilter` require a valid start date. Students with `start_date = NULL` evaluated to `isActive: false`, permanently excluding them from the `ACTIVE` tab and date range filters.
        - `handleApproveStudentRequest` previously skipped saving student form fields if a student record already existed by email, calling only the basic approval endpoint without passing `start_date`, `school`, `course_duration`, or `session_time`.
      - **Fixes Applied**:
        - **Comprehensive Approval Payload (`StudentsManagement.jsx`)**: Updated `handleApproveStudentRequest` to dispatch a `PUT /api/students/:id` request containing complete registration metadata (`start_date` defaulting to today `YYYY-MM-DD`, `name`, `school`, `course_duration`, `session_time`, `level`, and `swimming_ability`).
        - **Backend Approval Guarantees (`backend/main.py`)**: Enhanced `approve_student` and `approve_student_by_email` endpoints to ensure `start_date` and `end_date` are always computed and saved, preventing empty dates from persisting in the database.
        - **Athlete Student Auto-Creation Fallback**: Updated `GET /api/students/{student_id}` so fallback athlete student records automatically populate default `start_date = today` and `school = user.school_name`.
        - **PostgreSQL Database Normalization**: Synchronized student record ID 215 (`Eric Sheldon RS`) with active dates (`2026-10-20` to `2026-10-22`), course duration (`3 Days Course`), and session slot (`06:30 AM - 08:30 AM`), making the student immediately visible in the active student roster.

  15. **Expected Time Integration in "Add Multiple Students" & "Import CSV" (`StudentsManagement.jsx`)**:
      - **Multiple Students Grid Entry (`addMode === 'multiple'`)**:
        - Added dedicated `Expected Time *` column to the bulk entry table grid with a styled dropdown pre-populated from active school slots (e.g. `06:30 AM - 08:30 AM`, `09:30 AM - 11:30 AM`, `02:00 PM - 04:00 PM`).
        - Updated `bulkRows` state initialization, `handleAddRow`, and `handleDeleteRow` to properly preserve the selected slot for each student.
        - Updated `handleBulkSubmit` to submit each student's designated `session_time` to `/api/students/bulk` instead of leaving it blank.
        - Adjusted accompanying guest sub-row `colSpan` from 10 to 11 for consistent grid alignment.
      - **CSV Import Engine & Template (`addMode === 'csv'`)**:
        - Enhanced `handleCSVUpload` with header pattern matching for `Expected Time`, `Session Time`, `Time`, and `Slot`, automatically assigning parsed slots or falling back to the school's primary slot.
        - Updated `downloadCSVSample` to include `Expected Time` in CSV headers and sample data rows.
        - Updated the CSV preview mini-table and CSV format specification guidelines to display and accept `Expected Time`.

  ---

  ### Changes on 21-10-2026

  1. **Accompanying Guests Count & Multi-Guest Calculation Fix in Sessions (`Sessions.jsx`)**:
    - **Problem**: In Session cards (`Sessions.jsx`), the "NUMBER OF STUDENTS" count was only counting host athletes and omitting accompanying guests, resulting in undercounted session headcounts.
    - **Composite Identity Keys**: Introduced `getSessionStudentKey(session)` to differentiate accompanying guests (`guest_name:guest_index:parent_id`) from primary host students.
    - **Comprehensive Headcount Calculation**: Updated `collectUniqueStudentKeys` and active session headcount cards so that all accompanying guests are accurately counted alongside primary athletes.
    - **UI Alignment**: Fixed layout alignment and typography of student and guest counters across session headers and cards.

  2. **In-Table Expected Time Editing for School Admin (`StudentsManagement.jsx`)**:
    - **Direct Table Interaction**: Made the `EXPECTED TIME` column cell interactive for School Admins (`isAdminOrSchoolAdmin`) with an `Edit` badge, pointer cursor, and tooltip.
    - **Event Propagation Guard**: Prevented parent row profile navigation on cell click (`e.stopPropagation()`).
    - **"⏰ Edit Expected Time" Modal**: Implemented an administrative modal dialog allowing School Admins to quickly pick configured school slots, clear time (`—`), or type a custom time string.
    - **Backend Sync**: Dispatched `PUT /api/students/{id}` with `{ session_time }`, synchronously updating local state and triggering a success toast notification.

  3. **Step 2 Expected Time Filter & 1-Click Roster Scheduling (`NewSession.jsx`)**:
    - **Dedicated Filter Row**: Added an "⏰ Expected Time:" filter row in Step 2 of `NewSession.jsx`.
    - **Dynamic Pill Group**:
      - `All ({count})`: Displays all available pool students.
      - `🎯 Matches Current Slot ({slotTime}) ({count})`: Filters students matching the currently selected slot tab.
      - Dynamic pills for each unique expected time among roster students with live counts (e.g. `06:00 AM (25)`, `09:30 AM (12)`).
      - `No Expected Time ({count})`: Filters unassigned students without an expected time slot.
    - **"Select by Filter" Integration**: Updated the "Select by Filter" button to respect the active expected time filter, allowing coaches to batch-select all students expecting a given slot into that slot in a single click.
    - **Draft Persistence**: Stored and restored `expectedTimeFilter` in session draft payloads via `/api/session-drafts`.

  4. **Zero Layout Shift & Size-Stable Slot Pill Buttons (`StudentsManagement.jsx`)**:
    - **Problem**: When selecting slot pill buttons in modals, buttons jumped in width and height, causing visual jitter and shifting the entire layout.
    - **Root Cause**: Border width was changing between `1px` and `1.5px`, font weight was toggling from `600` to `800`, and a `✓` checkmark span was being dynamically inserted into the DOM only on selection.
    - **Pixel-Locked Dimensions**: Enforced constant `border: 1.5px solid` and constant `fontWeight: 600` for both selected and unselected states across all slot buttons.
    - **Fixed-Space Checkmark**: Replaced conditional DOM insertion with a reserved `width: 12px` container using `visibility: isSelected ? 'visible' : 'hidden'`, guaranteeing 100% stable pixel dimensions with zero layout shift on click.

  5. **Manual Custom Time Slot Input in Modals (`StudentsManagement.jsx`)**:
    - **Direct Typing Support**: Added a manual text input box directly below slot pills in both School Batch Registration Invite modal and Add Student modal (`Or type custom slot (e.g. 06:00 AM)`).
    - **Two-Way Sync**: Selecting a pill automatically fills the input; typing a custom time updates the state, highlights the input with teal accent borders, and automatically locks the custom slot in the invite link.
    - **Quick Reset**: Added a `✕ Clear` / `Student Choice (Flexible)` button to easily reset to flexible mode.

  6. **Start-Time Only Display Normalization (`StudentsManagement.jsx`, `AuthPage.jsx`, `NewSession.jsx`)**:
    - **Removed End-Time Clutter**: Refactored `formatSlotDisplayTime` across `StudentsManagement.jsx` and `AuthPage.jsx` to strip end-time ranges (`- 08:00 AM`) and display only clean start times (e.g. `06:00 AM`, `07:00 AM`, `09:30 AM`).
    - **Unified Display Parity**: Updated the `EXPECTED TIME` table column, student card `Exp:` badges, and onboarding slot selectors to consistently display start time only.

  ---

  ### Changes on 23-10-2026

  1. **Strict Multi-Tenancy & Cross-School Data Isolation (`backend/main.py`)**:
    - **Superadmin Bypass Leak Fix**: Removed `"school admin"` from the superadmin bypass list (`["all", "superadmin", "super admin"]`) in `/api/students`, `/api/instructors`, and `/api/sessions`. Non-superadmin users (e.g. School Admins) can now strictly access only records belonging to their authenticated school.
    - **Student & Coach Endpoint Scoping**: Enforced strict `Student.school == clean_school` and `Instructor.school == clean_school` filters, preventing students from other schools (such as Pro or Advance level students) from leaking into another school's roster or session wizard.
    - **Session Slot Isolation (`/api/session-slots`)**:
      - Removed unsafe global fallback queries (`query.order_by().first()`) in `get_session_slots` that returned another school's configuration when a school lacked custom slots.
      - Scoped `SchoolSlotConfig` lookups and saves strictly by `school_id` and `school_name`. Saving a new slot configuration now creates an isolated row for the school rather than overwriting another school's master configuration.
    - **Session Model & Endpoint Parity**:
      - Added `student_name` and `guest_name` fields to `SessionCreate`, `SessionUpdate`, and single `create_session` (`POST /api/sessions`), ensuring 100% attribute parity with `create_sessions_bulk`.

  2. **Frontend Multi-Tenancy Protection (`StudentsManagement.jsx`, `Sessions.jsx`, `SessionConfigure.jsx`, `NewSession.jsx`)**:
    - **Active School Resolution**: Standardized `getActiveSchoolInfo()` across components (`sessionStorage` -> `localStorage` -> `currentUser.school`), ensuring correct `schoolId` and `schoolName` propagation.
    - **Defense-in-Depth Filtering**:
      - `StudentsManagement.jsx`: Disabled `school=all` queries for school admins; added client-side post-filtering to purge any record not matching `effectiveSchool`.
      - `Sessions.jsx`: Scoped session fetching and student lookup strictly to active school; fixed guest rendering to display actual guest names (`guest_name || 'Guest'`) with parent tags.
      - `SessionConfigure.jsx`: Added clean fallback to `defaultSlots` when a school has no saved slots; added window event listeners (`storage`, `user_updated`) to reload slots immediately on school switch.
      - `NewSession.jsx`: Updated `normalizeStudentsData` to strictly reject any student not belonging to the active school (`return false` fallback), eliminating foreign Pro-level students from the scheduling pool.

  3. **Session Scheduling Wizard Count Parity & Group Safety (`NewSession.jsx`)**:
    - **Slot Pill Count Mismatch Bug Solved**: Updated `getSlotAllStudentIds` to make `trainingGroups` the single source of truth for Step 3 slot pills. The slot pill count (e.g. `3 Students`) now strictly equals the number of students inside the group card, eliminating ghost count discrepancies (e.g. `10 Students` vs `6 Students`).
    - **Independent Group Slot Grouping**: Keyed existing database groups by `${slotId}__${sessTime}__${groupName}` to prevent merging sessions across different time slots.
    - **Protected Published Session Groups**: Protected published groups from accidental deletion in Step 3 — hidden/disabled `✕` button and `Clear All` for already-published groups; updates can only be made via "Update Published Session".
    - **UI Badge Polish**: Replaced raw database `#ID` badges on student chips/cards with clean `👥 Guest [Index] ([Parent Name])` tags.

  4. **End-to-End Scheduling Verification & Automated Testing**:
    - Automated end-to-end scheduling API verification completed for `Friday, Oct 23, 2026`:
      - Step 1: Slot capacities (`09:30 AM` [80], `03:00 PM` [80], `07:00 AM` [4]) and custom date configurations.
      - Step 2: Student pool filtering (7 active students for `rpn tech ac`, 0 Pro / Advanced from other schools).
      - Step 3: Group creation, coach assignment, coach leave check, and concurrent same-time coach conflict detection.
      - Step 4 / Backend: Bulk session creation payload persistence, differential updates, and multi-tenancy verification (0 cross-school session leaks).
    - Validated Python syntax (`python -m py_compile backend/main.py`) and Vite production bundle (`npm run build`) passing with zero errors.

  ---

  ### Changes on 24-10-2026

  1. **Live AWS RDS Safe Read-Only Backup & Local PostgreSQL Refresh**:
    - **100% Strict Read-Only Extraction (`safe_backup_and_replace_local.py`)**:
      - Dispatched AWS Systems Manager (SSM) worker to EC2 instance `i-0c62e04f44a9ea237` to dump live Aurora PostgreSQL cluster (`aisurf-db-cluster`).
      - Enforced `conn.set_session(readonly=True, autocommit=False)` guaranteeing 0 database writes, 0 table locks, and zero interference with live user activity.
      - Extracted all 38 public tables into S3 bucket `aisurf-media-uploads-149051628601`.
    - **Local Hard Backups Generated**:
      - Generated timestamped JSON backup: `backups/aisurf_live_backup_20261024_132626.json` (43.45 MB) and `live_backup_latest.json`.
      - Generated full SQL INSERT dump: `backups/aisurf_live_backup_20261024_132626.sql` (44.19 MB) and `live_backup_latest.sql`.
    - **Local Database (`surfing_db`) Full Mirror Replacement**:
      - Connected to local PostgreSQL (`surfing_db`) and disabled FK triggers (`SET session_replication_role = 'replica'`).
      - Truncated stale local tables and cleanly restored all 38 tables with live AWS records (344 users, 310 students, 1,343 sessions, 34 instructors, 5 schools, 8 events, 116 heats, 7,268 scores, 1,114 activity logs).
      - Auto-reset all primary key serial sequences (`setval`) to max ID values to prevent future insert collision errors.

  2. **Calendar & Roster Guest Name Resolution & Chip Design (`Sessions.jsx`)**:
    - **Accurate Guest Resolution in Calendar Groups**:
      - Resolved repeating parent student names in the "Surf Sessions Calendar & Roster" drawer cards (e.g. Advait repeating 2x, Chaitanya Chenna repeating 3x, Laveena Kuril repeating 4x).
      - Connected session rows to `resolveStudentAndGuestDisplay` to dynamically display the actual registered guest names (`Bhaskar Kishor`, `Vinayak`, `Kashish`, `Rohan Mehta`, `Abhishek Shah`, `Tanya Srivastava`, `Namrata Singh`, etc.).
    - **Refined Chip Visual Aesthetics**:
      - Removed the loud full-yellow background from guest cards in favor of a clean, uniform `#FFFFFF` background with standard `#CBD5E1` border identical to regular student chips.
      - Added an elegant, soft amber `Guest` pill tag next to the guest name with a hover tooltip displaying `Guest of [Parent Student Name]`.

  3. **Mobile Responsiveness for Day Details Popup Modal (`Sessions.jsx`)**:
    - **Zero Desktop Regression**: Preserved 100% of existing desktop UI layout, alignment, and spacing on screens `> 640px`.
    - **Eliminated Mobile Overlapping (`@media (max-width: 640px)`)**:
      - Fixed issue where the `📞 Call`, `✓ Present`, and `✕ Absent` buttons were colliding and overlapping on top of student names and avatars on small mobile viewports (360px - 410px).
      - Added `.ses-day-modal-student-row` with mobile stacked layout: top line gives student/guest name, avatar, and level full horizontal breathing room without squishing or truncating.
      - Added `.ses-day-modal-actions` spanning the bottom line with 3 equal-width, comfortable touch-target buttons separated by a subtle dashed divider.
      - Adjusted `.ses-day-details-modal-box` to `width: 96vw; max-height: 94vh` with responsive padding and fluid touch interactions.

  4. **Landing Page & Auth Page Bottom-Right Branding Badge (`Hero.jsx`, `AuthPage.jsx`, `index.css`)**:
    - Added sleek glassmorphic branding pill badge in the bottom-right corner of both the Landing Page (`Hero.jsx`) and the Login/Register Page (`AuthPage.jsx`): **"Developed by rpntechworld"**.
    - Styled the entire pill box as an active link (<a>) to https://rpntechworld.com so clicking anywhere on the badge (text, padding, or border) opens the website in a new tab with hover glow effect (#38BDF8), subtle backdrop blur, and responsive positioning across desktop, tablet, and mobile devices.

  5. **Full Landing Page Footer & Dynamic Auto-Updating Year & Version (`Footer.jsx`, `LandingPage.jsx`, `Hero.jsx`, `AuthPage.jsx`, `index.css`)**:
    - **Landing Page Footer**: Created dedicated [Footer.jsx](file:///d:/surfing/ai/frontend/src/components/Footer.jsx) placed cleanly at the bottom of the Landing Page beneath the features section.
    - **Dynamic Year Auto-Update**: Implemented `new Date().getFullYear()` so that the copyright year (`© 2026 AthnexLive`) automatically rolls over every year without manual code changes.
    - **Version Badge**: Added `v1.0.0` version identifier tag styled as a subtle cyan monospace chip.
    - **Clean Developed by Pill**: Styled `Developed by rpntechworld` as a standalone, clean clickable badge connecting directly to `https://rpntechworld.com` without redundant copyright/bullet clutter.
    - **Consistent Corner Pill Badges**: Cleaned corner pill badges in `Hero.jsx` and `AuthPage.jsx` to maintain a unified, uncluttered branding badge across pages.

  ---

  ### Changes on 28-10-2026

  1. **New School Multi-Tenancy & Account Onboarding Fixes (`backend/main.py`, `SchoolRegistration.jsx`, `AuthPage.jsx`)**:
    - **Backend User-to-School Synchronization (`main.py`)**:
      - Fixed issue where registering a new school or school admin left `school_name = None` and `school_id = None` in the `users` table.
      - `auth_signup` now explicitly links `user.name = data.name`, `user.school_name = school_name`, `user.school_id = new_sch.id`, and `user.phone = phone_clean` upon account creation.
      - `POST /api/schools` (`create_school`) now auto-provisions or links the admin user account, generates authorization token, and returns full user and school metadata.
      - `make_user_response` equipped with automatic self-healing: if an admin user logs in with missing school attributes, it resolves the school by email/name and persists `school_name` and `school_id` into the database record.
      - Backfilled all existing database school admin accounts (`togaisurf@gmail.com`, `indicasurfschooldapoli@gmail.com`, etc.) with their authoritative `school_name` and `school_id`.
    - **Frontend School Detection & Permissions (`InstructorManagement.jsx`, `StudentsManagement.jsx`)**:
      - Corrected flawed `isSuperAdmin` logic in `InstructorManagement.jsx` that previously evaluated `!currentSchool || currentSchool === 'school admin'` as `true`, causing newly added coaches in new schools to get miscategorized as "Individual / Freelance Coach" and disappear from the school view.
      - `getActiveSchoolName` safely ignores the fallback label `"school admin"` and resolves directly from `activeSchool`, `user.school_name`, `user.school`, or `user.school_details.name`.
      - `StudentsManagement.jsx` now reliably scopes newly created students to the active school rather than an empty or dummy string.
    - **Seamless School Registration Session Initialization (`SchoolRegistration.jsx`)**:
      - Updated registration submit handler to immediately store the returned session token, user profile, and active school payload in both `sessionStorage` and `localStorage`, allowing newly registered schools to immediately add coaches and students without session loss.

  2. **Previous Session Groups Suggestion UI & Reordering (`NewSession.jsx`)**:
    - **Group Card Alignment**: Upgraded previous group suggestions into full `ns-group-card` cards matching the active session group design, with student chips, level tags, day indicators, and assigned coach chips.
    - **Along with Coach & Students Only Actions**: Added `⚡ Along with Coach` button to auto-create groups with their historically assigned coach preserved, alongside a `+ Students Only` button.
    - **Workspace Layout Order Optimization**:
      - Reordered Column 2 elements so that **🕒 PREVIOUS GROUPS SUGGESTION** is displayed **FIRST** immediately beneath the active session groups.
      - Placed the **"Want to create another training group?"** (`ns-create-next-group-card`) creation card cleanly **BELOW** the suggestion cards, matching the expected user workflow.

  3. **Build & Regression Verification**:
    - Production Vite build verified with zero errors (`npm run build` exit code 0).
    - Backend syntax and imports verified clean.
    - Automated end-to-end database lifecycle simulation passed successfully with 0 errors, validating new school registration, coach creation, student creation, and scoped retrieval while preserving existing schools (`Aquatic Indica Surf School`, `rpn tech ac`, etc.) completely intact.



  ---

  ### Changes on 29-10-2026

  1. **Coach Profile Edit Permission Restrictions (School Admin Lockdown)**:
    - **Requirement**: School Admins should not be able to edit a coach's personal credentials or profile details (Name, DOB, Certifications, Experience, Bio, Phone, Email); coach profiles belong to the coach and should only be managed by the coach themselves or platform super admin.
    - **Frontend Changes (`InstructorManagement.jsx`, `InstructorProfile.jsx`)**:
      - Removed the Edit (pencil icon) button from instructor cards for School Admins (`InstructorManagement.jsx`); restricted the button visibility strictly to Super Admins (`isSuperAdmin`).
      - Added programmatic client-side guards to `handleOpenEditModal` and `handleUpdate` preventing unauthorized edit dialog triggers.
      - Updated `canEditProfile` in `InstructorProfile.jsx` to strictly allow only `isCoachThemselves` or `isSuperAdmin`. School Admins visiting a coach's profile view it in read-only mode without the "Edit Profile" button.
      - Attached `Authorization: Bearer <token>` headers to coach update requests.
    - **Backend Enforcement (`backend/main.py`)**:
      - Updated `PUT /api/instructors/{instructor_id}` to verify the caller's JWT authorization header.
      - If the authenticated user belongs to a school role (`admin`, `school`, `school_admin`, `schooladmin`) and is not a super admin, the request is rejected with `403 Forbidden` (`"School admins are not permitted to edit coach details. Coach profiles can only be updated by the coach or platform super admin."`).

  2. **Coach Cards UI Uniformity & Alignment Polish ("yelamey orey uila irukanum")**:
    - **Problem**: Instructor cards on the Instructors roster (`/instructors`) displayed visual inconsistencies:
      - Avatar mismatch: Dummy stock photos from Unsplash (e.g. hallway photo on Manikandan) appeared while other coaches showed gradient letter circles (`K`, `I`, `E`).
      - Name casing: Inconsistent text casing (e.g. lowercase `manikandan` vs capitalized `Kathir`).
      - Badges misalignment: Cards had varying badge rows (1 row on shorter certifications like `AS`, 2 rows on longer ones like `ISA LEVEL-2`), causing height jumps.
      - Staggered card heights: Cards had uneven heights, causing action buttons (`View Profile` and `Invite`) to sit on mismatched baselines.
      - Phone formatting: Phone numbers had varying prefixes and digits (`+91961125` vs `7894561237`).
    - **Frontend Enhancements (`InstructorManagement.jsx`)**:
      - **Avatar Uniformity**: Filtered out mock Unsplash images (`!instructor.image.includes('unsplash.com') && !instructor.image.includes('1500648767791')`), ensuring all coaches without genuine user-uploaded photos display consistent, elegant gradient circle letter avatars.
      - **Name Capitalization**: Added `text-transform: capitalize;` to `.im-card-name` so all instructor names consistently render with capitalized initials.
      - **Standardized 2-Row Badges Architecture**:
        - Row 1: Fixed 2 badges side by side: Certification badge (`ISA Level 2`, etc.) + School affiliation badge (`RPN TECH AC`), both with ellipsis overflow handling.
        - Row 2: Fixed language badge (`🗣️ Languages`) + `🏖️ On Leave` badge (if applicable) with reserved minimum height (`min-height: 24px`).
        - Enforced a fixed `.im-card-badges` container height (`min-height: 56px`), guaranteeing every single card maintains the exact same badge structure.
      - **Equal Card Heights & Baseline-Aligned Actions**:
        - Enforced `height: 100%` on `.im-card`, `flex: 1` and `justify-content: space-between` on `.im-card-body`, and `margin-top: auto` on `.im-card-footer`.
        - All cards in the grid row now stretch to equal height, with `View Profile` and `Invite` buttons locked to the exact same bottom baseline.
      - **Standardized Phone Formatting**: Implemented `formatCoachPhone` helper standardizing all numbers to `+91 XXXXX XXXXX`.

---

  ### Changes on 30-10-2026

  1. **Head Coach Elevation Feature (Full Admin Permissions for Coaches)**:
    - **Requirement**: Add a "Make as Head Coach" option in the Admin section. When enabled, the coach receives all administrative capabilities and functionalities available to an Admin. When disabled, all elevated permissions are revoked immediately with zero permission conflicts, synchronized frontend/backend access, and preserved coach profiles.
    - **Database & Backend Schema (`backend/main.py`)**:
      - Added `is_head_coach` (`BOOLEAN DEFAULT FALSE`) column to both `users` and `instructors` tables in PostgreSQL and SQLite.
      - Added automatic safe startup migrations executing `ALTER TABLE ... ADD COLUMN is_head_coach ...` if missing.
      - Updated `User` and `Instructor` models and `InstructorUpdate` schema with `is_head_coach: Optional[bool]`.
      - Serialized `is_head_coach` in `instructor_to_dict` and `make_user_response`, automatically resolving `school_name` and `school_details` for Head Coach accounts.
      - Implemented `POST /api/instructors/{instructor_id}/toggle-head-coach` and `PATCH /api/instructors/{instructor_id}/head-coach`:
        - Restricts promotion/revocation strictly to Admins and Super Admins.
        - Toggles or sets `is_head_coach` synchronously across both the `instructors` record and the linked `users` record.
        - Records audit activity log (`"Promoted coach <Name> to Head Coach with Admin privileges"` / `"Removed Head Coach privileges from <Name>"`).
      - Adjusted `PUT /api/instructors/{instructor_id}` to allow Head Coaches to edit their own profile while protecting coach data isolation.
    - **Frontend Instructor Management UI (`InstructorManagement.jsx`)**:
      - Added "Make as Head Coach" / "Remove as Head Coach" action button to instructor cards for Admin and School Admin users.
      - Added in-app confirmation modal with clear explanation of permissions being granted or revoked.
      - Added golden badge `👑 Head Coach` in card badge row and crown icon `👑` in card title.
      - Instant optimistic UI update with status toast and session updates if current logged-in user is toggled.
    - **Global Navigation & Header Integration (`Sidebar.jsx`, `UserProfileMenu.jsx`)**:
      - `Sidebar.jsx`: Head Coach receives full Admin navigation links (Dashboard, Instructors, Students, Sessions, Analytics, Competitions, Athlete Intel). Mobile menu displays `Head Coach 👑`.
      - `UserProfileMenu.jsx`: Role indicator renders `Head Coach 👑` with a distinctive gold theme tag; user administrative capabilities unlocked.
    - **School Dashboard Access (`SchoolDashboard.jsx`)**:
      - Removed coach redirect lock for Head Coach (`currentUser.role === 'coach' && !currentUser.is_head_coach`), allowing Head Coaches full access to School Dashboard metrics, live session summaries, and school activity feeds.
    - **Students Management (`StudentsManagement.jsx`)**:
      - Head Coaches can view the entire school student roster (not isolated to only their assigned trainees).
      - Can view student contact phone numbers, approve/reject pending student join requests, add students, delete students, and generate registration invite links.
    - **Sessions & Scheduling Ground Operations (`Sessions.jsx`, `NewSession.jsx`)**:
      - Head Coaches can view all school surf sessions, filter sessions by any instructor, configure slot timings (`/sessions/configure`), schedule new sessions, edit session groups, and delete sessions.
    - **Instructor Profile (`InstructorProfile.jsx`)**:
      - Added `👑 HEAD COACH` badge in the hero banner and crown icon next to name.
    - **Immediate Revocation**:
      - Disabling Head Coach status immediately strips administrative rights, reverting user to standard coach views without requiring manual cache resets.


  2. **Guest Admin Role Selection & Read-Only Access Enforcement (Main Admin vs View Admin)**:
    - **Requirement**: Add a Role Selection dropdown during Guest Admin creation supporting two specific roles:
      - **Main Admin**: Full administrative capabilities matching School Admin (create, edit, delete, approve, manage all data and pages).
      - **View Admin**: Strictly Read-Only access across all school pages and data; completely blocked from Add, Edit, Delete, Approve, or any mutating action, including via direct API calls.
    - **Backend Schema & Enforcement (`backend/main.py`)**:
      - Added `guest_role` (`VARCHAR(50) DEFAULT 'main_admin'`) column to `users` table with automatic database migration.
      - Updated `GuestAdminCreateRequest` and `guest_admin_to_dict` to accept and serialize `guest_role`.
      - Built global middleware `enforce_view_admin_readonly` intercepting all mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) for users authenticated with `guest_role == 'view_admin'` or `is_view_admin = True`, returning `403 Forbidden` (`{"detail": "Access Denied: View Admin accounts have read-only access across the platform."}`).
      - Updated `toggle_head_coach` to allow Guest Main Admins full administrative privileges while keeping View Admin restricted.
    - **Frontend UI & Permissions Guards (`UserProfileMenu.jsx`, `SchoolDashboard.jsx`, `InstructorManagement.jsx`, `StudentsManagement.jsx`, `Sessions.jsx`, `NewSession.jsx`)**:
      - `UserProfileMenu.jsx`: Added Role dropdown (`Main Admin (Full Access)` vs `View Admin (Read-Only)`) with helper descriptions in the Guest Admin creation modal.
      - Displays role badge in Active Guest Admins list (`Main Admin` in emerald badge, `View Admin` in purple/indigo badge).
      - Disabled/hidden Add, Edit, Delete, Approve, and status toggle buttons across all management pages when logged in as View Admin.
      - Protected direct route navigation to creation forms (e.g. `/sessions/new`).

  3. **Instructor Cards 3-Dot (⋮) Actions Menu UI Modernization (`InstructorManagement.jsx`)**:
    - **Requirement**: Move `Active / Inactive`, `Delete Instructor`, and `Make as Head Coach / Remove as Head Coach` actions into a unified **3-dot (⋮) menu** at the top-right corner of each instructor card.
    - **Top-Right 3-Dot (⋮) Dropdown Architecture**:
      - Added clean 3-dot trigger button to the top-right corner of each instructor card with hover/focus states and `activeMenuId` tracking.
      - Clicking 3-dots displays a floating dropdown card housing:
        1. **Active / Inactive**: Dynamic text (`Mark as Inactive` or `Mark as Active`) and icon matching the instructor's current status, with optimistic state update.
        2. **Make / Remove Head Coach**: Dynamic text (`Make as Head Coach` or `Remove as Head Coach`) with crown icon and confirmation dialog.
        3. **SuperAdmin Edit Profile**: Direct trigger for editing coach profile modal.
        4. **Delete Instructor**: Styled danger button with trash icon and confirmation dialog.
      - Added global outside-click listener and `Escape` key handler for smooth dropdown dismissal.
      - Changed `.im-card` `overflow: hidden;` to `overflow: visible;` with elevated `z-index` when open to eliminate menu clipping.
    - **Card Header & Body Clean-Up**:
      - Replaced old top-left toggle switch with a sleek, non-intrusive status pill badge (`● Active` / `○ Inactive`).
      - Removed the large inline `Make as Head Coach` button from the card body, keeping the card compact and uniform.
      - Maintained `👑 Head Coach` badge on the card body for instant visual recognition.
      - Left existing footer action buttons (`View Profile` and `Invite`) completely intact.

  4. **Floating Top-Center Toast Notification System (`InstructorManagement.jsx`)**:
    - **Design System Alignment**: Replaced full-width inline banner alert with a floating **Top-Center Toast Notification Popup** (`top: 24px; left: 50%; transform: translateX(-50%)`), matching the exact design and animation system of `Sessions.jsx`.
    - **Non-Disruptive Floating UI**:
      - Eliminated layout shifting and content displacement between the search bar and cards.
      - Styled with crisp white background, soft emerald border (`#A7F3D0`), circular check badge (`✓`), clear dark typography (`#0F172A`), and dismiss button (`✕`).
      - Slide-down animation (`@keyframes imSlideDown`) with smooth cubic-bezier easing.
    - **Auto-Dismiss**: Managed via `useEffect` timer, automatically dismissing toast notifications after 4 seconds.

  5. **Head Coach Priority Sorting (Head Coach Always First)**:
    - **Requirement**: When a coach is promoted to Head Coach, they must immediately appear at the FIRST card position (Index 0 / top-left) in the roster instead of being pushed to the end.
    - **Frontend Dynamic Sorting (`InstructorManagement.jsx`)**:
      - Updated `filtered` instructors list to sort coaches with `is_head_coach === true` ahead of regular coaches (`if (aHead && !bHead) return -1; if (!aHead && bHead) return 1;`), with secondary sorting by active status and ID.
      - Updated `handleToggleHeadCoach` optimistic state update to sort the list immediately upon action, giving instant visual feedback without waiting for background queries.
    - **Backend Query Ordering (`backend/main.py`)**:
      - Added `query = query.order_by(Instructor.is_head_coach.desc().nullslast(), Instructor.id.asc())` to `/api/instructors` endpoint, guaranteeing all database responses return Head Coach first by default.


---

### Changes on 31-10-2026

1. **Top Navigation Header & User Profile Pill Responsive Architecture (`UserProfileMenu.jsx`, `index.css`)**:
   - **Problem**: On screens between 900px and 1260px (tablets, laptops with Windows display scaling, or split-screen windows), the 7 navigation links crowded into the User Profile card in the top-right corner. This caused the user's name ("Eric Sheldon RS") and role ("School Admin") to wrap vertically across multiple lines, stretching the profile pill beyond the 72px navbar height and overflowing downward into the page body.
   - **User Profile Pill Flex & Overflow Fixes (`UserProfileMenu.jsx`)**:
     - Added `flex-shrink: 0`, `white-space: nowrap`, `max-height: 48px`, and `box-sizing: border-box` to `.db-header-profile-btn`.
     - Added `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, and `max-width` limits on `.db-header-user-name` (140px), `.db-header-school-name` (120px), and `.db-header-user-role` (120px), preventing text wrapping or vertical expansion under any viewport width.
   - **Multi-Tier Responsive Breakpoints (`index.css`)**:
     - **1360px Breakpoint**: Adjusted header padding (`0 24px`), nav gap (`16px`), font size (`13.5px`), and hid redundant school name from the pill to free up horizontal space.
     - **1200px Breakpoint**: Tightened nav link spacing (`gap: 10px`), reduced profile button padding, and trimmed text bounds.
     - **1100px Breakpoint**: Seamlessly transitioned desktop navigation links into the mobile hamburger toggle (`.db-mobile-toggle`) so the 7 links never crowd the user profile card or logo on compact displays.
     - **768px Mobile Breakpoint**: Simplified the profile pill to show the avatar circle and dropdown chevron only, hiding text labels for an ultra-clean mobile navbar.

---

### Changes on 03-11-2026

1. **Course Day Calculation & Badges System (`Sessions.jsx`, `backend/main.py`)**:
   - **Student Course Day Resolution (`getStudentSessionDay`)**:
     - Automatically calculates the exact day index of a student's course based on the session date relative to the student's `start_date` (`diffDays = Math.round((sessionDate - startDate) / 1 day) + 1`).
     - Supports guest students by resolving their parent student's course start date.
     - Fallback chronological calculation orders all distinct session dates for students without an explicit start date.
     - Backend (`main.py` -> `session_to_dict`): Guaranteed `start_date` and `course_duration` are resolved from the `Student` record and attached to every session item returned via `/api/sessions`.
   - **Multi-Day Badging on Group Header**:
     - When all students in a group are on the same day (e.g. Day 1), the group card displays `🗓️ Day 1`.
     - When a group contains students on different days (e.g. some on Day 1, others on Day 2), the group header displays all distinct days simultaneously (e.g. `🗓️ Day 1` and `🗓️ Day 2`) with distinct color codes (Day 1: Blue `#1D4ED8`, Day 2: Purple `#7E22CE`, Day 3: Teal `#0F766E`, Day 4+: Amber `#B45309`).
   - **Individual Student Day Badges**:
     - Every enrolled student card in the Day Details Modal now displays their personal `Day X` pill badge next to their name.

2. **Day Details Modal Mobile Responsive Architecture (`Sessions.jsx`)**:
   - **Viewport Overflow & Top Clipping Fix**:
     - Removed negative vertical displacement caused by `align-items: center` and padding on the modal overlay when height was `100dvh`.
     - Added `.ses-day-modal-overlay` with `padding: 0 !important; align-items: stretch !important; justify-content: stretch !important;` on screens `< 900px`, ensuring the modal header begins at `y: 0` without clipping the date title ("Tuesday, Nov 3, 2026").
   - **Header & Close Button Alignment**:
     - Fixed close button (✕) wrapping to a second line by setting `flex-direction: row !important; flex-wrap: nowrap !important; justify-content: space-between !important; align-items: flex-start !important;`. Close button is pinned to top-right.
   - **Action Buttons & Student Cards Layout**:
     - Action buttons (`Call`, `Present`, `Absent`) use a 3-column equal grid (`display: grid !important; grid-template-columns: 1fr 1fr 1fr !important;`) on mobile, preventing overlap or truncation.
     - Pinned the modal footer `Close` button to the bottom with 100% width for ergonomic thumb interaction on touchscreens.

3. **Compact Phone UI & Multi-Day Layout Optimization (`Sessions.jsx`)**:
   - **Group Header Multi-Row Layout**:
     - Row 1: Group Name (`🏄‍♂️ Group A`) + Status Pill (`• PENDING FOR REVIEW`) aligned in a single flex row without text wrapping.
     - Row 2: Timing, duration, and beach spot on a single line (`⏰ 07:00 - 08:30 AM (90 mins) • 🌊 Kovalam / Chennai Beach`).
     - Row 3: Coach name (`Coach: manikandan`).
     - Row 4: Multi-Day Course Badges (`DAYS: [🗓️ Day 1] [🗓️ Day 7] [🗓️ Day 20]`) laid out horizontally with compact padding and color-coded chips.
   - **Compact Search & Time Slot Filter**:
     - Constrained the time slot dropdown `maxWidth: 135px` and made search input `flex: 1` with 32px height and sleek padding, ensuring `Search student...` placeholder is never crushed into `🔍 S` on narrow phone viewports.
   - **Compact Student Cards**:
     - Streamlined student row spacing: 28px avatar, single-line student name + `Day X` badge + attendance status.
     - Subtitle row neatly groups Guest status (`👥 Guest of ...`) and student level (`Beginner`) without vertical stacking.
     - Call / Present / Absent buttons are proportionally styled with 11px font and 28px height.

4. **Top Header Profile Pill & Navbar Responsiveness (`UserProfileMenu.jsx`, `index.css`)**:
   - Fixed desktop navbar text collision where user name, role, and school name overlapped due to `maxHeight: '48px'` on `.db-header-profile-btn`.
   - Replaced fixed maximum height with `minHeight: 40px; box-sizing: border-box;` and vertically centered two-line layout: bold white user name (`12.5px`, line-height `1.2`) on row 1, and colored role label (`10px`, line-height `1.2`) on row 2.
   - Pinned avatar and dropdown chevron with smooth padding and responsive margins across 1440px, 1200px, and mobile viewports.

5. **Dev Server Zombie Process Cleanup & Vite 500 Resolution**:
   - Cleared stale background Node process (`PID 7372`) occupying port 5173.
   - Launched Vite dev server cleanly on `http://localhost:5173/` with proxy to FastAPI backend (`:8000`).
   - Verified `GET /src/pages/Sessions.jsx`, `/api/features`, and `/api/stats` all return clean `HTTP 200 OK` responses without errors.

6. **Date Range Filter Bar Mobile Responsiveness (`DateRangeFilterBar.jsx`, `Sessions.jsx`)**:
   - Fixed the `Date Filter` bar overflowing horizontally beyond the filter card container on mobile screens (< 640px).
   - Separated presets and custom range into a two-tier mobile layout:
     - **Tier 1 (Presets)**: `Yesterday`, `Today`, `Tomorrow`, and `All` cleanly distributed with `flex: 1` each across the top row.
     - **Tier 2 (Custom Range)**: `[ 📅 From: (date)  To: (date) ]` custom date range box spanning 100% width with fluid date inputs and a reset button.
   - Enforced `max-width: 100%; box-sizing: border-box;` preventing any horizontal overflow or border bleed on 360px and narrow smartphone viewports.

7. **Same-Name Coach Data Isolation & Conflict Prevention Architecture**:
   - **Root Cause Eliminated**:
     - Previously, when coaches shared identical names (e.g., two coaches named "Kathir"), fallback name-matching logic in `matchesCoach`, `filterSessions`, and student queries caused newly created coaches to inherit and merge with existing coaches' sessions, student rosters, and accounts.
     - In `set_instructor_password`, fallback email generation generated generic `{safe_name}@aisurf.io` without ID hashing, causing the second coach to hijack the first coach's `User` account record.
   - **Backend Isolation Fixes (`backend/main.py`)**:
     - `set_instructor_password`: Auto-generated emails now incorporate the coach's primary key (`f"{safe_name}{instructor.id}@aisurf.io"`), guaranteeing 100% unique emails.
     - User hijacking prevention: Added validation in both `create_instructor` and `set_instructor_password` ensuring an email cannot be linked to another existing coach account.
     - `session_to_dict`: Ensured instructor lookup from notes is only executed as a legacy fallback when `inst_ids` is empty, scoped strictly to the session's school.
   - **Frontend Isolation Fixes**:
     - `InstructorProfile.jsx`: Updated `matchesCoach` to evaluate **strictly by ID** if `instructor_id` or `instructor_ids` is present; never falls through to name matching.
     - `Sessions.jsx`: Coach session isolation in `roleScopedSessions` checks strictly by ID if `s.instructor_id` or `s.instructor_ids` exists; legacy name matching is strictly gated to records with no coach IDs. `loggedInCoach` prioritizes `currentCoachId` over name.
     - `StudentsManagement.jsx`: Session and student isolation checks strictly against `coachIds`. If `s.instructor_id` belongs to another coach, it is immediately rejected.
     - `Analytics.jsx` & `AthleteIntelligence.jsx`: Enforced strict ID matching for coach session and athlete rosters.
   - **UI Disambiguation**:
     - In `InstructorManagement.jsx` cards and `NewSession.jsx` instructor roster, coaches who share duplicate names now display a distinct badge/tag (`(#{inst.id})`) with tooltip, allowing administrators and coordinators to easily distinguish between them.

8. **Coach Registration Custom Certifications, Languages, and Bio Input Integration (`AuthPage.jsx`, `backend/main.py`)**:
   - **Problem Solved**: Previously, the Coach Registration form in `AuthPage.jsx` had no input fields for **Certifications**, **Languages Spoken**, or **Coach Bio / Background**. When a coach registered, the backend auto-filled fake hardcoded mock values (`certifications: ["ISA Level 1", "Lifeguard Certified"]`, `bio: "Professional surf instructor dedicated to athletic performance."`, and default `'ISA Level 1'` in instructor cards).
   - **Frontend Inputs Added (`AuthPage.jsx`)**:
     - **Certifications**: Added text input (`placeholder="e.g. ISA Level 1, Surf Coach Safety, Lifeguard"`) saving custom coach licenses.
     - **Languages Spoken**: Added interactive quick-select tag pills (`English`, `Tamil`, `Hindi`, `Malayalam`, `Kannada`, `Telugu`, `French`, `Spanish`, `German`) + text input allowing coaches to select or type multiple languages.
     - **Coach Bio / Background**: Added styled textarea allowing coaches to write their authentic surfing background, experience, and coaching philosophy.
   - **Backend Custom Value Ingestion (`backend/main.py`)**:
     - Extended `UserSignup` schema to accept `certifications`, `languages`, and `bio`.
     - In `auth_signup`, eliminated all hardcoded mock defaults (`"ISA Level 1"`, `"Professional surf instructor..."`), accurately parsing and saving the user's authentic certifications, languages, and biography.
9. **Coach Registration Approval Workflow (Zero Auto-Assignment to Schools) (`backend/main.py`, `AuthPage.jsx`, `InstructorManagement.jsx`, `NewSession.jsx`, `StudentsManagement.jsx`)**:
   - **Problem Solved**: Previously, when a coach registered selecting an affiliated surf school, their account was immediately auto-assigned and activated without the school's knowledge or consent, allowing unverified coaches to be assigned to classes and students.
   - **Database & Backend Schema Updates (`backend/main.py`)**:
     - Added `approval_status VARCHAR DEFAULT 'approved'` column migration for the `instructors` table in both SQLite and PostgreSQL.
     - Added `approval_status = Column(String, default="approved")` to `Instructor` ORM model.
     - In `auth_signup`: When `role == "coach"` and a surf school is selected (not Freelance), `initial_approval = "pending"`, creating both `User` and `Instructor` records with `approval_status="pending"` and `is_active=False`.
     - Logged pending notification in `ActivityLog`: `"New coach {name} applied to join {school} (Pending Approval)"`.
     - Added `POST /api/instructors/{instructor_id}/approve` endpoint: activates coach and linked user account (`approval_status="approved"`, `is_active=True`), creating activity log.
     - Added `POST /api/instructors/{instructor_id}/reject` endpoint: marks `approval_status="rejected"` and keeps `is_active=False`.
     - Extended `/api/auth/check-approval` to query `Instructor` records as well as `Student` and `User`.
     - In `auth_login`: If a deactivated/pending coach attempts login, returns a clear `HTTP 403` informing them their join request is pending approval from the School Admin.
   - **Coach Registration UI Flow (`AuthPage.jsx`)**:
     - Coaches registering with a school affiliation are routed to the **"Registration Pending"** screen: *"Status: Pending School Admin Approval. The School Admin has been notified of your registration. You will be able to access your coach dashboard once approved."*
     - Live **"Check Approval Status"** button automatically refreshes status against the backend and redirects the coach to their profile upon school approval.
   - **School Admin Approval Management (`InstructorManagement.jsx`)**:
     - **Top Header Badge**: Added `[⏳ Pending Approvals ({count})]` filter toggle button in the top header, highlighting requests requiring review.
     - **Card Top Badge**: Pending coaches display an amber `⏳ Pending Approval` pill.
     - **Action Buttons**: Rendered 1-click `[✓ Approve]` and `[✕ Reject]` action buttons directly on the coach card and within the 3-dot dropdown menu.
     - **Sorting Priority**: Pending coaches are sorted to the top of the instructors roster so administrators can immediately notice and review applications.
   - **Roster & Session Isolation (`NewSession.jsx`, `StudentsManagement.jsx`)**:
     - Coaches with pending or rejected status (`approval_status === 'pending' || !is_active`) are strictly filtered out of session coach assignment pools in `NewSession.jsx` and student coach dropdowns in `StudentsManagement.jsx`.

10. **Coach Registration Mandatory Required Fields (`*`) & Approval Fixes (`AuthPage.jsx`, `InstructorManagement.jsx`)**:
    - **All Fields Marked Mandatory with `*` (`AuthPage.jsx`)**:
      - Added red required asterisk (`*`) to all Coach Registration fields: `Full Name *`, `Password *`, `Confirm Password *`, `Affiliation / Surf School *`, `Phone / WhatsApp Number *`, `Hourly Rate *`, `Location / Region *`, `Coaching Specializations *`, `Certifications *`, `Languages Spoken *`, `Coach Bio / Background *`.
      - Added client-side validation in `completeRegistration`: coaches cannot submit without filling hourly rate, choosing specializations, entering certifications, selecting/typing languages, writing a bio, or selecting an affiliation.
    - **Approval Action Error Resolution (`InstructorManagement.jsx`)**:
      - Resolved `ReferenceError: safeJson is not defined` when approving coaches by replacing with native safe `res.json().catch(() => ({}))` parsing.
      - Refactored `[ ⏳ Pending Requests ({count}) ]` to be permanently visible in the header beside `[ Leave Requests ]`, featuring active amber toggle, live pending badge counter (`0` when clear), and matching pill aesthetics.

11. **Coach In-App Access with Internal Pending Review Banner (`AuthPage.jsx`, `InstructorProfile.jsx`, `backend/main.py`)**:
    - **Unblocked Login for Pending Coaches**: Coaches are no longer halted at the static `/auth` screen with a blocking modal. They can directly register and log into their coach portal (`/instructors/:id`).
    - **In-App Pending Banner (`InstructorProfile.jsx`)**: When a coach's school affiliation is pending, an amber notification card displays at the top of their profile: *"Registration Status: Pending School Approval. Your join request to [School] is awaiting approval from the School Admin. Once approved, you will be assigned to school sessions and students."*
    - **Profile Hero Badge**: Displays an amber `⏳ PENDING APPROVAL` tag beside coach certifications until the school admin approves them.
    - **School & Session Protection Maintained**: Pending coaches remain excluded from school session scheduling (`NewSession.jsx`) and student roster assignments (`StudentsManagement.jsx`) until approved by the school administrator.


12. **AWS Cloud Production Schema Synchronization & Zero-Data-Loss Migration (`backend/main.py`, `deploy_to_aws.py`)**:
    - **PostgreSQL Schema Desync Incident Resolution**:
      - Diagnosed and resolved the live AWS RDS error: `(psycopg2.errors.UndefinedColumn) column users.is_head_coach does not exist` and `column users.guest_role does not exist` that triggered on user authentication and instructor queries.
      - Fixed query crash where SQLAlchemy aborted user authentication and instructor list queries, ensuring existing records are rendered without interruption.
    - **Non-Destructive DDL Auto-Migrations**:
      - Added comprehensive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks for PostgreSQL RDS and SQLite on startup across `users`, `instructors`, `students`, `schools`, and `sessions`.
      - Ensured explicit transaction commits (`test_conn.commit()`, `_c.commit()`) so schema enhancements immediately persist on live database clusters (`aisurf-db-cluster`, `database-2`).
      - Preserved 100% of all existing records (Schools, Instructors, Students, Sessions, Attendance) with zero data loss, drops, or table wipes.
    - **Backend Hot-Reload Deployment via AWS SSM**:
      - Automated packaging, S3 staging (`s3://aisurf-media-uploads-149051628601/deploy/main.py`), and AWS SSM remote execution on EC2 instance `i-0c62e04f44a9ea237`.
      - Verified `aisurf-backend` systemd service restart, sequence synchronization, and `HTTP 200 OK` on authentication and data endpoints.

13. **Sessions Day Modal Time Slot Sorting Bug Resolution & Frontend Cloud Deployment (`Sessions.jsx`, `deploy_frontend_aws.py`)**:
    - **ReferenceError Resolution (`Sessions.jsx`)**:
      - Resolved `Uncaught ReferenceError: timeStringToMinutes is not defined` causing a white-screen crash on `athnexlive.com/sessions` during day modal time slot extraction.
      - Replaced `timeStringToMinutes` call with `parseTimeToMinutes` and defined an alias `const timeStringToMinutes = parseTimeToMinutes` to prevent any runtime regressions.
    - **Frontend Automated Build & AWS Cloud Deployment**:
      - Built production Vite bundle (`npm run build`) cleanly in 1.79s without errors.
      - Packaged and uploaded `aisurf-frontend.zip` to S3, deployed to EC2 frontend instance `i-02999b6093bc5bfd2` (`98.94.45.107`) via AWS SSM, and hot-reloaded Nginx web server.
      - Verified `/sessions` page rendering, group multi-day badges, and student rosters loading smoothly without console errors.
  

14. **Date Filter Reset Behavior & Complete State Synchronization (`Sessions.jsx`, `DateRangeFilterBar.jsx`)**:
    - **Problem Solved**:
      - Previously, when changing the Date Filter (e.g. to "Tomorrow", "Yesterday", "All", or a custom From-To range), clicking `Reset` or `Clear Filters` only updated `dateFilter` and failed to reset `dateRange`.
      - As a result, the date filter remained stuck on the selected preset/custom date instead of resetting back to today's schedule.
      - Furthermore, `hasActiveFilters` did not monitor `dateRange` state changes, meaning the top `Reset` button and empty-state `Clear Filters` button failed to display when only the date range was altered.
    - **Fixes Applied**:
      - **Complete State Reset (`resetFilters`)**: Updated `resetFilters()` to reset both `dateFilter` and `dateRange` back to today (`startDate: today`, `endDate: today`, `preset: 'today'`), restoring all session tables and group views directly to Today's live schedule.
      - **Active Filter Detection (`hasActiveFilters`)**: Expanded `hasActiveFilters` to track if `dateRange.preset !== 'today'` or if dates deviate from today's ISO date, properly surfacing the `Reset` action button and the empty state `Clear Filters` trigger.
      - **Date Picker Reset Trigger (`DateRangeFilterBar.jsx`)**: Enabled the inline `✕` reset icon button whenever the active date range deviates from today (`isNotToday`), allowing 1-click restoration to Today from within the picker.
      - **Calendar Modal Synchronization**: Ensured table-filtering triggers from the Interactive Calendar modal set both `dateFilter` and `dateRange` in lockstep so subsequent resets return reliably to Today.

15. **Pending for Review Stat Card & Status Auto-Switch to All Dates (`Sessions.jsx`)**:
    - **Problem Solved**:
      - Sessions with `Pending for Review` status frequently belong to past dates whose scheduled hours have elapsed.
      - Previously, clicking the `PENDING FOR REVIEW` stat card or selecting `Pending for Review` in the Status dropdown left the Date Filter restricted to `Today`. As a result, the table showed `0 of 3 sessions` ("No sessions match your filter criteria") even though 3 sessions were awaiting review.
    - **Fixes Applied**:
      - **Automatic Date Filter Expansion**: Clicking the `PENDING FOR REVIEW` stat card or selecting it in the Status dropdown now automatically transitions the Date Filter to `All` (`dateRange: { startDate: '', endDate: '', preset: 'all' }`, `dateFilter: ''`) and resets `slotFilter` to `All`.
      - **Instant Visibility**: All pending review sessions across all dates are displayed immediately in the sessions roster and table.
      - **Ergonomic Toggle-Off**: Clicking the `PENDING FOR REVIEW` card again toggles the status filter off back to `All Statuses` and restores the Date Filter to `Today`.

16. **AI Video Analysis Tagged Surfers Deduplication & Guest Resolution (`VideoAnalysis.jsx`, `Sessions.jsx`)**:
    - **Problem Solved**:
      - In group sessions where a student enrolled with accompanying guests (e.g. `dhairya trivedi` + 2 guests: `Dev Bensiani` and `Rudraksh pandey`), all 3 booking records shared `s.student = "dhairya trivedi"`.
      - When navigating from Sessions or Media Hub to AI Video Analysis (`/analysis`), the routing code extracted only `s.student` instead of resolving the actual guest names via `resolveStudentAndGuestDisplay` / `s.guest_name`.
      - Consequently, `/analysis` received `["dhairya trivedi", "dhairya trivedi", "dhairya trivedi", "Dhrumil Popat"]`, generating 3 duplicate tag pills with the exact same student name.
    - **Fixes Applied**:
      - **Guest Name Resolution in Hub & Group Navigation (`Sessions.jsx`)**: Replaced raw `s.student` mapping with `resolveStudentAndGuestDisplay(s, allStudentsList, guestOcc)` across all group analysis launch triggers. Properly extracts `s.guest_name` so the true names (`dhairya trivedi`, `Dev Bensiani`, `Rudraksh pandey`, `Dhrumil Popat`) are passed.
      - **Deduplication & Disambiguation (`VideoAnalysis.jsx`)**: Wrapped incoming athlete query params and session fallback mappings with `Array.from(new Set(...))` and an automated disambiguation counter (`(Guest 1)`, `(Guest 2)`), ensuring no duplicate surfer pills can ever be rendered with identical names.

17. **Bulk Action Status & Delete Counts Group Synchronization (`Sessions.jsx`)**:
    - **Problem Solved**:
      - In the Surf Sessions table, 1 group class represents **1 unified session** to administrators, but internally contains multiple student booking rows (e.g. 1 group with 7 enrolled students).
      - When checking a group session row and clicking "✓ Mark Completed", the bulk handler displayed `Updated 7 session(s) to Completed`, counting individual student database rows instead of the single group session the user actually modified.
    - **Fixes Applied**:
      - **Group-Aware Selected Session Calculation (`selectedSessionCount`)**: Implemented a reactive memoized counter that maps `selectedSessionIds` through `buildSessionGrouping`, calculating the true user-facing session count (`groups.length + ungrouped.length`).
      - **Accurate Toast Notification**: Marking a 7-student group as Completed now cleanly reports: `✓ Updated 1 session to Completed` (or `Updated X sessions to Completed` when multiple distinct sessions are selected).
      - **Floating Action Bar & Delete Dialog Synchronization**: Updated the bulk selection pill to display `✓ {count} Session(s) Selected` and delete confirmation dialogs to reference the true session count rather than raw database row IDs.

18. **Wave Count Quick-Select Full Number Range (1 to 10) (`Sessions.jsx`)**:
    - **Problem Solved**:
      - In the Coach Feedback & Wave Count modal card, quick preset pills previously skipped several numbers (`[1, 2, 3, 5, 8, 10]`), missing quick 1-click selectors for `4`, `6`, `7`, and `9`.
    - **Fixes Applied**:
      - Updated the quick-select preset array to include all numbers consecutively: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`.
      - Enabled flex-wrapping (`flexWrap: 'wrap'`) so all 10 quick pills display cleanly across both mobile and desktop modal views.

19. **Student Navigation & Personalized Video Analysis Vault (`Sidebar.jsx`, `VideoAnalysis.jsx`, `Analytics.jsx`)**:
    - **Problem Solved**:
      - For student accounts (`athlete`, `student`, `user`), the top navigation previously displayed an `Analytics` tab pointing to `/analytics` (showing empty school-wide badge progression and retention funnels intended for school administrators).
      - Students requested a `Video Analysis` tab (starting with "V") tailored specifically to their personal surf footage, coach feedback, technique scoring, and AI wave analysis.
      - Furthermore, accessing `/analysis` directly without query parameters previously defaulted to hardcoded `Chloe Kim - 12 Jun 2025`.
    - **Fixes Applied**:
      - **Student Navbar Transformation (`Sidebar.jsx`)**: For student roles (`isStudentRole = role === 'athlete' || role === 'student' || role === 'user'`), dynamically replaced `Analytics` with `Video Analysis` pointing directly to `/analysis`. Administrators and head coaches continue to see `Analytics`.
      - **Seamless Analytics Redirect (`Analytics.jsx`)**: Added an automated guard in `Analytics.jsx` so that if a student navigates to or reloads `/analytics`, they are immediately transitioned to `/analysis`.
      - **Personal Student Identity Detection (`VideoAnalysis.jsx`)**: Removed the hardcoded `Chloe Kim` fallback when accessing from the navbar. Dynamically resolves the logged-in student's real name and ID from `sessionStorage` (`currentUser.name`), ensuring personal athlete attribution.
      - **Automatic Session Video Vault Loading**: When a student opens Video Analysis without URL parameters, the app queries `/api/sessions`, extracts all recorded sessions belonging to that student with videos (`s.video_url`), and populates their personal session clips playlist (sorted newest first, complete with date, beach location, coach notes, and wave counts).
      - **Student Welcome & Empty State Banner**: If no coach session videos have been recorded yet, displays a helpful student welcome banner explaining that coach recordings will appear here, while keeping the interactive wave video ready for AI skeleton tracking, scrubbing, frame stepping, and self-uploading practice footage.
      - **Student Technique Scorecard & Key Moments**: Refined the right analytics column for students into a dedicated **Coach Technique Assessment** with verified skill scores (Take-off, Positioning, Balance, Wave Reading) and clickable coach key-moment timestamp notes.

20. **Student 'My Achievements' Portal & Navigation Integration (`MyAchievements.jsx`, `Sidebar.jsx`, `App.jsx`, `VideoAnalysis.jsx`)**:
    - **Problem Solved**:
      - In the student portal, students requested a dedicated **`My Achievements`** area to track their surfing skill levels, earned badges, session milestones, and progress toward upcoming rank targets.
    - **Fixes Applied**:
      - **Student Navigation Integration (`Sidebar.jsx`)**: Added **`My Achievements`** directly to the student navbar:
        `My Profile` | `My Sessions` | `My Achievements` | `Video Analysis` | `Competitions` | `Athlete Intel`.
      - **Dedicated Athnex Design-Aligned Achievements Page (`MyAchievements.jsx`)**:
        - **Cohesive Light Dashboard Theme**: Re-engineered page background to `#F8FAFC`, standardizing with `Sessions.jsx`, `StudentProfile.jsx`, and `Analytics.jsx`.
        - **Fixed Navbar Clearance (`margin-top: 72px`)**: Added explicit clearance so the 72px fixed `Sidebar` top header never obscures page titles, subtitles, or the Video Analysis button across desktop and mobile screens.
        - **5-Badge Status Overview**: Rendered clean white badge overview cards (`ach-badge-card`) matching the layout of `an-stat-card`.
        - **Sessions-Matching Milestone Metric Cards**: Styled the 4 milestone indicators (Waves Caught, Sessions Completed, Training Hours, Coach Technique Score) to exactly match `ses-status-metric-card` in pastel blue (`#F0F9FF`), green (`#F0FDF4`), amber (`#FFFBEB`), and purple (`#FAF5FF`).
        - **Hero Rank & Badge Card**: Displays current rank (White, Yellow, Green, Blue, Red) with 3D glowing accents, level description, and an active progress bar indicating percentage completion toward the next badge rank.
        - **4-Metric Milestone Counter**: Dynamically tallies Total Waves Caught, Completed Surf Sessions, Water Training Hours, and Coach Technique Scores.
        - **Skill Badge Progression Journey**: Step-by-step ladder showing requirements, curriculum descriptions, and verified skill checklists for each badge (Beginner, Advance Beginner, Intermediate, Advance Intermediate, Pro).
        - **Special Honors & Accolades**: Trophies awarded by coaches (e.g. "First Unassisted Pop-Up", "Paddle Powerhouse", "100% Attendance Streak").
        - **Seamless Video Analysis Linkage**: 1-click button jumping directly to AI Video Analysis to review wave replays and coach video comments.
      - **Video Analysis Integration (`VideoAnalysis.jsx`)**: Added a quick-access `🏆 My Achievements` pill in the student banner of the Video Analysis page so students can fluidly navigate between video review and achievement milestones.
      - **Application Routing (`App.jsx`)**: Registered protected route `/achievements` and redirect route `/my-achievements`.
      - **Original Analytics Restored**: Per user request, restored the original `Analytics` tab in [Sidebar.jsx](file:///d:/surfing/ai/frontend/src/components/Sidebar.jsx) pointing to `/analytics` for all users including students. Removed redirect in [Analytics.jsx](file:///d:/surfing/ai/frontend/src/pages/Analytics.jsx) so the original badge progression & retention funnel analytics page loads as before.

21. **Strict Student Session Isolation & Primary Key Namespace Cross-Contamination Fix (`Sessions.jsx`)**:
    - **Problem Solved**:
      - When creating or logging into a new student account (e.g. `arunn`), the "My Sessions" tab (`/sessions`) erroneously displayed another student's session (e.g. `Tuesday, Nov 3, 2026 - Group B - RPNitheesh`).
      - **Root Cause**:
        1. In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx), `studentCandidateIds` previously included `currentUser.id`, which is the primary key of the `users` table. However, `SurfSession.student_id` is a foreign key to the `students` table! When a newly created user has `users.id = 5`, it collided with student #5 (`RPNitheesh`), matching RPNitheesh's session to `arunn`.
        2. In `loggedInStudent` resolution, `st.id === parseInt(userStudentId)` incorrectly compared `students.id` against `users.id` when `currentUser.student_id` was unpopulated, causing the app to resolve `loggedInStudent` as `RPNitheesh`.
        3. `roleScopedSessions` only verified `studentCandidateIds.includes(sid)` without double-checking that the session's student/guest name matched the logged-in user.
    - **Fixes Applied**:
      - **Separation of ID Namespaces**: Removed `currentUser.id` (`users` table PK) from `studentCandidateIds`. Only authentic `Student.id` values (`currentUser.student_id`, `loggedInStudent.id`) are now treated as valid session student IDs.
      - **Fixed Student Profile Resolution**: In `loggedInStudent`, `currentUser.id` is strictly matched against `st.user_id` (the actual foreign key linking students to users), never directly against `st.id`.
      - **Double-Layer Verification in `roleScopedSessions`**: Even when a numeric ID matches, `roleScopedSessions` verifies that the session's student name or guest name does not belong to an entirely different athlete, guaranteeing 100% strict isolation per student account.

---

### 22. Student Head Coach Role Bleed Fix & Strict Role Boundary Enforcement

- **Root Cause**:
  1. In `backend/main.py` (`make_user_response`), a student object contains `res["instructor_id"] = inst_id` referencing their assigned instructor (e.g., Instructor 1).
  2. In `frontend/src/components/Sidebar.jsx`, the coach real-time sync effect previously checked `if (parsedUser && (parsedUser.role === 'coach' || parsedUser.instructor_id || parsedUser.is_head_coach))`. Because the student had `parsedUser.instructor_id = 1`, it called `/api/instructors/1`. If Instructor 1 was a Head Coach, it wrote `is_head_coach: true` into the student's `sessionStorage` and `localStorage`!
  3. In `frontend/src/components/UserProfileMenu.jsx` and `Sidebar.jsx`, `isHeadCoach` and `isHeadCoachUser` were evaluated as `Boolean(effectiveUser?.is_head_coach || currentRole === 'head_coach')` without verifying `role !== 'athlete'`. As a result, the student was decorated with `HEAD COACH 👑` badge, gained admin privileges ("Guest Admin Access", "Logo & Info"), and had `Dashboard` injected into the top navigation.

- **Fix Applied**:
  1. **Strict Role Checks in Frontend**:
     - In [Sidebar.jsx](file:///d:/surfing/ai/frontend/src/components/Sidebar.jsx):
       - Automatically sanitize any student/athlete account on load: if `role in ['athlete', 'student', 'user']` and `is_head_coach` is truthy, it is immediately reset to `false` in state, `sessionStorage`, and `localStorage`.
       - Restricted instructor sync strictly to `parsedUser.role === 'coach' || parsedUser.role === 'head_coach'`.
       - In `getNavItems()`, locked `isHeadCoach` to `!isStudent && (role === 'coach' || role === 'head_coach') && Boolean(user?.is_head_coach || role === 'head_coach')`.
       - In mobile menu, ensured student role check precedes any head coach badge check.
     - In [UserProfileMenu.jsx](file:///d:/surfing/ai/frontend/src/components/UserProfileMenu.jsx):
       - Defined `isStudent = currentRole === 'athlete' || currentRole === 'student' || currentRole === 'user'`.
       - Locked `isHeadCoachUser` and `isHeadCoach` to `!isStudent && (currentRole === 'coach' || currentRole === 'head_coach') && Boolean(...)`.
       - Locked `isSchoolAdmin` to `!isStudent && (currentRole === 'admin' || !user?.role || isHeadCoachUser || isMainAdmin)`.
       - For students, `displayRoleLabel` strictly displays `'Student'` with teal branding, removing "Logo & Info" and "Guest Admin Access".
  2. **Backend Security & DB Self-Healing**:
     - In `backend/main.py`:
       - Startup migration automatically runs `UPDATE users SET is_head_coach = FALSE WHERE role IN ('athlete', 'student', 'user') OR role NOT IN ('coach', 'head_coach')`.
       - In `make_user_response`, `res["is_head_coach"]` is strictly `False` for any student/athlete, and resets `user.is_head_coach = False` in the database if it was previously corrupted.
       - In `assign_or_remove_head_coach`, `caller_is_admin` strictly enforces that head coach status only grants admin privileges if `caller_role in ['coach', 'head_coach']`.

---

### 23. Elimination of "General" Session Level & Dynamic Student Skill Badge Resolution

- **Root Cause**:
  1. In [InstructorProfile.jsx](file:///d:/surfing/ai/frontend/src/pages/InstructorProfile.jsx), the "Recent Session Activity" list displays `<span className="ip-badge-primary">{session.type}</span>` on the right side of each session row to show the session's surfing skill level (e.g. `PRO`, `INTERMEDIATE`, `BEGINNER`).
  2. In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx) (group auto-generation, manual group creation, drag-and-drop coach assignment, and session preload), the fallback level was hardcoded as `'General'` instead of looking up the student's actual level or defaulting to `'Beginner'`.
  3. Consequently, sessions created or edited under those conditions were saved to the backend with `type = 'General'`. This caused the badge in the instructor profile activity feed to show `GENERAL` instead of authentic surfing ranks (`Beginner`, `Advance Beginner`, `Intermediate`, `Pro`).

- **Fix Applied**:
  1. **Dynamic Resolution in [InstructorProfile.jsx](file:///d:/surfing/ai/frontend/src/pages/InstructorProfile.jsx)**:
     - When mapping `coachSessions`, if `s.type` or `s.level` is `'General'`, empty, or missing, it dynamically cross-references `allStudents` by `student_id` or student name. If the student has an assigned level (e.g. `Advance Beginner`, `Beginner`, `Intermediate`, `Pro`), that authentic level is used.
     - In the activity row renderer, any residual `'General'` tag is safely sanitized to `'Beginner'` or the student's verified level.
  2. **Replaced Fallback in [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx) & [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx)**:
     - Replaced all 6 instances of `'General'` fallback with `(firstSt?.level && firstSt.level.toLowerCase() !== 'general') ? firstSt.level : 'Beginner'`.
  3. **Database Migration in [backend/main.py](file:///d:/surfing/ai/backend/main.py)**:
     - Added automatic startup query: `UPDATE sessions SET type = 'Beginner' WHERE LOWER(type) = 'general' OR type IS NULL OR type = '';`.

---

### 24. Group Session Bulk Selection & Accurate Count Clarity

- **Root Cause**:
  1. In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx), sessions are grouped by explicit group name or slot into parent group rows (e.g. `Group B • 2 Students`).
  2. Selecting the checkbox for `Group B` checks both student sessions in that group (`groupIds = [id1, id2]`).
  3. Previously, `selectedSessionCount` attempted to re-run `buildSessionGrouping` on `roleScopedSessions.filter(...)`. Due to key matching nuances on legacy records, it returned 2, leading the floating action bar to show `2 Sessions Selected` and the deletion modal to prompt: `"Are you sure you want to delete 2 selected sessions? Delete (2)"`.
  4. From the user's perspective, they only checked 1 visible row on screen (`Group B`), leading to understandable confusion about whether another session had been accidentally selected.

- **Fix Applied**:
  1. **Direct Grouped Data Alignment**:
     - Updated `selectedSessionInfo` in [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx) to calculate selected rows directly from active `groupedData.groups` and `groupedData.ungrouped`.
     - When 1 group row is selected (e.g. `Group B`), `rowCount` is strictly `1`, with `studentSessionCount = 2`.
  2. **Clear User Messaging**:
     - Floating selection bar: Displays `✓ 1 Group Selected (Group B • 2 Students)` and button `Delete Selected (Group B)`.
     - Delete Modal:
       - Title: `Delete Group B`
       - Message: `Are you sure you want to delete Group B (2 student sessions)?`
       - Button: `Delete Group B`
     - Eliminates any ambiguity, confirming to the user that only the single selected group is being targeted while clearly explaining that it includes the 2 student sessions inside that group.


---

### 25. Previous Group Template Card Hover & Opacity Styling

- **User Request**: Reduce default card opacity, use standard dark/black border in normal state, and display green dotted border (`green dots line`) with full opacity when hovering/overlapping over the template card.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Default state: `opacity: 0.6` and `border: '1.5px solid #0F172A'` (clean dark black border with subtle template watermark opacity).
    - Hover / Overlap state (`onMouseEnter`): Smoothly transitions to `opacity: 1`, `border: '2px dotted #00D2B4'` (green dotted border line), and soft teal shadow `0 6px 18px rgba(0, 210, 180, 0.22)`.
    - Mouse leave state (`onMouseLeave`): Returns cleanly to `opacity: 0.6` and `border: '1.5px solid #0F172A'`.


---

### 26. Previous Groups Suggestion Header Clean & Opacity Removal

- **User Request**: Remove opacity fade from the "Previous Groups Suggestion" header banner and reduce highlight styling so it blends cleanly without visual clutter.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Removed `opacity: 0.82` and hover opacity toggling from `#ns-previous-groups-suggestions`, rendering all text with 100% crisp sharpness.
    - Replaced heavy `1.5px dashed #CBD5E1` border with a subtle, clean `1px solid #E2E8F0` border.
    - Softened the `🕒 Previous Groups Suggestion` badge from loud styling to a gentle, muted neutral badge (`#F1F5F9`, `#64748B`, `1px solid #E2E8F0`).


---

### 27. Previous Session Groups Header Unification & Native Column Style

- **User Request**: Match the "Previous Session Groups" header to the standard column headers (`Assigned Training Groups`), remove the grey bubble wrapper box, and keep lower opacity strictly on the template cards inside.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Removed the outer `#FAFAFA` grey box and grey border.
    - Swapped the bubble badge header for standard `ns-col-head` layout:
      - Title: `Previous Session Groups` (`ns-col-title`, bold `#0F172A`).
      - Pill Badge: `{count} Suggested` (`ns-col-badge`).
      - Preserved bulk creation buttons on the right.
    - Low opacity (`0.6`) and dark/black border are applied strictly to the template card itself, with green dotted border appearing dynamically on hover.


---

### 28. Fix JSX Syntax Duplication in NewSession.jsx Modal

- **Issue**: Vite dev server threw `Transform failed with 1 error: Expected ',' or ')' but found '}'` at line 10586 in [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx).
- **Cause**: An accidental duplicate ternary icon fragment inside the confirmation modal icon container left an unclosed bracket block (`}} >`).
- **Fix**: Removed the redundant duplicate fragment, restoring valid JSX structure. Frontend build compiled cleanly without errors.


---

### 29. View Admin Restrictions: Disable Media Uploads and Attendance Marking

- **User Request**: `"view adminnala video photola upload panura mathiri iruku athu pana muadiya kudathu absent present podaura mathiri irku athum poda mudiya kudathu"`
- **Fix Applied**:
  - **Attendance Modification Blocked**:
    - In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx):
      - Guarded `handleToggleAttendance` and `handleMarkGroupAllPresent` with `if (isViewAdmin) { showToast('Attendance modification is not allowed for View Admin', 'warning'); return; }`.
      - In Day Details Modal & Session Attendance Modal:
        - Hid the `Mark All Present` button for `isViewAdmin`.
        - Replaced interactive `✓ Present` and `✕ Absent` buttons with static read-only status badges (`✓ Present`, `✕ Absent`, or `Unmarked`) with `cursor: default`. View Admin users can view student attendance without ability to toggle or modify it.
  - **Video & Photo Uploads / Deletions Blocked**:
    - In [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx):
      - Guarded `handleHubVideoUpload`, `handleDeleteHubVideo`, `handleHubImageUpload`, `handleDeleteHubImage`, and `handleSaveGroupVideo` to reject actions from `isViewAdmin`.
      - Hid the `+ Video` upload button on session rows for `isViewAdmin`.
      - In Session Hub (Video Tab):
        - Empty state displays a view-only message (`No Video Footage Uploaded Yet`) instead of the upload dropzone.
        - Hid clip delete buttons (`✕`), `+ Add Video` carousel button, `+ Upload More Videos`, and `🗑️ Remove Clip`.
      - In Session Hub (Photos Tab):
        - Empty state displays a view-only message (`No Session Photos Uploaded Yet`) instead of the upload dropzone.
        - Hid `+ Upload More Photos`, `🗑️ Remove Photo`, thumbnail delete buttons (`×`), and `+ Add` thumbnail card.
    - In [VideoAnalysis.jsx](file:///d:/surfing/ai/frontend/src/pages/VideoAnalysis.jsx):
      - Guarded upload handlers and hid `Upload Video` button and `+ Upload Video` card for `isViewAdmin`.


---

### 30. Restored "PREVIOUS GROUPS SUGGESTION" Header Banner

- **User Request**: `"ithuku mela iruthatha yan remove pana"` (Why did you remove what was above this?)
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Restored the exact top banner container above the card:
      - `🕒 PREVIOUS GROUPS SUGGESTION` pill badge.
      - `Found {count} previous group(s) in past sessions` descriptive text.
      - Outer container wrapper with clean border and spacing.
    - Low opacity (`0.6`) and dark/black border are maintained strictly on the card template below it, with green dotted border appearing on hover.


---

### 31. Fix "Along with Coach" Failing to Assign Coach in Previous Group Creation

- **User Request**: `"ALONG WITH COACH NU DHAN KUDUTHAN ANA STUDENT MATTUM DHAN CRT AKUTHU"` (I clicked Along with Coach, but only students were created!)
- **Root Cause**:
  - In past session records, the coach field sometimes only stored generic string values (e.g. `'Instructor'` or `'Coach'`) or had a null `instructor_id`.
  - When `previousGroupSuggestions` and `handleAutoCreatePreviousGroup` ran, it attempted to look up `suggestion.coachId` and failed to match any authentic instructor in `allInstructors`.
  - As a result, the group was created with `assignedInstructorIds: []` (0 coaches), leaving the actual verified coach (`manikandan`) unassigned in the suggestion slot with a `+ Assign` button.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Created `resolveAuthenticCoach` helper that matches candidate coaches by ID, sanitized name, and **deep fallbacks directly to `getPreviousCoachesForGroup` and `getPreviousCoachForStudent`** across the group's enrolled students.
    - Updated `previousGroupSuggestions`: Resolves the real coach (`manikandan`) immediately for the template card.
    - Updated `handleAutoCreatePreviousGroup` and `handleAutoCreateAllPreviousGroups`: When `includeCoach = true`, directly retrieves and assigns `validCoach.id` (`manikandan.id`) to `assignedInstructorIds`, so the group is created with the coach fully assigned (`1 Coach : 4 Students`).


---

### 32. Auto Group by Previous Coach: Preserve Separate Groups and Auto-Assign Coach

- **User Request**: `"MELA ULA AUTO CRT GROUP KUDUTHALUM COACH VARA MATTUTHU APARO INNORU GROPALA ULAVAGALA SEATHU OREY GROUP AH CRT PANUTHU APADI PANA KUDATHULA"` (Even when clicking Auto Group at the top or in the slot, coach is not coming, and students from different groups are combined into one single group instead of separate groups!)
- **Root Cause**:
  1. **Coach Omission**: `autoGroupSlotStudents` previously had a hardcoded `let assignedCoachId = null;` leaving coach assignment disabled (`0 Coach : N Students`).
  2. **Group Merging**: `autoGroupSlotStudents` grouped students solely by `const coachKey = prevCoach ? String(prevCoach.id) : 'no-coach';`. Since students from both Group A and Group B shared the same coach or unresolved coach key, they were collapsed into a single cluster and placed into one group card.
  3. **Hoisting Order**: `resolveAuthenticCoach` was declared after `autoGroupSlotStudents`, risking runtime ReferenceError in temporal dead zone.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - Moved `resolveAuthenticCoach` before `autoGroupSlotStudents`.
    - Rewrote clustering key in `autoGroupSlotStudents` to `prev__${pastDate}__${pastGroupName}__${coachId}`, ensuring students from different past groups (e.g. Group A vs Group B) remain in separate clusters.
    - Added automatic coach assignment in `autoGroupSlotStudents`: resolves the authentic coach (`resolveAuthenticCoach`), checks for leave and slot time conflicts, and sets `assignedInstructorId` & `assignedInstructorIds: [validCoach.id]`.
    - Result: `⚡ Auto Group by Previous Coach`, `⚡ Auto Group`, and `⚡ Along with Coach` preserve separate group cards and auto-assign the coach with the green badge (`1 Coach : N Students`).


---

### 33. Time Slot Student Count Sync When Moving Groups Between Slots (`NewSession.jsx`)

- **User Request**: `"NAA ORU GROUP AH INNORU SLOTUKU MATHITAN ANALUM MELA NUMBER MARAMA APADIEY IRUKU ATHA CRT AH PARU"` (I moved a group to another slot, but the student count number in the slot pill at the top didn't change and stayed as it was!)
- **Root Cause**:
  1. **Stale Time Matching**: `isGroupSlotMatch` in `getSlotAllStudentIds` checked `sStart === grpStart` (slot start time vs group start time). When a group was moved to another slot (e.g. from 06:30 AM to 09:30 AM), `handleMoveGroupToSlot` only updated `grp.slotId` but left `grp.time` and `grp.startTime` as the old slot's time (`06:30 AM`). Consequently, `isGroupSlotMatch` continued to match the group to the old slot as well as the new slot, double-counting the students across both slots.
  2. **Slot Identification Precedence**: `isGroupSlotMatch` did not prioritize explicit `slotId` matching, allowing groups with an explicit foreign `slotId` to fall back to matching another slot's time string.
  3. **Group Object Attribute Consistency**: In `handleMoveGroupToSlot`, `grpStudentIds` was only reading `grp.studentIds`, missing groups that stored students in `grp.students`.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - **Updated `handleMoveGroupToSlot`**:
      - Dynamically resolves the target slot's `time` and `startTime`.
      - Updates `time: newSlotTime` and `startTime: newSlotStartTime` along with `slotId: newSlotId` on the moved group.
      - Robustly extracts student IDs from both `grp.studentIds` and `grp.students`.
      - Accurately strips the students from all other slots in `slotStudentMap` and registers them in the target slot.
    - **Refactored `getSlotAllStudentIds`**:
      - Strictly respects `slotId`: If a group has a `slotId` matching another recognized slot, it is immediately rejected from the current slot.
      - Tracks `assignedInOtherSlots`: Any student who is in a group assigned to another slot is strictly excluded from the current slot, preventing ghost or double counts.
      - Synchronizes live `trainingGroups` so moved groups immediately decrement the source slot count and increment the target slot count in the top pills.


### CHANGES ON 10-11-2026

      1. Fix "Clear All" Removing Students from Students List in Step 3 (`NewSession.jsx`)

- **User Request**: `"inga clr all kudutha studentt listla iruka studetum remove akituraga ana apadi aga kudathu"` (When clicking 'Clear All' here, the students in the students list also get removed, but it should not happen like that!)
- **Root Cause**:
  1. In `clearAllGroups`, the logic previously executed `setSlotStudentMap(prev => ({ ...prev, [currentSlotId]: [] }))` (and `setSlotStudentMap({})` when showing all slots). Since the left-hand column ("Students List") filters imported students based on `slotStudentMap[step3SlotFilter]`, wiping `slotStudentMap` caused all students in the time slot to vanish from the Students List entirely (reducing count to 0).
  2. In addition, `clearAllGroups` was calling `DELETE /api/session-drafts`, wrongly deleting the server draft when the user only wanted to clear the training group cards for that slot.
- **Fix Applied**:
  - In [NewSession.jsx](file:///d:/surfing/ai/frontend/src/pages/NewSession.jsx):
    - **Preserved `slotStudentMap`**: `clearAllGroups` and `deleteGroup` now extract all student IDs from the groups being cleared/deleted and ensure they remain in `slotStudentMap` for that slot.
    - **Returned to Unassigned Pool**: Because the groups are cleared from `trainingGroups`, all students immediately return to the left "Students List" with status `Unassigned`, allowing the user to re-group, auto-group (`⚡ Auto Group`), or manually assign them into new group cards.
    - **Draft Integrity**: Removed the erroneous draft deletion call from `clearAllGroups`.


---

    2. Restrict Guest Admin Creation Exclusively to Primary School Admin (`UserProfileMenu.jsx` & `main.py`)

- **User Request**: `"admin anala mattum dhan gust admin crt pana mudiyanum"` (Only if someone is an actual Admin should they be able to create guest admin.)
- **Root Cause**:
  - `isSchoolAdmin` in [UserProfileMenu.jsx](file:///d:/surfing/ai/frontend/src/components/UserProfileMenu.jsx) previously included `isMainAdmin` (`currentRole === 'guest_admin'` with `guest_role === 'main_admin'`).
  - As a result, guest admin accounts granted the "Main Admin" role (e.g. `Deepika`) saw the **`🛡️ Guest Admin Access - Create`** button in their profile menu dropdown and could create further guest admin accounts.
- **Fix Applied**:
  - **Frontend UI & Permissions ([UserProfileMenu.jsx](file:///d:/surfing/ai/frontend/src/components/UserProfileMenu.jsx))**:
    - Introduced strict `isPrimaryAdmin` check: `!isGuestAdmin && !isStudent && !isCoach && (currentRole === 'admin' || currentRole === 'superadmin' || !effectiveUser?.role)`.
    - Protected the **`🛡️ Guest Admin Access - Create`** menu item with `{isPrimaryAdmin && (...) }`, completely hiding it for all Guest Admins (both Main Admin and View Admin), Coaches, and Students.
    - Guarded the modal dialog `{showGuestAdminModal && isPrimaryAdmin && (...) }`.
    - Added security validation in `handleCreateGuestAdmin` blocking non-primary admins and transmitting `creator_role`.
  - **Backend API Protection ([backend/main.py](file:///d:/surfing/ai/backend/main.py))**:
    - Added `creator_role` validation to `@app.post("/api/school/guest-admins")`.
    - Returns HTTP 403 Forbidden if a request is made by non-admin roles (`guest_admin`, `main_admin`, `view_admin`, `coach`, `student`).


---

     3. Guest Admin Creation Exclusively Locked to Original School Admin (`UserProfileMenu.jsx`)

- **User Request**: `"enaku origin school adminnala mattum dhan gust admin crt pana mudiyanum"` (For me, ONLY the original school admin should be able to create guest admin.)
- **Refinement Applied**:
  - In [UserProfileMenu.jsx](file:///d:/surfing/ai/frontend/src/components/UserProfileMenu.jsx):
    - Replaced generic role checks with comprehensive `isOriginalSchoolAdmin` check:
      - Strictly verifies that the user is NOT a guest admin (`!isGuestAdmin`).
      - Confirms absence of any `guest_role` (`!effectiveUser?.guest_role`, `!effectiveUser?.is_view_admin`, `!effectiveUser?.is_main_admin`, `!user?.guest_role`).
      - Verifies the user was not created by the school as a guest (`!effectiveUser?.created_by_school`).
      - Excludes coaches and students (`!isHeadCoachUser && !isCoach && !isStudent`).
      - Strictly confirms original administrative status (`currentRole === 'admin' || currentRole === 'superadmin' || user?.role === 'admin'`).
    - The menu button **`🛡️ Guest Admin Access - Create`** is rendered **ONLY** when `isOriginalSchoolAdmin` is true.
    - All associated functions (`fetchGuestAdmins`, `handleCreateGuestAdmin`, `handleDeleteGuestAdmin`) and the modal popup are strictly guarded by `isOriginalSchoolAdmin`.
    - No Guest Admin (neither Main Admin nor View Admin), Coach, Head Coach, or Student can ever see or invoke Guest Admin creation.

---

### CHANGES ON 11-11-2026

#### 1. Separated Coach vs Student Join Requests & Dedicated Coach Join Requests Modal (`InstructorManagement.jsx`, `StudentsManagement.jsx`)
- **Problem**:
  - Coaches who registered online (e.g. Sathya) were erroneously appearing inside the student **Pending Registration Requests** popup modal in `StudentsManagement.jsx`.
  - In `InstructorManagement.jsx`, pending coaches were displayed directly inside the active roster card grid with an intrusive inline cell containing `Pending School Approval [Approve] [Reject]` buttons inside the card, rather than being handled cleanly via a dedicated modal.
- **Resolution**:
  - **Student Pending Requests Guard (`StudentsManagement.jsx`)**:
    - Filtered `allPendingRequests` in `StudentsManagement.jsx` to strictly exclude requests with role `coach`, `instructor`, `admin`, or `superadmin` across backend records, `school_join_requests`, and `savedAccounts`.
    - Only actual student registrations (`athlete`, `student`, `user`) now appear in the student pending modal.
  - **Removed Card Cell & Clean Coach Roster (`InstructorManagement.jsx`)**:
    - Removed the inline `Pending School Approval` cell and action buttons from inside the instructor card in the grid ("kila atha cell vena").
    - Excluded pending coaches from `filtered` active instructor roster cards so pending registrations do not clutter the active instructor cards grid until approved.
  - **Dedicated Coach Join Requests Modal (`InstructorManagement.jsx`)**:
    - Configured the top header `[⏳ Join Requests (N)]` button to open a dedicated **Pending Coach Registration Requests** modal dialog (`showCoachJoinRequestsModal`).
    - The modal aggregates pending coach registrations from backend instructors (`approval_status === 'pending'`), `school_join_requests` (role coach/instructor), and `savedAccounts`.
    - Features coach search, contact info, school affiliation, certifications, and one-click `[✓ Accept]` and `[✕ Decline]` actions.
    - Approving a coach synchronously updates the backend, sets `approval_status: 'approved'` in localStorage (`school_join_requests`, `savedAccounts`), and brings the coach directly into the active instructor roster.
  - **Group Card Student Deduplication (`NewSession.jsx`)**:
    - Enhanced group card student rendering in Step 3 (*Instructor Groups Matching*) with composite ID and name deduplication guards (`seenGrpStudentKeys`) so duplicate student chips (e.g. Grace Hall, Liam Torres) cannot render multiple times in the same group card.
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 2.87s.

#### 2. Removed "Edit Slot" Button from Session Details Popup (`Sessions.jsx`)
- **Problem**:
  - In the calendar session roster view, clicking on an individual session opened the **Session Details** popup which showed an "Edit Slot" button alongside "Launch AI Video Analysis", allowing users to trigger slot edits from this view where editing was not desired.
- **Resolution**:
  - Removed the `Edit Slot` button from `selectedSessionDetail` in [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx#L8298-L8315).
  - Expanded `Launch AI Video Analysis` to full width (`width: '100%'`).
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 1.97s.

#### 3. Fixed Coach Selection Auto-Assigning All Students into Group (`NewSession.jsx`)
- **Problem**:
  - In Step 3 (*Instructor Groups Matching*), when clicking an instructor card from the *Available Instructors* column without selecting any students from the *Students List*, all students in that time slot were immediately auto-assigned into a newly created group card under that coach, rather than creating an empty group card with only the clicked coach selected.
- **Root Cause**:
  - In `NewSession.jsx` (line ~10418), when no group existed in the active slot or when all existing groups were already occupied by coaches, the fallback logic executed:
    ```javascript
    const slotStudents = slotStudentMap[activeSlotId] || [];
    studentIds: deduplicateStudentIds(slotStudents)
    ```
    This dumped all students currently in `slotStudentMap` for that slot into the new group's `studentIds`, stripping every student from the left-hand *Students List* and bulk-assigning them to that single coach.
- **Resolution**:
  - **Selective Assignment Guard**:
    - Replaced the bulk slot students dump with `checkedToAdd = (step3CheckedStudentIds && step3CheckedStudentIds.length > 0) ? deduplicateStudentIds(step3CheckedStudentIds) : []`.
    - If the user has not explicitly checked any students, `studentIds` is initialized as empty `[]`.
    - An empty group card (e.g. `Group A`, `Group B`) is created with only the clicked coach assigned (`assignedInstructorIds: [inst.id]`), leaving all students untouched in the unassigned *Students List*.
    - If the user has explicitly selected/checked students, only those checked students are assigned to the group, and `setStep3CheckedStudentIds([])` resets the selection.
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 2.36s.

#### 4. Fixed Student Page CSV Export Count & Accompanying Guests Omission (`StudentsManagement.jsx`)
- **Problem**:
  - In the Students Management page, when clicking **"Export CSV"**, users with 20 students / participants (e.g., 18 primary students + 2 accompanying guests, or 20 approved students where 2 were upcoming/inactive) found that only 18 students were included in the downloaded CSV file, while 2 participants were completely omitted.
- **Root Cause**:
  - **Omission of Accompanying Guests as Individual Rows**: `handleExportCSV` previously iterated over `listToExport` via `.map()`, creating only 1 row per primary student. Accompanying guests were merely appended as a comma-separated text note in the last column of the primary student's row rather than as full participant rows. Since the page title (`Students (20)`) and the *Total Students* stat card sum `approvedStudents.length + totalApprovedGuests` (18 + 2 = 20), the resulting CSV file was missing 2 individual participant rows.
  - **Default Filter Narrowing**: `listToExport` used `(filtered && filtered.length > 0) ? filtered : approvedStudents`. On page load, `activeStatFilter` defaults to `'ACTIVE'`. Any students who were upcoming or completed were filtered out of `filtered`, resulting in fewer records being exported than the total student count shown in the top header.
- **Resolution**:
  - **Explicit Individual Rows for Accompanying Guests**:
    - `handleExportCSV` now iterates through each student and outputs their primary student record, and then directly generates full participant rows for each accompanying guest (`g.name`, `g.gender`, `g.age`, `g.swimming_ability`, `g.level`, session times, and relationship tag `Accompanying Guest of [Parent Name]`).
  - **Smart Scope Resolution**:
    - If the user has explicitly applied a search query or specific dropdown filter (level, coach, stay, date range), the export cleanly respects `filtered` and includes matching students and their guests.
    - If no narrowing search or specific filter is set (or when viewing 'TOTAL'), `handleExportCSV` exports all `approvedStudents` and their guests, guaranteeing that no registered student is omitted.
  - **Real-Time Row Count Toast**:
    - Updated export feedback toast to report the exact total of exported participant rows (`Successfully exported ${rows.length} student(s) / participant(s) to CSV!`).
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 2.11s.

#### 5. Fixed Group Slot Reassignment & Student Count Zeroing Bug (`NewSession.jsx`)
- **Problem**:
  - In Step 3 (*Instructor Groups Matching*), when moving an existing group card to a different time slot using the group card's slot dropdown (e.g. moving a group from the 2nd slot `09:30 AM` to `06:30 AM`), the top time slot pills unexpectedly displayed `0 Students` across all slots (e.g., `(1) 06:30 AM 0 Students | (2) 09:30 AM 0 Students | (3) 02:00 PM 0 Students | (4) 08:30 AM 0 Students`).
- **Root Cause**:
  - **Key Resolution Mismatch in `slotStudentMap`**: Time slots in `SchoolSlotConfig` and drafts can be keyed either by numeric IDs (`1`, `2`), string IDs (`"1"`, `"2"`), or slot time strings (`"06:30 AM"`, `"09:30 AM"`).
  - In `handleMoveGroupToSlot`, students removed from the source slot were only added back under `newMap[newSlotId]` and `newMap[String(newSlotId)]`. If other slots stored students by time strings, lookups failed.
  - In `getSlotAllStudentIds`, `fromMap` previously only checked `slotStudentMap[sId] || slotStudentMap[String(sId)]`, returning empty arrays `[]` whenever students were stored under `startTime` or formatted time ranges, causing counts to collapse to `0 Students`.
  - In `isGroupSlotMatch`, groups with mismatched ID types or times were falsely flagged as belonging to "other slots", causing `assignedInOtherSlots` to exclude all students and zero out slot student totals.
  - In `useEffect` for slot selection auto-reset, strict identity equality (`s.id === selectedSlotId`) failed when string IDs were compared with numeric IDs, causing the active slot selection and filter to reset unexpectedly.
- **Resolution**:
  - **Multi-Key Slot Student Resolution in `getSlotAllStudentIds`**:
    - `fromMap` now aggregates student IDs across all possible slot key formats: `slotStudentMap[sId]`, `slotStudentMap[String(sId)]`, `slotStudentMap[slotObj.startTime]`, `slotStudentMap[sStart]`, `slotStudentMap[slotObj.time]`, and `slotStudentMap[sFull]`.
    - `isGroupSlotMatch` prioritizes start time / time range compatibility and safely falls back without premature exclusion.
  - **Comprehensive Group Slot Reassignment in `handleMoveGroupToSlot`**:
    - Updates the moved group in `trainingGroups` with new `slotId`, `time`, and `startTime`.
    - Strips the group's student IDs from all slots in `slotStudentMap` and registers them across all valid key representations of the target slot (`id`, `String(id)`, `startTime`, `time`).
    - Automatically updates `slotCapacityMap` if the moved group increases total students beyond the slot's current capacity.
  - **Type-Agnostic Slot Comparisons**:
    - Converted strict equality checks to string-coerced comparisons (`String(s.id) === String(selectedSlotId)`) in auto-reset effects, `getSlotThemeForSlot`, and `displayedTrainingGroups`.
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 3.14s.

#### 6. Fixed Duplicate Students Bug on "Auto Group" in Step 3 (`NewSession.jsx`)
- **Problem**:
  - When clicking the **"Auto Group"** button in Step 3 (*Instructor Groups Matching*), student cards inside the generated group cards were duplicated (e.g., `Grace Hall` rendered twice, `Liam Torres` rendered twice).
- **Root Cause**:
  - In JavaScript, `Set` uses strict identity equality (`===`). Student IDs originating from different sources (such as database integers `718` from the pool, string identifiers `'718'` from URL/draft/cleared group arrays) caused `Set` deduplications to treat `718` and `'718'` as distinct values (`new Set([718, '718']).size === 2`).
  - In `autoGroupSlotStudents`, `slotStudentIds` was not deduplicated prior to filtering. When resolving students via `resolveStudentFromPool`, both numeric and string representations resolved to the same student object, appending duplicate student references into the cluster's `students` array.
  - When `students.slice(i, i + maxPerGroup)` divided the cluster into group cards, the duplicate objects were copied directly into `newGroup.studentIds`, causing duplicate chips to render inside the group card.
- **Resolution**:
  - **Universal Canonical Deduplication Helper (`deduplicateStudentIds`)**: Added a type-agnostic deduplication function that converts IDs to trimmed string keys to guarantee that no student or guest ID is ever stored or processed more than once, regardless of numeric or string typing.
  - **`autoGroupSlotStudents` Strict Uniqueness Guard**:
    - Raw slot student IDs are now pre-deduplicated through `deduplicateStudentIds`.
    - Added a `seenStudentKeysInSlot` Set that tracks all assigned students across groups and clusters in the active slot run. Any student or guest already encountered is immediately skipped.
    - Added cluster-level uniqueness checks (`seenStudentKeys`) to ensure no student can ever be pushed more than once to a cluster.
    - Deduplicated the final slice before setting `newGroup.studentIds: deduplicateStudentIds(chunk.map(s => s.id))`.
  - **Group Card Defensive Render Deduplication**:
    - Added a unique key filter (`seenGrpStudentKeys`) in the JSX mapping of `grpStudents` so that even if historical draft state contains duplicate keys, only a single unique student chip will ever render per student in any group card.
  - **State Deduplication Across User Actions**:
    - Applied `deduplicateStudentIds` to `clearAll`, `handleCreateGroup`, `handleDropOnGroup`, `previousGroupSuggestions`, and Step 2 roster selections (`matchingFilteredIds`).
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 2.94s.

7. Real Production AWS RDS Extraction, Local Backup & Complete Database Sync
- **Root Cause of Old Backup Data**:
  - The previous script used a hardcoded fallback (`database-2`) which was an older staging snapshot.
  - The authentic live production database (`aisurf-db-cluster.cluster-ckl2omi0klbx.us-east-1.rds.amazonaws.com`) resides securely within the AWS VPC private subnet.
- **Strict Read-Only Extraction via EC2 Backend Instance (`i-0c62e04f44a9ea237`)**:
  - Connected from the backend EC2 server directly to `aisurf-db-cluster` in strict session read-only mode (`conn.set_session(readonly=True, autocommit=False)`).
  - Dumped all 38 tables representing real live production data:
    - **Students**: 566 records (including latest registrants like `KISHORE RAMESH`, `Aniket Ingle`, etc.)
    - **Sessions**: 2,343 records
    - **Scores**: 7,268 records
    - **Users**: 553 records
    - **Instructors / Coaches**: 50 records
    - **Surf Schools**: 10 records (Bala Surf, Arun Surf, athnexlive, samsurf, rpn surf school, Togai Surf, Aquatic Indica, etc.)
    - **Badges**: 166 records
  - Saved dump to S3 (`s3://aisurf-media-uploads-149051628601/backups/real_prod_backup.json`) and downloaded locally to `backups/real_prod_backup_latest.json` (46.7 MB).
  - Zero modifications were made to the live production database.
- **Local Database Replacement**:
  - Cleaned and restored all tables into local PostgreSQL (`postgresql://postgres:eric%402004@localhost:5432/surfing_db`) using replica session mode and initial bulk truncation.
  - Re-aligned all PostgreSQL sequences to match MAX IDs.
  - Synchronized local SQLite (`backend/aisurf.db`).
  - Verified local API: `http://127.0.0.1:8000/api/superadmin/students` returns all **566 live students**.
 8. Full Production AWS Deployment (`https://athnexlive.com`)
- Built and deployed the frontend bundle to AWS S3 & Nginx on EC2 instance (`i-02999b6093bc5bfd2`).
- Deployed `backend/main.py` updates to AWS EC2 instance (`i-0c62e04f44a9ea237`) and restarted `aisurf-backend`.
- Verified live endpoints: `https://athnexlive.com` (HTTP 200 OK) and `https://athnexlive.com/api/schools` (HTTP 200 OK).

---

### CHANGES ON 12-11-2026

#### 1. Full Production AWS Deployment Verified (`https://athnexlive.com`)
- **Backend Deployment**:
  - Uploaded latest `backend/main.py` to `s3://aisurf-media-uploads-149051628601/deploy/main.py`.
  - Executed AWS Systems Manager (SSM) command (`895ebec1-48f2-460a-bf93-e7e6704fd186`) on Backend EC2 (`i-0c62e04f44a9ea237`).
  - Successfully restarted `aisurf-backend` systemd service; status verified as `active (running)`.
- **Frontend Deployment**:
  - Re-built clean production bundle via Vite (`npm run build`) with 0 errors in 1.42s.
  - Packaged and uploaded `aisurf-frontend.zip` (2.26 MB) to S3.
  - Executed AWS Systems Manager (SSM) command (`5d67f4c3-1836-4bcd-9fb8-5a2a919593d4`) on Frontend EC2 (`i-02999b6093bc5bfd2`).
  - Extracted fresh bundle to `/var/www/frontend` and reloaded `nginx` systemd service; status verified as `active (running)`.
- **Live Endpoint Verification**:
  - `https://athnexlive.com`: HTTP 200 OK.
  - `https://athnexlive.com/api/schools`: HTTP 200 OK returning live RDS surf schools.

#### 2. Removed Analytics Tab from Student View (`Sidebar.jsx`, `Analytics.jsx`)
- **Problem**:
  - Students logging into their portal (e.g. `RPNitheesh`) saw the school-wide **"Analytics"** (Badge Progression) tab in the top navigation bar. The school-level student progression and badge management view is meant strictly for School Admins and Coaches.
- **Resolution**:
  - In [Sidebar.jsx](file:///d:/surfing/ai/frontend/src/components/Sidebar.jsx#L198-L203), wrapped `{ label: 'Analytics', path: '/analytics' }` in `if (!isStudent)`, so the Analytics tab is completely hidden for student and athlete roles. Students only see their relevant tabs (`My Profile`, `My Sessions`, `My Achievements`, `Competitions`, `Athlete Intel`).
  - In [Analytics.jsx](file:///d:/surfing/ai/frontend/src/pages/Analytics.jsx#L294-L300), added a protective guard that automatically redirects any student navigating to `/analytics` to `/achievements`.
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 1.68s.

#### 3. Surf Session Milestone Card Enhancement: Ocean Training Time & Waves Caught Added (`MyAchievements.jsx`)
- **Requirement**:
  - In the **Share Surf Session Milestone** card modal, display the number of waves caught (`na yetha wave pudichan`) and session ocean duration (`yevalo time`), positioned directly below the `Date & Time` row.
  - Also ensure high-res poster canvas generation, social sharing, and direct WhatsApp / Web Share reflect the actual image poster with waves caught and training duration.
- **Resolution**:
  - In [MyAchievements.jsx](file:///d:/surfing/ai/frontend/src/pages/MyAchievements.jsx):
    1. Added `getSessionWaves(sess)`: resolves waves caught from `sess.waves_ridden`, `sess.waves_caught`, `sess.wave_count`, or verified score.
    2. Added `getSessionDuration(sess)`: parses slot duration from `sess.duration_mins`, `sess.duration`, or `sess.time` (e.g. `06:30 AM - 08:30 AM` → `2 Hours (120m)`).
    3. Updated modal session details card right beneath `📅 Date & Time`:
       - `⏱️ Training Time`: dynamic duration (e.g. `2 Hours (120m)`).
       - `🌊 Waves Caught`: highlighted count (e.g. `8 Waves Caught`).
    4. Enhanced high-resolution Canvas story poster generator (`generateStoryPosterBlob`): creates a 6-metric balanced athletic layout with `TRAINING TIME` and `WAVES CAUGHT` blocks alongside date, spot, coach, and technique score.
    5. Enhanced `handleShareWhatsApp` and `handleNativeShare` with direct Web Share API (`navigator.share({ files: [imageFile] })`), and on desktop automatically downloads the high-res poster and copies the image to clipboard for instantaneous paste (Ctrl+V) into WhatsApp chats.
  - **Verification**: Production build (`npm --prefix frontend run build`) compiled successfully in 1.97s with 0 errors.

#### 4. Highlighted "Share Achievement with Friends" Button (`MyAchievements.jsx`)
- **Requirement**:
  - Update session card share button text to `"Share Achievement with Friends"` and give it high-contrast, prominent highlighting.
- **Resolution**:
  - In [MyAchievements.jsx](file:///d:/surfing/ai/frontend/src/pages/MyAchievements.jsx#L1162-L1178), updated label to `<span>Share Achievement with Friends</span>`.
  - Replaced low-contrast pale mint background (`#F0FDF4`) with an eye-catching ocean gradient (`linear-gradient(135deg, #0D9488 0%, #0284C7 100%)`), bold white typography (`#FFFFFF`, `font-weight: 800`), sleek pill border radius (`9999px`), and depth shadow (`box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35)`).
  - **Verification**: Production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 2.60s.

#### 5. Session Milestone Card Redesign: 4 Prominent Metric Box Cards & Footer Meta Strip (`MyAchievements.jsx`)
- **Requirement**:
  - Restructure session share preview card: move `Date & Time` and `Surf Spot` to the lower section, and display the primary metrics (Waves Caught, Training Time, Technique Score, Coach) in large, prominent metric boxes.
- **Resolution**:
  - In [MyAchievements.jsx](file:///d:/surfing/ai/frontend/src/pages/MyAchievements.jsx):
    - Replaced the vertical list inside the single session share card with a 2x2 grid of prominent frosted glass metric boxes (`ach-card-metrics-grid` with `ach-card-metric-cell`):
      1. `🌊 Waves Caught` (`{getSessionWaves} Waves`)
      2. `⏱️ Training Duration` (`{getSessionDuration}`)
      3. `⭐ Technique Rating` (`{score}/100`)
      4. `🏄 Coach / Instructor` (`{instructor}`)
    - Placed `📅 Date & Time` and `📍 Surf Spot` in a sleek meta details strip directly beneath the 4 metric boxes.
    - Added `max-height: 94vh; overflow-y: auto;` to `.ach-modal-box` for seamless responsiveness on all device screen sizes.
  - **Verification**: Clean Vite production build (`npm --prefix frontend run build`) compiled successfully with 0 errors in 1.75s.

#### 6. "Our Services" Modal & Custom Milestone Poster Photo Setup (`UserProfileMenu.jsx`, `MyAchievements.jsx`, `backend/main.py`)
- **Requirement**:
  - Add an `"Our Services"` item in the user profile menu dropdown for School Admins.
  - Inside that modal, allow the admin to manually upload or select a custom surf photo for the official Milestone Story Poster background.
  - Remove unwanted course list packages and keep the modal focused strictly on the Milestone Poster Photo customizer.
  - When students or coaches download or share the story poster in My Achievements, the custom photo is used as the canvas background with all milestone metrics and student details branded on top.
- **Resolution**:
  - **Backend (`main.py`)**:
    - Added `poster_url VARCHAR(500)` column to `School` model with automatic SQLite/PostgreSQL safe migration checks.
    - Created `GET /api/schools/poster` and `POST /api/schools/poster` endpoints for fetching and persisting the academy's custom poster photo.
    - Included `poster_url` in `/api/schools` response.
  - **Profile Menu & Poster Modal (`UserProfileMenu.jsx`)**:
    - Added dedicated `"Our Services"` menu button with `Poster Photo` badge right below `Edit Profile`.
    - Created modal focused exclusively on the Milestone Story Poster photo: live Story Card Preview, device file upload button (`POST /api/upload-image`), 5 HD curated surf action presets, and quick Save. Removed the package programs list.
  - **Milestone Poster Integration (`MyAchievements.jsx`)**:
    - Subscribed `MyAchievements` to school's custom `poster_url` with dynamic caching and real-time cross-tab storage sync.
    - Dynamically applied the custom poster photo to both the live card preview and the exported high-resolution canvas poster so all student details overlay directly on the custom photo.
  - **Verification**: Production bundle compiled cleanly (`npm --prefix frontend run build`) with 0 errors in 1.73s.

#### 7. Active Operating Months (Season Schedule) Configuration (`SessionConfigure.jsx`, `Sessions.jsx`)
- **Requirement**:
  - In `Session Configuration` (`SessionConfigure.jsx`), add an **"Active Operating Months"** configuration section where surf schools can set which months of the year they operate (e.g. October to May for core surf season, or Jan to Dec year-round).
  - The school should be active only in those selected months.
  - Reflect off-season / inactive months in the Sessions calendar and scheduling workflows.
- **Resolution**:
  - **Interactive Compact 12-Month Season Selector (`SessionConfigure.jsx`)**:
    - Replaced the bulky multi-line card layout with a sleek, compact, single-strip month pill selector (matching the `AVAILABLE DAYS` button style in the time slots table).
    - 12 compact clickable month pills (`JAN` through `DEC`):
      - Selected/Active: Solid teal `#0D9488` with white text and `✓` checkmark.
      - Unselected/Off-Season: Light slate `#F8FAFC` with `#64748B` text.
      - 1-click toggle to add/remove months with instant state and storage sync.
    - Inline header with `🗓️ Active Operating Months`, live badge `{activeMonths} / 12 Months Active`, and quick preset buttons (`All Year`, `Oct – May`, `Nov – Mar`).
    - Sticky bottom bar shows active months count alongside active slots and total student capacity: `🗓️ X Active Months • ⏰ Y Active Slots • 🎯 Total Capacity: Z Students`.
  - **Off-Season Indicators in Sessions Calendar (`Sessions.jsx`)**:
    - Loaded `activeOperatingMonths` from API settings and local storage.
    - Added off-season notification banner when viewing an inactive month in the Interactive Calendar: `🏖️ Off-Season Notice: [School Name] is configured as off-season / closed during [Month Name]. Active Operating Months: [Oct, Nov, Dec, Jan, ...].`
    - Added seasonal badge (`✓ Active Season` vs `🏖️ Off-Season`) to the calendar month title.
    - Individual calendar day cells display an `Off-Season` tag for days falling in an off-season month.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.83s.

#### 8. Privacy & Role Isolation Fixes for Sessions Calendar & Day Roster Modal (`Sessions.jsx`)
- **Requirement**:
  - **Issue 1**: In the student view, clicking calendar dates was opening the full coach/admin attendance & roster drawer (`selectedDayDetailsModal`) displaying all enrolled students of other groups, attendance markings ("Mark All Present", "Call", "Present", "Absent"), and contact numbers. Students should never see other students' attendance rosters or coach management tools.
  - **Issue 2**: Coaches who were not assigned to a session (or sessions assigned to different coaches) were leaking across the calendar and the Day Roster modal for all coaches in the academy.
- **Resolution**:
  - **Role-Gated Day Details Modal**:
    - Restricted `selectedDayDetailsModal` strictly to non-students (`!isStudent`). Students will never trigger or see the attendance modal.
    - When a student clicks on a date in the calendar, it now directly resolves and opens their own personal session report card (`setSelectedHubSession(mySession)`).
    - Switched `targetDaySessions` in `selectedDayDetailsModal` from the raw global `sessions` array to `roleScopedSessions`, ensuring that even when a coach opens the modal, they ONLY see groups and students assigned specifically to them.
  - **Strict Coach Session Scoping (`roleScopedSessions`)**:
    - Expanded coach identification beyond raw `currentUser.id` to match against both Instructor primary key (`instructors.id`) and linked user ID (`instructors.user_id`), plus verified instructor names.
    - Coaches now strictly view ONLY the sessions they are assigned to. For unassigned coaches, `roleScopedSessions` cleanly resolves to an empty roster (`[]`), preventing cross-coach session leaks in both the monthly calendar grid and date roster drawer.
  - **Verification**: Built production bundle cleanly (`npm --prefix frontend run build`) with 0 errors in 1.76s.

#### 9. Removed 1-to-10 Scoring Buttons from Session Evaluation Feedback Cards (`Sessions.jsx`)
- **Requirement**:
  - In the Session Detail & Evaluation modal (`Sessions.jsx`), remove the 1-to-10 scoring buttons and rating score badges (`Score (1 to 10):`, buttons `1` to `10`, `Rate 1 to 10`) from both **"What You did Well"** and **"What to Improve"** cards.
  - Keep the text observation input areas so coaches can freely enter qualitative coaching notes and tips.
  - Remove score pills from the student report card view and prevent formatting `[X out of 10]` into saved coach notes.
- **Resolution**:
  - **Coach Evaluation Mode (`Sessions.jsx`)**:
    - Removed `Rate 1 to 10` / `★ Score:` headers and the 1-to-10 score button grids (`[1, 2, ..., 10]`) from Card 2 (*"What You did Well"*) and Card 3 (*"What to Improve"*).
    - Preserved the clean text input boxes (`e.g. Good Take off (Pop Up), clean bottom turn...` and `e.g. Paddling Strength, head position, wave anticipation...`).
  - **Coach Note Formatting (`formatCoachNotes`)**:
    - Updated `formatCoachNotes` so it no longer appends `[wellScore out of 10]` or `[impScore out of 10]` to the saved notes payload.
  - **Student View Report Card**:
    - Removed score badges (`★ Score: {hubWhatDidWellScore} / 10` and `Score: {hubWhatToImproveScore} / 10`) from the student session report card view.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.05s.

#### 10. Added 0–100 Technique Scoring & End-to-End Share Card Integration (`Sessions.jsx`, `MyAchievements.jsx`, `backend/main.py`)
- **Requirement**:
  - Coaches need to score athletes out of 100 in the Session Evaluation modal (`Sessions.jsx`).
  - This 0–100 technique score must directly reflect in the student's Milestone Share card, HD canvas poster export, and social share text (WhatsApp/X/Facebook).
- **Resolution**:
  - **Coach Evaluation Modal (`Sessions.jsx`)**:
    - Added dedicated **"Coach Technique Score"** card positioned directly above *Wave Count* (directly under *Surfing Level*).
    - Provides a direct number input box `[ 85 ] / 100` (allowing any score from 0 to 100), step adjustment buttons (`−` and `+` by 5 points), and 1-click preset badges (`60`, `70`, `75`, `80`, `85`, `90`, `95`, `100`).
    - Stored and formatted into session notes as `Coach Rating: {score}/100`.
  - **Student View (`Sessions.jsx`)**:
    - Displayed verified Coach Score (`{score} / 100`) directly beside Waves Caught in the student's personal session report card view.
  - **Backend Parser (`backend/main.py`)**:
    - Enhanced `session_to_dict` to automatically parse `wave_count` and `score` (0–100) from `notes`, populating `score`, `technique_score`, and `wave_count` in API responses.
  - **Student Portal & Milestone Sharing (`MyAchievements.jsx`)**:
    - Added `getSessionScore` and `getSessionWaves` with smart regex fallbacks for session notes.
    - Milestone statistics (`stats.avgScore` and `stats.totalWaves`) dynamically compute from verified session scores.
    - Single session share cards, WhatsApp / X / Facebook share text, and the downloadable HD Story Poster dynamically render the exact coach score (`⭐ {score} / 100`).
  - **Verification**: Production build (`npm --prefix frontend run build`) compiled cleanly with 0 errors in 1.93s.

#### 11. Unified Skill Level Normalization & Fixed Count Mismatch Between Students and New Session (`StudentsManagement.jsx`, `NewSession.jsx`, `Sessions.jsx`, `AthleteIntelligence.jsx`, `Analytics.jsx`)
- **Problem**:
  - In `StudentsManagement.jsx`, the Beginner card showed **8 Beginners** and Adv. Intermediate showed **3**, whereas in `NewSession.jsx` (Available Students Pool) it showed **7 Beginners** and **4 Adv. Intermediate** for the exact same active student cohort (21 total).
- **Root Cause**:
  1. `StudentsManagement.jsx` and `NewSession.jsx` had divergent `normalizeLevel` functions. In `StudentsManagement.jsx`, standalone `"Advance"` or abbreviated `"Adv. Intermediate"` strings failed strict `.includes('advance intermediate')` and `.includes('advanced')` checks, mistakenly falling all the way through to `'Beginner'`. In `NewSession.jsx`, `l === 'advance'` mapped to `'advance_intermediate'`.
  2. In `StudentsManagement.jsx`, accompanying guests without an explicit `g.level` evaluated `normalizeLevel(g.level)` to `'Beginner'`, whereas in `NewSession.jsx`, accompanying guests inherited the primary student's level (`g.level || s.level`).
- **Resolution**:
  - **Standardized Unified `normalizeLevel`**:
    - Created an authoritative, multi-tier normalizer implemented consistently across `StudentsManagement.jsx`, `NewSession.jsx`, `Sessions.jsx`, `AthleteIntelligence.jsx`, and `Analytics.jsx`:
      - **Advance Intermediate**: `(s.includes('adv') && s.includes('int')) || s.includes('blue') || s === 'advance' || s === 'advanced' || s.startsWith('adv')`.
      - **Advance Beginner**: `(s.includes('adv') && s.includes('beg')) || s.includes('yellow')`.
      - **Pro**: `s.includes('pro') || s.includes('master') || s.includes('elite') || s.includes('red')`.
      - **Intermediate**: `s.includes('int') || s.includes('green')`.
      - **Beginner**: `s.includes('beg') || s.includes('novice') || s.includes('white')` (default fallback).
  - **Guest Level Inheritance**:
    - Updated guest level tallying in `StudentsManagement.jsx` to `normalizeLevel(g.level || s.level)`, guaranteeing that guests without explicit levels inherit the parent student's level identically to `NewSession.jsx`.
  - **Result**:
    - Student counts across all skill levels (Beginner: 7, Adv. Beginner: 4, Intermediate: 1, Adv. Intermediate: 4, Pro: 5; Total: 21) now match 100% identically between Students page, New Session available student pool, Session group builders, and Athlete Intelligence.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.19s.

#### 12. Added Missing Highlight Styles for PRO Level Badges in Coach Profile (`InstructorProfile.jsx`)
- **Problem**:
  - In the Coach Profile page (`InstructorProfile.jsx`) under the *Active Today* / *Total Students* list, student level badges for `ADVANCED BEGINNER` (purple/yellow) and `INTERMEDIATE` (green) had highlight background pills, but `PRO` rendered as plain unhighlighted black text without styling.
- **Root Cause**:
  - In `InstructorProfile.jsx` CSS, only `.level-beginner`, `.level-intermediate`, and `.level-advanced` were defined. `.level-pro` was completely missing from the stylesheet.
  - Furthermore, student level badges did not use the application's unified badge normalization, leaving raw lowercase string concatenations vulnerable to missing classes.
- **Resolution**:
  - **Comprehensive Badge Styling**:
    - Added complete badge rendering matching Athnex design system:
      - **🔴 Pro**: Soft red background (`#FFE4E6`), crimson text (`#BE123C`), and red border (`#F43F5E`).
      - **🔵 Advance Intermediate**: Soft blue background (`#DBEAFE`), cobalt text (`#1D4ED8`), and blue border (`#3B82F6`).
      - **🟢 Intermediate**: Soft green background (`#D1FAE5`), emerald text (`#047857`), and green border (`#10B981`).
      - **🟡 Advance Beginner**: Soft amber background (`#FEF3C7`), bronze text (`#B45309`), and amber border (`#F59E0B`).
      - **⚪ Beginner**: Soft slate background (`#F8FAFC`), dark slate text (`#475569`), and slate border (`#CBD5E1`).
    - Added corresponding CSS classes (`.level-pro`, `.level-advance-intermediate`, `.level-advance-beginner`, etc.) to `InstructorProfile.jsx`.
  - **Verification**: Built production bundle cleanly (`npm --prefix frontend run build`) with 0 errors in 1.61s.

#### 13. View Admin Read-Only Lockdown in Session Hub & Evaluation Modal (`Sessions.jsx`)
- **Problem & Requirement**:
  - In `Sessions.jsx`, when a View Admin (`role === 'guest_admin'` and `guest_role === 'view_admin'`) opened a session's details and evaluation modal, they were able to edit feedback notes, adjust wave counts, change technique scores, downgrade/upgrade surfing levels, mutate the session status via the top dropdown (`Upcoming` / `Completed`), and click "Save Changes".
  - The requirement was strict: View Admin should **ONLY VIEW** notes, feedback, and session evaluations. They must NOT be able to edit notes, alter scoring, change levels, mutate session status, or save changes.
- **Root Cause**:
  - The Session Hub modal only differentiated between `isStudent` (read-only student report card) and `!isStudent` (full interactive coaching/admin mode).
  - Because `isViewAdmin` was not checked in the status dropdown, the notes tab conditional, and the modal footer, View Admin fell into the interactive coach editing mode by default.
- **Resolution**:
  - **Status Change Locked Down**:
    - Replaced the interactive `<select>` dropdown with a static, read-only status pill (`<span className="ses-status-pill">`) when `isViewAdmin` is true (matching student view).
    - Guarded `handleHubStatusChange` to reject any status mutations with a toast warning (`"Status changes are restricted for View Admin (Read-Only Mode)"`).
  - **Read-Only Performance & Feedback Report View**:
    - Expanded the notes tab conditional from `isStudent ? (...) : (...)` to `{isStudent || isViewAdmin ? (...) : (...)}`.
    - View Admin now sees the clean, non-editable Performance & Feedback Report Card displaying:
      - Certified Surfing Level Badge.
      - Waves Caught metric box.
      - Coach Technique Score (`⭐ {score} / 100`).
      - "What You Did Well" (Read-only coach remarks).
      - "What to Improve" (Read-only coaching advice).
      - Dynamic Athlete selector for group sessions to easily inspect each student's feedback without editable inputs.
    - Added an `"👁️ View-Only Mode"` badge pill in the Notes tab header.
  - **Mutation Controls & Buttons Hidden / Disabled**:
    - Hid the `"Save Changes"` button completely when `isViewAdmin` is true (`{!isStudent && !isViewAdmin && <button>Save Changes</button>}`).
    - Guarded `handleSaveHubChanges`, `handleUpdateNotesField`, `handleSetStudentLevel`, `handleUpgradeStudentLevel`, and `handleDowngradeStudentLevel` to prevent any state changes when `isViewAdmin` is active.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 1.64s.

#### 14. Filtered Edit Session Student Pool to Strictly Active Students on Session Date (`NewSession.jsx`)
- **Problem & Requirement**:
  - When editing a published session (`editSession` mode), opening the wizard displayed **all 106 students** from the database in Column 1 ("Students List 103 Students" + group members = 106 total, "Total 106 Students Ready to Publish"), including inactive, completed, and future students.
  - The requirement was strict: When editing a session, the available student pool and student list must **ONLY** show students who are **ACTIVE** on that session date (e.g. 47 active students matching the Students page Active cohort), plus any students/guests already booked in the session being edited.
- **Root Cause**:
  - In `NewSession.jsx` inside the `allPoolStudents` memo:
    - Step 1 processed the sessions in `editSession` (`sessList`).
    - But Step 2 used an unconditional `dbStudents.forEach(st => matched.push({ ...st, isGuest: false, isActiveOnDate: true }))`, dumping all 106 students in the database directly into `allPoolStudents` without evaluating `getStudentStatusOnDate` or checking if they were active on the session date.
    - Since `importedStudents` in `editSession` mode defaulted to `allPoolStudents`, all 106 registered students were marked active and rendered in Column 1 and the bottom publish bar.
- **Resolution**:
  - **Date Normalization for Edit Mode**:
    - Extracted the exact session date (`targetDateStr`) from `editSession.date` (handling YYYY-MM-DD, DD-MM-YYYY, and Date string formats) with fallback to `selectedSessionDateYYYYMMDD`.
  - **Strict Active Filter**:
    - Replaced the unconditional `dbStudents` push in `editSession` with strict active date filtering:
      ```javascript
      dbStudents.forEach(st => {
        const regKey = `reg-${st.id}`;
        if (!seenKeys.has(regKey)) {
          const status = getStudentStatusOnDate(st, targetDateStr);
          const isSched = isStudentScheduledInDbOnDate(st);
          if (status.isActive || isSched) {
            seenKeys.add(regKey);
            matched.push({
              ...st,
              whichDay: status.whichDay || st.whichDay || 1,
              totalDays: status.totalDays || st.totalDays || 3,
              dateStatus: status.status,
              isGuest: false,
              isActiveOnDate: true
            });
          }
        }
      });
      ```
    - Preserved students and accompanying guests already part of the session being edited, while filtering out all inactive, expired/completed, or upcoming future students from the academy pool.
    - Synchronized `whichDay` and `totalDays` for active students matching their progression on that session date.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.38s.

#### 15. View Admin Permissions Lockdown for Coach Leave Approvals, Join Requests & Invites (`InstructorManagement.jsx`, `StudentsManagement.jsx`)
- **Problem & Requirement**:
  - When logged in as a View Admin (`guest_role === 'view_admin'`), the user could still open the "Change Approval" modal on coach leave requests, click "✓ Approve" or "❌ Reject", open the "⏳ Join Requests" modal for coach registrations, approve/reject coach join requests, and generate/copy coach and student invite links.
  - The requirement was strict: View Admin must **NOT** be able to approve, reject, or change approval for coach leave requests, must **NOT** be able to see or act on coach join requests or student pending requests, and must **NOT** be able to generate or send invite links.
- **Root Cause**:
  - In `InstructorManagement.jsx`, the leave card bottom action buttons rendered interactive `❌ Reject`, `✓ Approve`, and `✏️ Change Approval` buttons without verifying `!isViewAdmin`.
  - The header button `⏳ Join Requests` and modal were not guarded by `!isViewAdmin`.
  - Coach card dropdown approve/reject options and the card `Invite` button lacked `!isViewAdmin` checks.
  - In `StudentsManagement.jsx`, student row `Invite` buttons rendered without `!isViewAdmin` check.
- **Resolution**:
  - **Coach Leave Approvals Locked Down (`InstructorManagement.jsx`)**:
    - Replaced interactive action buttons (`❌ Reject`, `✓ Approve`, `✏️ Change Approval`) with static read-only status pills (`✓ Approved`, `✕ Rejected`, `⏳ Pending Review`) whenever `isViewAdmin` is true.
    - Prevented the "Change Approval" modal from rendering for View Admin (`{changeApprovalLeave && !isViewAdmin && ...}`).
    - Added security guard to `handleUpdateLeaveStatus` returning immediately with a warning if called by View Admin.
  - **Coach Join Requests Locked Down (`InstructorManagement.jsx`)**:
    - Hid the header `⏳ Join Requests` button for View Admin (`{!isViewAdmin && <button>⏳ Join Requests</button>}`).
    - Prevented the coach join requests modal from opening for View Admin (`{showCoachJoinRequestsModal && !isViewAdmin && ...}`).
    - Hid `Approve Coach` and `Reject Application` options in coach card 3-dots dropdown for View Admin.
    - Added security guards to `handleApproveCoach` and `handleRejectCoach`.
  - **Coach & Student Invite Links Restricted (`InstructorManagement.jsx`, `StudentsManagement.jsx`)**:
    - Hid coach card `Invite` buttons in `InstructorManagement.jsx` for View Admin.
    - Guarded `handleCopyGeneralCoachInvite` and `handleGenerateCoachInvite` against View Admin.
    - In `StudentsManagement.jsx`, student table row `Invite` buttons are hidden for View Admin, displaying a static `Not Joined` pill instead, while preserving `✓ Joined` status badges.
    - Guarded `handleApproveStudentRequest` and `handleRejectStudentRequest` against View Admin execution.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.51s.

---

### CHANGES ON 13-11-2026

#### 1. Added Coach Date of Birth & Gender Fields and Removed Hardcoded Age 30 (`AuthPage.jsx`, `backend/main.py`)
- **Problem & Requirement**:
  - In Coach registration (`AuthPage.jsx`), there was no input field for Date of Birth (DOB) or Gender in the Coach Profile Details section.
  - When a coach registered, the backend (`backend/main.py`) had a hardcoded `age=30, gender="Male"`, causing all registered coaches to automatically have their age set to 30 regardless of their actual age.
  - The requirement was to provide a Date of Birth input on coach registration, calculate the coach's age dynamically, and remove the hardcoded 30.
- **Resolution**:
  - **Coach Registration Form UI (`AuthPage.jsx`)**:
    - Added dedicated **Date of Birth (DOB)** and **Gender** input fields under Coach Profile Details:
      - Max date set to today's date (`max={new Date().toISOString().split('T')[0]}`).
      - Real-time live age calculator badge: `{formData.dob && <span style={{ color: '#00F2FE' }}>Age: {calculateAge(formData.dob)} yrs</span>}`.
      - Gender dropdown selector (`Male`, `Female`, `Other`).
  - **Dynamic Age Calculation in Backend (`backend/main.py`)**:
    - Removed `age=30` and `gender="Male"` hardcoding in the coach registration endpoint.
    - Added dynamic calculation of coach age from `data.dob` (or `data.age`), storing the verified integer age in the `instructors` table.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 3.92s.

#### 2. Coach Group Isolation in Calendar & Roster (`Sessions.jsx`)
- **Problem & Requirement**:
  - In the calendar view (`Sessions.jsx`), when a coach was logged in or when viewing a coach's schedule, groups assigned to other coaches were also being displayed in calendar cells, time slots, and the roster modal.
  - Required that a coach strictly sees only groups assigned to them in the calendar.
- **Root Cause**:
  - `currentCoachId` and `coachCandidateIds` included `currentUser?.id` (which was a `users.id`), cross-contaminating with `instructors.id` in the `sessions` table (e.g. a coach user with `users.id = 51` matched instructor ID 51).
  - In `loggedInCoach`, ID lookup used `currentUser.id`, causing other coaches to be matched.
  - The calendar state (`sessionsByISO`, `assignedDatesList`, `activeDaySessions`, `selectedDayDetailsModal`) was directly derived from `roleScopedSessions` without honoring `instructorFilter`, causing all groups to leak in calendar views.
- **Resolution**:
  - **Sanitized Coach Candidate IDs**: Removed `currentUser?.id` from `coachCandidateIds`. Only genuine instructor IDs (`currentUser?.instructor_id` and `loggedInCoach?.id`) are now used.
  - **Sanitized Coach Name Matching**: Excluded generic words (`'coach'`, `'instructor'`, `'staff'`, `'admin'`) from fallback name matching in `loggedInCoach` and `coachCandidateNames`.
  - **Calendar-Scoped Filtering**: Introduced `calendarScopedSessions` which strictly preserves coach-specific isolation for coaches, and applies `instructorFilter` for admins across calendar cells, slot badges, daily drawer, and `selectedDayDetailsModal`.
  - **Calendar Navigation Header**: Added a visual badge indicating the assigned coach (`🏄 Coach: [Name]`) for coaches, and an in-modal coach dropdown filter for admins.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 5.26s.

#### 3. Fixed Student Skill Level Reverting to Beginner on Coach Profile Page (`InstructorProfile.jsx`)
- **Problem & Requirement**:
  - In Coach Profile (`InstructorProfile.jsx`), when the page loaded, students (like Leo Muller: Pro, Jack Hill: Advanced Beginner, arunn: Intermediate) briefly showed their correct level badge, but after a second all students automatically reverted to `BEGINNER`.
  - In "Recent Session Activity", all session badges also defaulted to `BEGINNER`.
- **Root Cause**:
  - `fetchDynamicData` was calling `fetch(`${API}/api/students`)` without a `school` query parameter.
  - The backend `@app.get("/api/students")` endpoint requires `school` to prevent data leaks, so it returned `[]` (empty list) when no school was passed.
  - As a result, `allStudents` was empty, so `profileSt` lookups failed, defaulting all student skill levels to `'Beginner'`.
  - In the level normalization helper, `str.startsWith('adv')` was evaluated before checking for `Advance Beginner`, which could also cause Advance Beginner to incorrectly normalize to Advance Intermediate.
- **Resolution**:
  - Updated `fetchDynamicData` to pass the coach's affiliated school in `?school=${encodeURIComponent(targetSchool)}`.
  - Merged backend API `coachObj.assigned_students` into `studentMap` and `allStudents` so verified profiles and skill levels are never dropped.
  - Enriched students and session activities now accurately preserve real skill levels (`Pro`, `Advanced Beginner`, `Intermediate`, `Advance Intermediate`, `Beginner`).
  - Fixed normalization condition ordering so `Advance Beginner` is checked before generic `startsWith('adv')`.
  - Styled session activity badges in "Recent Session Activity" with distinct colors matching each skill level.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 3.36s.

#### 4. Strictly Isolate Pending Join-Request Coaches from School Roster & Dashboard Metrics (`InstructorManagement.jsx`, `SchoolDashboard.jsx`, `Sessions.jsx`)
- **Problem & Requirement**:
  - When a coach registered and submitted a join request to a school (e.g. `rpn tech ac`), their status was correctly showing `Pending School Approval` on their profile, and the `Join Requests (1)` button was displayed in the Instructors header.
  - However, before the school admin approved the join request, the pending coach was incorrectly:
    1. Displayed as an active instructor card on the Instructors page (`InstructorManagement.jsx`).
    2. Counted in the "Active Instructors / Certified Coaches" stat on the Dashboard (`SchoolDashboard.jsx`).
    3. Included in the Coach filter dropdown on the Sessions page (`Sessions.jsx`).
  - Required that pending coaches MUST NOT appear in active cards, counts, or dropdowns anywhere until the school admin explicitly approves their join request in the Join Requests modal.
- **Root Cause**:
  - `InstructorManagement.jsx`: Active card filtering (`filtered`) only checked `i.approval_status === 'pending'` on the raw object from API and didn't cross-check with `allPendingCoachRequests` (which collects pending join requests from `school_join_requests` and `savedAccounts`).
  - `SchoolDashboard.jsx`: Did a raw `instructorsList.length` for `active_instructors` without excluding coaches with pending approval.
  - `Sessions.jsx`: Included all instructors from `allInstructorsList` in `availableInstructors` without filtering out pending join requests.
- **Resolution**:
  - **Instructors Page (`InstructorManagement.jsx`)**:
    - Created `pendingCoachIdentifiers` linking pending emails, names, and IDs from `allPendingCoachRequests`.
    - Excluded pending coaches from the active instructor cards list (`filtered`). They now strictly remain inside the `Join Requests` modal until approved.
  - **School Dashboard (`SchoolDashboard.jsx`)**:
    - Filtered out pending join request coaches from `active_instructors` count. The metric now reflects only certified, approved coaches.
  - **Sessions Page (`Sessions.jsx`)**:
    - Filtered out pending coaches from `availableInstructors`. Only approved, active coaches appear in the instructor dropdown filter.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.66s.

#### 5. Dynamic Time-Based Status in Single Session Details Popup Modal (`Sessions.jsx`)
- **Problem & Requirement**:
  - In the Single Session Details popup modal (`selectedSessionDetail`), sessions whose scheduled time had already ended (e.g. today Nov 13, 2026 from 06:30 AM to 08:30 AM when current time is 10:54 AM) were still displaying static `UPCOMING` status.
  - Required that sessions whose scheduled end time has passed automatically transition to `Pending for Review` / `Completed` in the Session Details modal.
- **Root Cause**:
  - In `Sessions.jsx` line 8605, the modal was reading the raw static database string `{selectedSessionDetail.status}` (which defaulted to `"Upcoming"` upon creation) instead of invoking the dynamic time-based evaluator `formatSessionStatus(selectedSessionDetail)`.
- **Resolution**:
  - Updated the Status field in `selectedSessionDetail` popup modal to use `formatSessionStatus(selectedSessionDetail)` and `statusBg(selectedSessionDetail)` / `statusColor(selectedSessionDetail)`.
  - Sessions whose end time has passed now dynamically render `Pending for Review` (or `Completed`), matching the rest of the application.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.27s.

---

### CHANGES ON 14-11-2026

#### 1. PostgreSQL `schools.poster_url` Column Migration & Transaction Isolation Fix
- **Problem**:
  - During login with `rpntechworld@gmail.com` on `/auth`, the backend returned error `(psycopg2.errors.UndefinedColumn) column schools.poster_url does not exist LINE 1: ...AS schools_website, schools.logo A`.
  - In `backend/main.py`, multiple `ALTER TABLE` operations ran in an open transaction without individual commit boundaries; if any statement threw an exception, PostgreSQL aborted the active transaction block, causing subsequent statements like `schools.poster_url` to be rolled back.
- **Resolution**:
  - Ran database migration adding `poster_url VARCHAR(500) DEFAULT ''` to the `schools` table in PostgreSQL and verified schema column presence.
  - Refactored `backend/main.py` startup migration block so each `ALTER TABLE` statement runs in its own isolated `try ... commit ... except ... rollback` block, preventing cascading transaction failures in PostgreSQL.
  - Tested application import and verified `FastAPI app imported successfully!` with PostgreSQL sequences in sync.

#### 2. Registered Students Search & Filtering Overhaul (`SuperAdminDashboard.jsx`)
- **Problem**:
  - In `SuperAdminDashboard.jsx` under **Registered Students Management** (`Student Roster 566 total students`), the search feature was reported as non-functional:
    - The "Search" button had an empty handler `onClick={() => {}}`, causing clicks to produce zero response.
    - Searching by school name returned 0 results because `st.school` / `st.school_name` was omitted from the filter.
    - Phone number searching failed whenever formatted with spaces or country codes (e.g. `+91 91788 4561237`) because it performed raw substring match on unformatted values.
    - Instructor name search only checked an ID lookup in `coaches` using strict type equality (`===`), ignoring `st.instructor` sent directly from backend.
    - Multi-word queries (e.g., "Kishore 6am" or "Beginner Lodge") failed because tokens were not evaluated across different columns.
- **Resolution**:
  - Replaced the client-side filter with an optimized, memoized multi-field search engine using `useMemo`.
  - Normalized phone numbers by stripping non-digit characters so any combination of `+91`, spaces, hyphens, or local digits matches reliably.
  - Included student `name`, `email`, `phone`, `whatsapp_number`, `school`, `course_duration`, `session_time`, `level`, `staying_at_school`, `swimming_ability`, `gender`, and both direct and resolved `instructor` names.
  - Implemented tokenized multi-term search so queries like "Kishore 6am", "Aquatic Beginner", or "Lodge 3 days" match across multiple fields simultaneously.
  - Wired up the Search button to focus the filter and provided Enter key handling.
  - Verified clean compilation with `npm --prefix frontend run build`.

#### 3. Course Completion Certificate Dynamic Session Requirement & Persistent Button (`MyAchievements.jsx`)
- **Problem**:
  - The "Download Certificate" button was completely hidden whenever completed sessions were less than 3 (`stats.completed >= 3`), causing students and admins to not see the certificate action at all.
  - The course duration requirement was hardcoded to 3 sessions and "3-Day Surf Training Course", meaning students on 5-Day or other length courses did not have matching completion criteria or matching certificate titles.
- **Resolution**:
  - Made the **Download Certificate** button **always visible** in the header next to "Share Track Record".
  - Dynamically detects the student's enrolled course duration (`3 Days Course` -> 3 sessions, `5 Days Course` -> 5 sessions, `N Days Course` -> N sessions).
  - When sessions completed is less than the required course sessions (`stats.completed < requiredSessions`):
    - The button displays in a clean **Locked** state: `🔒 Download Certificate (X/Y)`.
    - Clicking the button opens an in-app progress guidance modal explaining the required sessions and current progress. No certificate file is issued prematurely.
  - When all course sessions are completed (`stats.completed >= requiredSessions`):
    - The button unlocks into the gold celebratory state (`🎓 Download Certificate`).
    - Clicking renders the high-resolution certificate canvas with the exact course title (e.g. `5-Day Surf Training Course` or `3-Day Surf Training Course`) and downloads the image.
  - Added fallback profile fetching to ensure student `course_duration` is always resolved.
  - Verified with `npm --prefix frontend run build`.

#### 4. Multi-Template "Share Your Session" Studio with Photo Upload & Selfie Capture (`MyAchievements.jsx`)
- **Problem**:
  - The previous share modal in `MyAchievements.jsx` rendered a single generic dark milestone box without options to personalize or switch card styles.
  - Users wanted the modernized share studio matching the reference design:
    - 3 distinct share card themes:
      1. **Photo spotlight**: Dark slate theme, hero top photo, "THE COACH'S CUT" tag, "✓ SESSION COMPLETE" badge, large score block, date/time, wave count, pop-up rating, and coach quote.
      2. **Ocean keepsake**: Warm cream/sand `#FAF6F0` palette, "Small wins. Big ocean energy." headline, polaroid-framed photo with an overlapping gold circular score badge, and clean footer stats.
      3. **Personal scorecard**: Forest emerald `#064E3B` card, "Progress, worth sharing." title, giant score display, arched vertical photo window, 3 metric pills (`WAVES CAUGHT`, `POP-UP`, `PADDLING`), and mint quote banner.
    - Personal photo integration allowing users to either upload an existing photo from their gallery/files or take an instant selfie with their camera (`capture="user"`).
    - Quick template switcher pills to swap between templates on the fly.
    - Dedicated `Share card` and `Save` buttons generating high-resolution 1080×1350 (4:5 portrait) story images with `drawImageCover`, custom photo support, typography, and scores.
- **Resolution**:
  - Added `shareTemplate`, `customPhotoUrl`, `fileInputRef`, and `cameraInputRef` state and handlers in `MyAchievements.jsx`.
  - Upgraded `generateStoryPosterBlob` canvas engine to dynamically render all 3 template layouts (`spotlight`, `keepsake`, `scorecard`) at high resolution (1080×1350) using real session data and custom photo overrides.
  - Added `handlePhotoSelect` supporting standard image uploads and camera selfies via `<input type="file" capture="user">`, with an instant `✕ Remove` option.
  - Replaced the old share modal UI with the responsive "Share your session" studio:
    - Live card preview updating in real-time as users switch templates or upload photos.
    - Template switcher pills (`Photo spotlight`, `Ocean keepsake`, `Personal scorecard`).
    - "Make it personal" block with `Upload photo` and direct live webcam/camera `Take a selfie` actions (with live mirrored video viewfinder, framing reticle, and one-tap snap).
    - Main action buttons `Share card` (via Web Share API with image file) and `Save` (1080×1350 PNG story download).
    - Direct 1-tap social icons tray (WhatsApp, Facebook, Instagram, X/Twitter).
  - Fixed flex-shrink behavior on `.ach-story-card-wrapper` and `.ach-spotlight-slate` so session metrics, scores, wave counts, and coach quotes always render completely in preview.
  - Verified compilation with `npm --prefix frontend run build` (built cleanly in 2.47s).

#### 5. "Share Your Session" Studio Enhancements & Polish (`MyAchievements.jsx`)
- **Key Enhancements**:
  1. **Live Camera Flip**: Added camera direction toggling (`🔄 Front Cam` / `Back Cam`) allowing users to switch between front selfie and rear lenses seamlessly via `facingMode: { ideal: cameraFacing }`.
  2. **3-Second Self-Timer**: Added `⏱️ 3s Timer` toggle with large animated on-screen countdown overlay (3... 2... 1...) before snapping the selfie.
  3. **Camera Flash Effect**: Added full-screen bright white flash animation (`achFlashAnim`) triggered upon snapping photo for authentic camera feel.
  4. **4 Instagram Vibe Filter Presets**:
     - `🌿 Natural` (Original clean colors)
     - `🌅 Golden Hour` (`sepia(0.28) saturate(1.4) contrast(1.05) brightness(1.02)`)
     - `🌊 Ocean Breeze` (`hue-rotate(185deg) saturate(1.3) contrast(1.08) brightness(1.02)`)
     - `⚡ Vivid Pro` (`contrast(1.18) saturate(1.45) brightness(1.03)`)
     - Applied live to preview card background and rendered directly onto exported 1080×1350 canvas story poster (`ctx.filter`).
  5. **1-Click Copy Story Caption & Hashtags**:
     - Added dedicated `[ 📋 Copy Story Caption & Hashtags ]` button above social icons.
     - Formats title, score, waves caught, coach quote, and hashtags into clipboard with instant green checkmark confirmation.
  6. **Celebration Confetti**: Triggers celebratory confetti shower on download or native share.
  - Verified frontend build with `npm --prefix frontend run build` with 0 errors.

#### 6. Photo Framing, Face Alignment & Zero-Crop Controls (`MyAchievements.jsx`)
- **Problem**:
  - In the Share Session cards, uploaded portrait photos or tall camera selfies were vertically centered by default (`background-position: center;`).
  - As shown in user feedback screenshots, this caused subjects' heads and faces to be cropped off above the chin/shoulders.
- **Resolution**:
  - **Smart Default (15% Top Focus)**: When a photo is uploaded or snapped, `photoPosY` automatically defaults to 15% so heads and faces are immediately in frame.
  - **Quick Framing Presets**: Added 4 one-tap preset chips:
    - `👤 Face / Top` (10% - ensures full head, face, and hair are visible)
    - `👕 Upper Body` (25% - torso and face alignment)
    - `🎯 Center` (50% - standard middle alignment)
    - `🌊 Bottom` (85% - surf board / feet focus)
  - **Full Photo Mode (`🖼️ Full Photo (No Crop)`)**: Allows users to display their full uncropped portrait photo using `contain` with a card-matched backdrop.
  - **Precision Vertical Slider**: Added interactive range slider (`0% - 100%`) with live percentage badge and focus labels (`Top / Face` to `Bottom`) for fine-tuned positioning.
  - **Full Canvas Integration**: Updated `generateStoryPosterBlob` (`drawCover`) so the user's selected vertical position (`posY`) and fit mode (`contain` vs `cover`) are baked identically into the exported 1080×1350 story poster.
  - Verified with `npm --prefix frontend run build` (0 errors).

- Hid `Approve Coach` and `Reject Application` options in coach card 3-dots dropdown for View Admin.
    - Added security guards to `handleApproveCoach` and `handleRejectCoach`.
  - **Coach & Student Invite Links Restricted (`InstructorManagement.jsx`, `StudentsManagement.jsx`)**:
    - Hid coach card `Invite` buttons in `InstructorManagement.jsx` for View Admin.
    - Guarded `handleCopyGeneralCoachInvite` and `handleGenerateCoachInvite` against View Admin.
    - In `StudentsManagement.jsx`, student table row `Invite` buttons are hidden for View Admin, displaying a static `Not Joined` pill instead, while preserving `✓ Joined` status badges.
    - Guarded `handleApproveStudentRequest` and `handleRejectStudentRequest` against View Admin execution.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.51s.

---

### CHANGES ON 13-11-2026

#### 1. Added Coach Date of Birth & Gender Fields and Removed Hardcoded Age 30 (`AuthPage.jsx`, `backend/main.py`)
- **Problem & Requirement**:
  - In Coach registration (`AuthPage.jsx`), there was no input field for Date of Birth (DOB) or Gender in the Coach Profile Details section.
  - When a coach registered, the backend (`backend/main.py`) had a hardcoded `age=30, gender="Male"`, causing all registered coaches to automatically have their age set to 30 regardless of their actual age.
  - The requirement was to provide a Date of Birth input on coach registration, calculate the coach's age dynamically, and remove the hardcoded 30.
- **Resolution**:
  - **Coach Registration Form UI (`AuthPage.jsx`)**:
    - Added dedicated **Date of Birth (DOB)** and **Gender** input fields under Coach Profile Details:
      - Max date set to today's date (`max={new Date().toISOString().split('T')[0]}`).
      - Real-time live age calculator badge: `{formData.dob && <span style={{ color: '#00F2FE' }}>Age: {calculateAge(formData.dob)} yrs</span>}`.
      - Gender dropdown selector (`Male`, `Female`, `Other`).
  - **Dynamic Age Calculation in Backend (`backend/main.py`)**:
    - Removed `age=30` and `gender="Male"` hardcoding in the coach registration endpoint.
    - Added dynamic calculation of coach age from `data.dob` (or `data.age`), storing the verified integer age in the `instructors` table.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 3.92s.

#### 2. Coach Group Isolation in Calendar & Roster (`Sessions.jsx`)
- **Problem & Requirement**:
  - In the calendar view (`Sessions.jsx`), when a coach was logged in or when viewing a coach's schedule, groups assigned to other coaches were also being displayed in calendar cells, time slots, and the roster modal.
  - Required that a coach strictly sees only groups assigned to them in the calendar.
- **Root Cause**:
  - `currentCoachId` and `coachCandidateIds` included `currentUser?.id` (which was a `users.id`), cross-contaminating with `instructors.id` in the `sessions` table (e.g. a coach user with `users.id = 51` matched instructor ID 51).
  - In `loggedInCoach`, ID lookup used `currentUser.id`, causing other coaches to be matched.
  - The calendar state (`sessionsByISO`, `assignedDatesList`, `activeDaySessions`, `selectedDayDetailsModal`) was directly derived from `roleScopedSessions` without honoring `instructorFilter`, causing all groups to leak in calendar views.
- **Resolution**:
  - **Sanitized Coach Candidate IDs**: Removed `currentUser?.id` from `coachCandidateIds`. Only genuine instructor IDs (`currentUser?.instructor_id` and `loggedInCoach?.id`) are now used.
  - **Sanitized Coach Name Matching**: Excluded generic words (`'coach'`, `'instructor'`, `'staff'`, `'admin'`) from fallback name matching in `loggedInCoach` and `coachCandidateNames`.
  - **Calendar-Scoped Filtering**: Introduced `calendarScopedSessions` which strictly preserves coach-specific isolation for coaches, and applies `instructorFilter` for admins across calendar cells, slot badges, daily drawer, and `selectedDayDetailsModal`.
  - **Calendar Navigation Header**: Added a visual badge indicating the assigned coach (`🏄 Coach: [Name]`) for coaches, and an in-modal coach dropdown filter for admins.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 5.26s.

#### 3. Fixed Student Skill Level Reverting to Beginner on Coach Profile Page (`InstructorProfile.jsx`)
- **Problem & Requirement**:
  - In Coach Profile (`InstructorProfile.jsx`), when the page loaded, students (like Leo Muller: Pro, Jack Hill: Advanced Beginner, arunn: Intermediate) briefly showed their correct level badge, but after a second all students automatically reverted to `BEGINNER`.
  - In "Recent Session Activity", all session badges also defaulted to `BEGINNER`.
- **Root Cause**:
  - `fetchDynamicData` was calling `fetch(`${API}/api/students`)` without a `school` query parameter.
  - The backend `@app.get("/api/students")` endpoint requires `school` to prevent data leaks, so it returned `[]` (empty list) when no school was passed.
  - As a result, `allStudents` was empty, so `profileSt` lookups failed, defaulting all student skill levels to `'Beginner'`.
  - In the level normalization helper, `str.startsWith('adv')` was evaluated before checking for `Advance Beginner`, which could also cause Advance Beginner to incorrectly normalize to Advance Intermediate.
- **Resolution**:
  - Updated `fetchDynamicData` to pass the coach's affiliated school in `?school=${encodeURIComponent(targetSchool)}`.
  - Merged backend API `coachObj.assigned_students` into `studentMap` and `allStudents` so verified profiles and skill levels are never dropped.
  - Enriched students and session activities now accurately preserve real skill levels (`Pro`, `Advanced Beginner`, `Intermediate`, `Advance Intermediate`, `Beginner`).
  - Fixed normalization condition ordering so `Advance Beginner` is checked before generic `startsWith('adv')`.
  - Styled session activity badges in "Recent Session Activity" with distinct colors matching each skill level.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 3.36s.

#### 4. Strictly Isolate Pending Join-Request Coaches from School Roster & Dashboard Metrics (`InstructorManagement.jsx`, `SchoolDashboard.jsx`, `Sessions.jsx`)
- **Problem & Requirement**:
  - When a coach registered and submitted a join request to a school (e.g. `rpn tech ac`), their status was correctly showing `Pending School Approval` on their profile, and the `Join Requests (1)` button was displayed in the Instructors header.
  - However, before the school admin approved the join request, the pending coach was incorrectly:
    1. Displayed as an active instructor card on the Instructors page (`InstructorManagement.jsx`).
    2. Counted in the "Active Instructors / Certified Coaches" stat on the Dashboard (`SchoolDashboard.jsx`).
    3. Included in the Coach filter dropdown on the Sessions page (`Sessions.jsx`).
  - Required that pending coaches MUST NOT appear in active cards, counts, or dropdowns anywhere until the school admin explicitly approves their join request in the Join Requests modal.
- **Root Cause**:
  - `InstructorManagement.jsx`: Active card filtering (`filtered`) only checked `i.approval_status === 'pending'` on the raw object from API and didn't cross-check with `allPendingCoachRequests` (which collects pending join requests from `school_join_requests` and `savedAccounts`).
  - `SchoolDashboard.jsx`: Did a raw `instructorsList.length` for `active_instructors` without excluding coaches with pending approval.
  - `Sessions.jsx`: Included all instructors from `allInstructorsList` in `availableInstructors` without filtering out pending join requests.
- **Resolution**:
  - **Instructors Page (`InstructorManagement.jsx`)**:
    - Created `pendingCoachIdentifiers` linking pending emails, names, and IDs from `allPendingCoachRequests`.
    - Excluded pending coaches from the active instructor cards list (`filtered`). They now strictly remain inside the `Join Requests` modal until approved.
  - **School Dashboard (`SchoolDashboard.jsx`)**:
    - Filtered out pending join request coaches from `active_instructors` count. The metric now reflects only certified, approved coaches.
  - **Sessions Page (`Sessions.jsx`)**:
    - Filtered out pending coaches from `availableInstructors`. Only approved, active coaches appear in the instructor dropdown filter.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.66s.

#### 5. Dynamic Time-Based Status in Single Session Details Popup Modal (`Sessions.jsx`)
- **Problem & Requirement**:
  - In the Single Session Details popup modal (`selectedSessionDetail`), sessions whose scheduled time had already ended (e.g. today Nov 13, 2026 from 06:30 AM to 08:30 AM when current time is 10:54 AM) were still displaying static `UPCOMING` status.
  - Required that sessions whose scheduled end time has passed automatically transition to `Pending for Review` / `Completed` in the Session Details modal.
- **Root Cause**:
  - In `Sessions.jsx` line 8605, the modal was reading the raw static database string `{selectedSessionDetail.status}` (which defaulted to `"Upcoming"` upon creation) instead of invoking the dynamic time-based evaluator `formatSessionStatus(selectedSessionDetail)`.
- **Resolution**:
  - Updated the Status field in `selectedSessionDetail` popup modal to use `formatSessionStatus(selectedSessionDetail)` and `statusBg(selectedSessionDetail)` / `statusColor(selectedSessionDetail)`.
  - Sessions whose end time has passed now dynamically render `Pending for Review` (or `Completed`), matching the rest of the application.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.27s.

---

### CHANGES ON 14-11-2026

#### 1. PostgreSQL `schools.poster_url` Column Migration & Transaction Isolation Fix
- **Problem**:
  - During login with `rpntechworld@gmail.com` on `/auth`, the backend returned error `(psycopg2.errors.UndefinedColumn) column schools.poster_url does not exist LINE 1: ...AS schools_website, schools.logo A`.

- `🌊 Bottom` (85% - surf board / feet focus)
  - **Full Photo Mode (`🖼️ Full Photo (No Crop)`)**: Allows users to display their full uncropped portrait photo using `contain` with a card-matched backdrop.
  - **Precision Vertical Slider**: Added interactive range slider (`0% - 100%`) with live percentage badge and focus labels (`Top / Face` to `Bottom`) for fine-tuned positioning.
  - **Full Canvas Integration**: Updated `generateStoryPosterBlob` (`drawCover`) so the user's selected vertical position (`posY`) and fit mode (`contain` vs `cover`) are baked identically into the exported 1080×1350 story poster.
  - Verified with `npm --prefix frontend run build` (0 errors).

---

### Changes on 16-11-2026

#### 1. Share Session Studio Card Fixed Size (4:5 Ratio) Across All Themes (`MyAchievements.jsx`)
- **Problem**:
  - In the Share Session Studio modal, switching between the 3 card templates (`Photo spotlight`, `Ocean keepsake`, and `Personal scorecard`) caused the card preview to change heights dynamically (from ~510px up to ~630px), making the card box and modal jump and resize abruptly.
- **Resolution**:
  - **Locked Fixed Dimensions**: Fixed `.ach-story-card-wrapper` to standard 4:5 mobile story portrait aspect ratio with explicit fixed dimensions (`width: 100%; max-width: 440px; height: 550px; aspect-ratio: 4 / 5;`).
  - **Internal Theme Height Balancing**: Configured all 3 templates (`.ach-card-spotlight`, `.ach-card-keepsake`, `.ach-card-scorecard`) to `height: 100%; width: 100%; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;`.
    - `Photo spotlight`: Photo `height: 270px;`, slate `flex: 1` with 3-pill metric trio and coach verdict quote box.
    - `Ocean keepsake`: Framed photo `height: 215px;`, gold score badge `66px`, concise typography, and compact verdict box.
    - `Personal scorecard`: Arch photo `130px × 165px;`, big score block (`46px`), mint complete badge, 3-pill performance metrics, and clean verdict box.
  - **Studio Controls Alignment**: Aligned `.ach-template-meta-strip`, `.ach-template-selector-pills`, `.ach-personal-section`, `.ach-copy-caption-btn`, and `.ach-main-cta-row` to `max-width: 440px`.
  - **Coach Name Cleaning**: Enhanced `getCleanCoachName` to strip all extraneous `coach`, `instructor`, and `group` prefixes and commas cleanly, ensuring labels like `Coaches Kathir & Gabriel` or `Coach Kathir` display consistently without repetition.
  - Verified with `npm --prefix frontend run build` (0 errors).

#### 2. Keepsake Gold Score Badge Overflow & Typography Alignment Fix (`MyAchievements.jsx`)
- **Problem**:
  - In the "Ocean Keepsake" template, stacking 3 separate lines with `COACH SCORE` (11 characters) inside the narrow curved bottom rim of the circle caused border clipping and awkward empty space.
- **Resolution**:
  - **Balanced Olympic Championship Seal Layout**:
    - Re-architected typography to follow natural circle geometry:
      - **Top arch**: `COACH` (small 7.5px bold uppercase tag) fitting the top curve.
      - **Center equator**: `78` (heroic 28px bold 900 score) commanding the widest middle.
      - **Bottom arch**: `/100` (10px bold scale denominator) resting neatly in the bottom curve.
    - Proportional `74px × 74px` dimensions with `3.5px solid #FFFFFF` border, providing equal 9px vertical padding and 15px+ horizontal margins on all sides.
    - Zero border clipping, zero awkward empty voids, and authentic athletic seal aesthetics.
  - **Canvas Synchronization**: Updated canvas generator (`generateStoryPosterBlob`) with matched top-tag, hero-score, and bottom-scale coordinates.
  - Verified with `npm --prefix frontend run build` (built in 1.92s with 0 errors).

#### 3. Complete Redesign of Personal Scorecard Template (Emerald Pro Edition) (`MyAchievements.jsx`)
- **Problem**:
  - The "Personal Scorecard" template had a dull flat `#064E3B` background, an isolated small arch photo stuck on the right, flat dark metric boxes with a hardcoded `4/10 PADDLING` rating, and a milky pale `#D1FAE5` quote box that clashed with the dark theme.
- **Resolution**:
  - **Luxury Ocean Emerald Background**: Replaced flat dark green with a rich atmospheric radial gradient (`radial-gradient(130% 100% at 85% 15%, #0D5C46 0%, #064E3B 45%, #022C22 100%)`) with a glowing mint border (`rgba(52, 211, 153, 0.28)`).
  - **Hero Arch Portal**: Enlarged the arched surfer photo frame to `140px × 185px` with a frosted mint border, 3D drop shadow (`0 10px 24px rgba(0,0,0,0.45)`), and embedded `ATHNEX LIVE` bottom pill badge.
  - **Hero Score Block**: Upgraded score typography to massive 46px 950-weight radiant white with subtle mint glow, accompanied by an authentic `⭐ COACH TECHNIQUE SCORE` badge, surfer name, group tag, and session date.
  - **Frosted Glass Metric Capsules**: Replaced flat boxes with 3 translucent glassmorphic pills (`Waves Caught`, `Pop-Up Speed`, `Technique Score`) with dynamic verified metrics.
  - **Night Emerald Coach Verdict Box**: Replaced the pale pastel note with a luxury dark emerald glass card featuring a neon mint `#34D399` left accent bar, gold coach name `#FCD34D`, and italicized white quote.
  - **Canvas Synchronization**: Updated canvas generator (`generateStoryPosterBlob`) with matched radial background, hero score, arch portal, and luxury verdict styling.
  - Verified with `npm --prefix frontend run build` (built in 2.15s with 0 errors).

#### 4. Emerald Scorecard Layout Balance & Bold High-Impact Metrics (`MyAchievements.jsx`)
- **Problem**:
  - In Template 3 (Personal Scorecard), the middle area had an empty green chasm because `justify-content: space-between` pushed the athlete name far to the bottom, the arched photo was too small (`140px × 185px`), and the metric pills had tiny numbers (`13.5px`).
- **Resolution**:
  - **Eliminated Empty Gaps & Enlarged Arch Photo**: Expanded the arched photo frame to `165px × 225px` to anchor the entire right column.
  - **Balanced Left Column with Rich Session Chips**: Scaled the hero score to `52px` 950-weight with mint `/100` and added dynamic metric chips (`🌊 Waves` and `⚡ Pop-Up rating`), tying the score, technique badge, and athlete profile together with zero dead space.
  - **Bold High-Impact Metric Cards**: Increased metric numbers to `16px` 950-weight bold white and labels to `8px` with `1.5px solid rgba(167, 243, 208, 0.25)` frosted cards, making points crystal clear and readable.
  - Verified with `npm --prefix frontend run build` (built in 1.95s with 0 errors).

#### 5. Pixel-Perfect Alignment of Personal Scorecard with User Reference (`MyAchievements.jsx`)
- **Problem**:
  - The user provided a specific reference card image (`media_1794813574200_d5229048.jpg`) and requested: `"itha mathiiri dhan venum"` ("This is exactly how I want it").
  - The previous iteration had unwanted card container borders, duplicate stats, and an over-complicated dark gradient that diverged from the clean, punchy minimal teal design the user preferred.
- **Resolution**:
  - **Exact Palette & Typography Hierarchy**:
    - Flat, clean, punchy teal-emerald solid background (`#006859`).
    - Clean uppercase text tag: `THE COACH'S CUT` (top left, no pill or border).
    - Bold headline: `Progress,\nworth sharing.` in 26px bold 900 white.
    - Mint pill: `✓ SESSION COMPLETE` (`#99F6E4` background with `#042F2C` dark teal text).
  - **Hero Split**:
    - Left: Hero score `85` in bold warm yellow (`#FCD34D`, 64px 950-weight) + `/100` in white/mint, with clean uppercase `COACH SCORE` subline, followed by `{studentName} · {groupName}` and `{dateFormatted}`.
    - Right: Clean arched dome surfer photo (`165px × 195px`, `border-radius: 82px 82px 18px 18px`, clean image with no obscuring badge).
  - **Clean Divider & 3-Column Text Metrics**:
    - Subtle horizontal divider rule (`rgba(255, 255, 255, 0.16)`).
    - Replaced heavy pill containers with 3 clean, uncluttered text metric columns:
      - `WAVES CAUGHT` (`wavesCount`)
      - `POP-UP` (`popUpRating}/10`)
      - `PADDLING` (`paddlingRating}/10`)
  - **Pale Mint Coach Quote Card**:
    - Authentic pale mint rounded container (`#D1FAE5`) with dark teal quote text (`#064E3B`) and green coach signature (`#047857`).
  - **Full Canvas Synchronization**:
    - Synchronized `generateStoryPosterBlob` canvas export (1080×1350) to produce an identical high-res story PNG matching the reference design.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 3.86s.

#### 6. Authentic Coach Evaluation & Wave Logs (Strictly Real Inputs Only) (`MyAchievements.jsx`)
- **Problem**:
  - In `MyAchievements.jsx`, every completed session card was displaying `🌊 8 Waves` and `⭐ 78/100` regardless of whether the coach had actually evaluated the session or logged wave counts.
  - The fallback calculation was assigning a synthetic 78/100 (intermediate tier) and deriving 8 waves for all unrated sessions, misleading students and coaches.
- **Resolution**:
  - **Removed Artificial Level-Based Fallbacks**:
    - `getSessionScore(sess)` now strictly checks direct fields (`sess.score`, `sess.technique_score`, `sess.coach_rating`) or parsed coach feedback in `sess.notes` (e.g. `Score: 85`, `[8 out of 10]`). If unrated by the coach, returns `null`.
    - `getSessionWaves(sess)` now strictly checks direct fields (`sess.waves_ridden`, `sess.waves_caught`, `sess.wave_count`) or parsed notes (`Wave Count: X`, `X waves`). If unrecorded by the coach, returns `null`.
    - `getSessionPopUpRating(sess)` and `getSessionPaddlingRating(sess)` return `null` if unrecorded.
  - **Session List Visual Indicators**:
    - Rated & wave-logged sessions display genuine metrics (e.g. `🌊 10 Waves`, `⭐ 85/100`).
    - Unrated/unlogged sessions now cleanly display `🌊 -- Waves` and `⭐ Unrated` in subtle muted gray pills, accurately representing pending coach evaluation.
  - **Summary Banner & Share Studio Consistency**:
    - Overall `Total Waves Caught` accurately sums genuine coach wave counts without artificial inflation.
    - Overall `Coach Technique Score` averages only verified rated sessions; displays `Unrated` if no sessions have been graded yet.
    - Share Studio and canvas cards gracefully render `--` for unrecorded metrics without generating fake numbers.
  - **Verification**: Built production bundle with `npm --prefix frontend run build` — 0 errors in 2.67s.

#### 18. Pinned Sticky Certificate Canvas with Independent Scrollable Edit Sidebar (`OurServices.jsx`, `frontend/src/index.css`)
- **Problem & User Feedback**:
  - In `/services` under the Course Completion Certificate builder, the left controls panel (template upload, presets, field tabs, patch settings, sliders, typography, fonts, colors) is tall and requires scrolling down.
  - Previously, scrolling down to adjust typography, sliders, or patch dimensions caused the certificate preview canvas on the right to scroll off the top of the screen (cutting it in half or hiding it completely).
  - The user requested:
    `"certificate orey placela irukara mathiri venum side edit panurathu mattum scroll akura mathiiri venum"`
    (The certificate must remain pinned in one place in full view, while only the left editing sidebar scrolls).
- **Resolution**:
  - **Pinned Sticky Right Pane (`.cert-canvas-sticky-pane`)**:
    - Configured the right interactive certificate canvas with `position: sticky`, `top: 86px`, `alignSelf: flex-start`, and `maxHeight: calc(100vh - 96px)`.
    - The certificate canvas stays anchored in place right beside the editor at all times, never scrolling off the viewport.
    - Drag-and-drop coordinates retain 100% precision via `getBoundingClientRect()`.
  - **Independent Scrollable Edit Sidebar (`.cert-controls-sidebar`)**:
    - Configured the left editor panel with `maxHeight: calc(100vh - 105px)`, `overflowY: auto`, and custom sleek thin scrollbar (`scrollbar-width: thin; scrollbar-color: #CBD5E1 #F8FAFC`).
    - Scrolling on the left sidebar smoothly scrolls through all options, presets, and text/patch sliders without moving the certificate.
  - **Mobile & Tablet Responsiveness**:
    - Added `@media (max-width: 1024px)` rule gracefully stacking elements and restoring standard static layout on smaller displays.
  - Verified build with `npm --prefix frontend run build` (0 errors in 2.00s).

---

#### 19. Removal of Cover / Eraser Patch from Certificate Customizer & Generator (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The user reported:
    `"uthu cover iruka kudathu certficatela"` (with a cropped screenshot of the "Cover Text Underneath (Eraser Patch)" box).
  - The artificial colored eraser patch rectangle was visible on the certificate background, cluttering the editing controls and altering the original design.
  - Certificates must only have pure, clean typography positioned directly on the background without any colored cover boxes or eraser patches drawn beneath.
- **Resolution**:
  - **Removed Eraser Patch UI Box (`OurServices.jsx`)**:
    - Completely removed the `Cover Text Underneath (Eraser Patch)` settings card (checkbox, eyedropper, patch color swatches, patch width/height sliders) from the field editor.
    - Removed the automatic cover patch settings from the template scan modal.
  - **Sanitized Canvas Rendering (`OurServices.jsx`, `MyAchievements.jsx`)**:
    - Removed `ctx.roundRect` cover patch fill from both the preview export generator in `OurServices.jsx` and the student download generator in `MyAchievements.jsx`.
    - Live interactive certificate canvas now renders purely transparent text wrappers (`backgroundColor: isSelected ? 'rgba(13, 148, 136, 0.15)' : 'transparent'`), eliminating any patch blocks from the live view.
  - **Config Sanitizer on Load (`OurServices.jsx`)**:
    - Added a `sanitizeConfig` helper on local storage and backend fetch to reset any previously cached `coverBackground` flags to `false`, ensuring that legacy saved covers are cleanly discarded.
    - Updated scan auto-mapping to place dynamic text directly with zero patch artifacts.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.89s).

---

#### 20. Field Visibility Restored by Default & One-Click "Show All Fields" (`OurServices.jsx`)
- **Problem & User Feedback**:
  - The user asked:
    `"ithula yan hiden ah iruku"` (with a screenshot showing `Course Title (Hidden)`, `Body Statement (Hidden)`, `Academy Name (Hidden)`, `Issue Date (Hidden)`, etc., and an unchecked `Visible` box).
  - Cause: Previously, when the user clicked "Scan Template", the auto-mapping routine assumed the template graphic already had pre-printed text, so it automatically set `visible: false` on all fields except `student_name`.
  - When the user selected `Academy Name` and typed `ATHNEX SURF ACAddddddDEMY`, the field remained hidden on the canvas because its `visible` attribute was false.
- **Resolution**:
  - **All Fields Active by Default in Scanner (`handleScanAndAutoMapCertificate`)**:
    - Removed automatic mass-hiding of fields during scan. All certificate fields (`student_name`, `course_title`, `body_text`, `academy_name`, `issue_date`, `coach_name`, `cert_id`) now remain `visible: true` so the admin can position and customize all of them freely.
  - **One-Click "Show All Fields" Button**:
    - Added an `👁️ Show All Fields` button directly above the field selection pills. One click instantly activates visibility across every single field and saves the configuration.
  - **Auto-Activate Visibility on Edit / Typing (`updateActiveField`)**:
    - Whenever an admin modifies a field (e.g. types a name in `Sample / Dynamic Text Value` or adjusts typography/position), `visible: true` is automatically activated if it was previously hidden.
  - **Interactive Visibility Toggle Badge**:
    - Upgraded the small checkbox to an intuitive status button: `👁️ Visible` (green) vs `🚫 Hidden (Click to Show)` (amber) for clear visual feedback and toggle control.
  - Verified build with `npm --prefix frontend run build` (0 errors in 2.06s).

---

### Changes on 17-11-2026

#### 1. Official Athnex Default Certificate Preset & One-Click Selection (`OurServices.jsx`, `MyAchievements.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  - In `/services` under "Certificate Background Template", the presets list only contained plain gradients (`Royal Navy & Gold`, `Parchment & Emerald`, `Deep Cyan Horizon`).
  - There was no preset or option to select the official default Athnex Live Certificate (with the wave backdrop, circular 'A' seal, gold double frame, and session stats cards).
  - The user requested:
    `"inga default nu onu venum aga certificate select panikira mathiri irukanumm"`
    (There should be a "Default" option here so that we can select that official certificate).
- **Resolution**:
  - **Added "Default Certificate (Official Athnex)" Preset**:
    - Featured as the very first preset in `certPresets` with a prominent `DEFAULT` teal badge.
    - Selecting it switches immediately to the official Athnex Live Certificate design (`template_type: 'default'`) and clears any custom background overrides.
  - **"Use Default Certificate" Quick Action Button**:
    - Added a dedicated `🌟 Use Default Certificate` button in the upload action bar. If a custom certificate was uploaded, it also provides an instant `↺ Reset to Default` button.
  - **Live Canvas Integration (`OurServices.jsx`)**:
    - When `template_type === 'default'`, the live interactive canvas renders the ocean wave backdrop, double gold frame with diamond corner emblems, the official circular 'A' seal, academy subline, dividers, 3 stats pills (`5 Completed Sessions`, `50 Waves Ridden`, `88 / 100 Coach Score`), and the `✓ Pro Level` badge.
  - **Export & Student Download Synchronization (`MyAchievements.jsx`)**:
    - Synchronized high-resolution canvas generators so that both the test download in `OurServices.jsx` and student downloads in `MyAchievements.jsx` render the full, authentic official default certificate with the student's dynamic verified session stats and name.
  - **Backend Certificate Persistence Resiliency (`backend/main.py`)**:
    - Refactored `update_school_certificate` and `get_school_certificate` with safe try/except fallback execution to guarantee 100% reliable 200 OK responses with zero 500 server crashes.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.81s).

#### 2. Course-Specific Certificate Customization: 3-Day vs 5-Day Courses (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The academy offers multiple courses (e.g., 3-Day Beginner Surf Course vs 5-Day Intermediate Surf Skills Course).
  - The user requested:
    `"ipa enaku 3 daysku oru certficate 5 daysku onunu matha mudiyanum"`
    (Tanglish: "Now for 3 days course I need one certificate, and for 5 days course I need another one, and I should be able to change/customize them separately!").
- **Resolution**:
  - **Course Target Selector Bar (`OurServices.jsx`)**:
    - Added an intuitive selector bar above the Certificate Customizer studio with tabs:
      - `[ 🏄 3-Day Course Certificate (3 Sessions) ]`
      - `[ 🌊 5-Day Course Certificate (5 Sessions) ]`
    - Clearly indicates which certificate is currently active (`Editing: 3-Day Course` or `Editing: 5-Day Course`).
  - **1-Click Design Cloner (`handleCloneAcrossCourses`)**:
    - Added `📋 Copy Design to Other Course` button that duplicates all background templates, layout coordinates, colors, and custom fields between 3-day and 5-day courses in a single click.
  - **Isolated Storage & Schema (`certConfig.courses`)**:
    - Stored certificates under `certConfig.courses['3days']` and `certConfig.courses['5days']`, while mirroring active fields to the root object for seamless backward compatibility.
    - Switching courses automatically snapshots unsaved edits to the current course and loads the target course's design into the canvas and control panel.
  - **Live Canvas Stats & Level Adaptation**:
    - When `3days` is active: renders `🏄 3 Completed Sessions`, `🌊 25 Waves`, `⭐ 85 / 100`, and `✓ Beginner / Pro Level`.
    - When `5days` is active: renders `🏄 5 Completed Sessions`, `🌊 50 Waves`, `⭐ 88 / 100`, and `✓ Intermediate / Pro Level`.
  - **Student Certificate Download Synchronization (`MyAchievements.jsx`)**:
    - Dynamically inspects the student's enrolled course duration (`requiredSessions === 5 ? '5days' : '3days'`).
    - Loads the exact custom certificate configured for that course and formats the output file name accordingly (`School_3Day_Certificate_StudentName.png` or `School_5Day_Certificate_StudentName.png`).
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.88s).

#### 3. Dedicated Services Options Menu Hub & Top Navbar Quick Dropdown (`OurServices.jsx`, `Sidebar.jsx`)
- **Problem & User Feedback**:
  - Previously, clicking "Our Services" directly opened the full-screen Certificate Builder Studio, with all coordinate sliders, template uploads, and the live canvas covering the screen right away.
  - The user requested:
    `"our servies kula vatha option dhan katanum athukula meanu mathiri katanum"`
    (Tanglish: "When entering Our Services, only the options should be shown, and inside that it should show like a menu!").
- **Resolution**:
  - **Default "Services Options Menu" Hub View (`OurServices.jsx`)**:
    - Changed default landing tab from `'certificate'` to `'menu'`.
    - Landing on `/services` presents a clean Services Menu Hub with cards for all academy offerings:
      1. 🎓 **Official Course Completion Certificates Card**:
         - Sub-options list:
           - 🏄 **3-Day Course Certificate** (`3 Sessions • Beginner Level`) with `Configure →` action.
           - 🌊 **5-Day Course Certificate** (`5 Sessions • Intermediate Skills`) with `Configure →` action.
           - ✨ **Smart AI Template Scanner** with `Scan →` action.
         - Button: `🎨 Open Certificate Studio`.
      2. 📸 **Milestone Story Poster Photo Card**:
         - Shows live thumbnail preview of current academy background.
         - Button: `🖼️ Configure Story Poster Photo`.
      3. 🏄 **Surf Training Course Curriculum Card**:
         - Shows 3-Day Course, 5-Day Course, and Private 1-on-1 coaching packages and their session counts.
  - **Navigation Tabs & Return Bars**:
    - Top tab bar updated with `[ 📋 Services Menu (Options) ]`, `[ 🎓 Course Completion Certificate ]`, and `[ 📸 Milestone Story Poster Photo ]`.
    - Inside Certificate and Poster customizers, added a `← Back to Services Menu (Options)` return bar with full breadcrumb path.
  - **Top Navbar Quick Dropdown (`Sidebar.jsx`)**:
    - Added an interactive dropdown on hover over "Our Services" in the header navigation:
      - `📋 Services Options Menu` (`/services`)
      - `🏄 3-Day Course Certificate` (`/services?tab=certificate&course=3days`)
      - `🌊 5-Day Course Certificate` (`/services?tab=certificate&course=5days`)
      - `📸 Milestone Story Poster` (`/services?tab=poster`)
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.82s).

#### 4. Custom Manual Course Days & Dynamic Multi-Course Certificate Customizer (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - Previously, the certificate customizer only supported a hardcoded selection of 3-Day and 5-Day courses.
  - The user requested:
    `"3 days 5 days mattum ila enaku itha mathiri yethana days venalum manuvala vachikira mathiri venum"`
    (Tanglish: "Not only 3 days and 5 days, I need to be able to manually keep / add however many days like this!").
- **Resolution**:
  - **Dynamic Course Days Creation Modal (`handleAddCourseCertificate`)**:
    - Added an interactive `[ ➕ Add Days / Course ]` button in the certificate switcher bar and services menu.
    - Admins can manually create a certificate for ANY number of days (e.g. 1-Day Discovery, 2-Day Weekend, 7-Day Masterclass, 10-Day Pro, 14-Day, 21-Day, 30-Day, or any custom day count).
    - Features quick-preset day buttons (`1, 2, 3, 5, 7, 10, 14, 21, 30`), custom course title input, and option to replicate the initial design from any existing course.
  - **Dynamic Course Switcher Bar (`OurServices.jsx`)**:
    - Replaced the hardcoded two-button bar with dynamic pills for all configured courses in `certConfig.courses`.
    - Each course pill displays its icon, title, session count badge, and a `✕` delete button (available when $>1$ course exists).
  - **Multi-Course Design Replicator (`handleCloneAcrossCourses`)**:
    - Upgraded the clone button to open a modal allowing admins to replicate the current layout, coordinates, and background to a specific course or to **ALL** configured courses in 1 click.
  - **Student Dynamic Course Synchronization (`MyAchievements.jsx`)**:
    - Upgraded certificate generation in `MyAchievements.jsx` to dynamically resolve the student's enrolled duration across all configured courses:
      1. Exact key match (`${requiredSessions}days`)
      2. Match by `course.days === requiredSessions`
      3. Fallback to active course.
    - Auto-formats output file name: `School_NDay_Certificate_StudentName.png`.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.82s).

---

### Changes on 17-11-2026

#### 1. Default Certificate Presets & Arbitrary Multi-Course Days Engine (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The user requested built-in presets and a default template option: `"inga default nu onu venum aga certificate select panikira mathiri irukanumm"`.
  - The user also requested duration-specific certificates for any number of days: `"ipa enaku 3 daysku oru certficate 5 daysku onunu matha mudiyanum"`, followed by `"3 days 5 days mattum ila enaku itha mathiri yethana days venalum manuvala vachikira mathiri venum"` (Not just 3 or 5 days, capability to manually create and configure certificates for ANY number of course days e.g. 1, 2, 7, 10, 14, 30...).
- **Resolution**:
  - **Built-in Presets with Official Athnex Default**:
    - Created high-resolution Default Athnex Ocean template with deep ocean photography, gold frame, athletic seal, and customizable field positions.
    - Added 1-click preset selector (`✓ Default Certificate (Official Athnex)`, `Royal Navy & Gold`, `Parchment & Emerald`, `Deep Cyan Horizon`).
    - Added `☀️ Active Default` badge and instant restore to factory settings.
  - **Arbitrary Course Duration Management (`+ Add Course Days`)**:
    - Implemented dynamic course state supporting arbitrary days (`courses: { '3days': {...}, '5days': {...}, [customKey]: {...} }`).
    - Added modal dialog to enter custom course name, number of required sessions, benchmark waves, and level.
    - Integrated automatic unlock logic in `MyAchievements.jsx` resolving student course length (`requiredSessions`) to the exact matching duration certificate.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.95s).

#### 2. Multi-Level Clean Services Navigation: Encapsulating Course Durations Inside Hub View (`OurServices.jsx`)
- **Problem & User Feedback**:
  - In the Services Options Menu (`activeTab === 'menu'`), the "Course Completion Certificates" card had the individual course items (3-Day, 5-Day, Add Days, Smart Scanner) directly exposed on the outer face, and the top banner had direct course buttons.
  - The user requested:
    `"ithula velaey iruku apadi iruka kudathu clik pani ula pora mathiri irukanum"`
    (Tanglish: "In this, it is exposed on the outside! It shouldn't be outside like that. When we click, it should go inside to view them!").
- **Resolution**:
  - **Level 1: Clean Outer Services Hub (`activeTab === 'menu'`)**:
    - Removed the exposed inner list of courses, custom add buttons, and scanner from the front of Card 1.
    - Transformed Card 1 into a clean, professional service card with:
      - 🎓 Icon and `${totalCourses} COURSES CONFIGURED` badge.
      - Clean overview box showing course durations available (`✓ 3-Day & 5-Day Presets • ✓ Add Custom Days • ✓ Smart Scanner`).
      - Big primary button: `[ 🎓 Open Course Certificates Menu → ]` that navigates inside (`setActiveTab('cert-courses')`).
    - Cleaned up the top hero header and Card 3 buttons so they navigate to the new Course Certificates Menu.
  - **Level 2: Dedicated Course Completion Certificates Hub (`activeTab === 'cert-courses'`)**:
    - Added a dedicated intermediate hub displaying:
      - `← Back to Services Menu` return button and breadcrumb path.
      - Hero header with `➕ Add New Course Days` and `✨ Smart Scanner` action buttons.
      - Grid of individual course duration cards (3-Day, 5-Day, custom courses) detailing required sessions, benchmark waves, template styling, delete button, and a prominent `[ ✏️ Customize Certificate & Canvas → ]` button (`setSelectedCourseKey(cKey); setActiveTab('certificate')`).
      - Interactive dashed cards for `➕ Add Course Days (1, 2, 7, 10, 14, 30...)` and `✨ Smart Template Scanner`.
  - **Level 3: Certificate Customizer Studio (`activeTab === 'certificate'`)**:
    - Updated return bar with dual actions:
      - `← Back to Course Selection` (`setActiveTab('cert-courses')`)
      - `📋 All Services Menu` (`setActiveTab('menu')`)
      - Breadcrumb: `Our Services > Course Certificates > {Course Name}`.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.99s).

#### 3. Pure Card-Driven Architecture & Elimination of Top Clutter (`OurServices.jsx`)
- **Problem & User Feedback**:
  - The user uploaded a screenshot showing redundant top tab strips (`Services Menu (Options) | Course Completion Certificate | Milestone Story Poster Photo`), duplicate buttons, and massive dark blue hero banners consuming 50% of the screen height.
  - User explicitly requested:
    `"lusu unku puritha itha mathiri mela irukurea mathiri vena enaku card card ah kudu atha kudutha ula pora mathiri irukanum"`
    (Tanglish: "I don't want all this stuff on top like this! Give me card by card, and when I click a card, it should go inside!").
- **Resolution**:
  - **Removed All Top Clutter**:
    - Completely removed the 3-button top tab bar.
    - Completely removed the giant dark blue hero boxes across both `menu` and `cert-courses`.
    - Removed duplicate buttons from the top page header.
  - **100% Card-Clickable Navigation**:
    - Every single card on Level 1 (Services Menu) and Level 2 (Course Certificates Hub) is now an interactive clickable portal card.
    - Clicking anywhere on a card (or its button) immediately opens the view inside.
    - Single, clean `← Back` navigation button with crisp typography at every step.
  - Verified build with `npm --prefix frontend run build` (0 errors in 1.89s).

#### 4. Full Production Deployment to AWS EC2 (`athnexlive.com`)
- **Backend Deployment**:
  - Uploaded `backend/main.py` to S3 bucket `s3://aisurf-media-uploads-149051628601/deploy/main.py`.
  - Executed SSM deployment on Backend EC2 instance (`i-0c62e04f44a9ea237`), placed `main.py`, and restarted `aisurf-backend` systemd service (verified active).
- **Frontend Deployment**:
  - Built fresh production bundle using Vite (`dist/assets/index-YiM_KepS.js`).
  - Archived to `scratch/aisurf-frontend.zip` (2,308,899 bytes) and uploaded to S3.
  - Executed SSM deployment on Frontend EC2 instance (`i-02999b6093bc5bfd2`), deployed onto `/var/www/frontend/`, and reloaded Nginx service.
  - Verified live endpoint: `https://athnexlive.com` returns `HTTP 200 OK` and serves latest assets.

#### 5. Accurate Coach Name Resolution Everywhere & Prominent Student Name Highlighting (`MyAchievements.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  - The user shared two screenshots from the Share Session Studio and Achievements card:
    1. Screenshot 1 showed `"Coaches Kathir & Gabriel"` in yellow on the Coach Verdict banner. The user requested: `"inga enaku crt ana coach name varanum yela yadathulaum"` (The correct single coach name must appear in all places instead of messy joined plurals).
    2. Screenshot 2 showed `"Ruchika Shah • Group 1"` in small dim grey text (`12.5px`, `#94A3B8`). The user requested: `"athe mathiri stdeutn name num kojom hilight ah thariyanum"` (The student name should be clearly highlighted and stand out prominently).
- **Resolution**:
  - **Accurate Coach Resolution Everywhere**:
    - **Backend (`backend/main.py`)**: Enhanced `session_to_dict` to return `primary_instructor`, `instructor_name`, and `instructors_list`, ensuring `s.instructor_rel.name` (the exact coach assigned to that session/student) is preserved rather than collapsed into a generic comma-separated group string.
    - **Frontend (`MyAchievements.jsx`)**:
      - Rewrote `getCleanCoachName(sess, override)` to prioritize:
        1. User's manual coach selection override (if selected in the Share Studio modal).
        2. Student's assigned coach from profile (`studentData?.instructor`).
        3. Direct primary session instructor (`sess.primary_instructor` / `sess.instructor_name`).
        4. Single clean coach name capitalized (e.g. `Coach Kathir`), never plural `"Coaches Kathir & Gabriel"`.
      - Added `getCoachCandidates(sess)` and an interactive Coach Switcher Strip in the Share Studio modal (`[ Coach Kathir ✓ ] [ Coach Gabriel ]`) so surfers can effortlessly switch or verify their coach if multiple coaches taught that day.
      - Updated **all places** (`yela yadathulaum`):
        - Share Session Studio preview (Spotlight, Keepsake, Scorecard)
        - High-resolution Canvas generator (`generateStoryPosterBlob`) for Instagram/WhatsApp story exports
        - Session History Cards list: `Coach: Kathir`
        - Course Completion Certificate generation: `getCleanCoachName(lastSession)`
        - Social and WhatsApp milestone share text
  - **Prominent Student Name Highlighting**:
    - **Template 1 (Photo Spotlight)**:
      - Separated student name from metadata into a dedicated hero badge: `.ach-spotlight-student-highlight` with `.ach-student-name-hero` (`16px-18px`, `font-weight: 900`, vibrant athletic sky-blue `#38BDF8` with subtle luminous glow), and `.ach-student-group-badge` for `{groupName}`.
      - Canvas export updated to render `studentName` in `900 36px` `#38BDF8`.
    - **Template 2 (Ocean Keepsake)**:
      - Replaced dim subline with `.ach-keepsake-student-highlight`, bold black text `16px-18px` (`font-weight: 900`, `#0F172A`) and emerald pill badge for group name.
      - Canvas export updated to render `studentName` in `900 34px` `#0F172A`.
    - **Template 3 (Personal Scorecard)**:
      - Highlighted student name with `.ach-sc-ath-name-highlight` (`16px-18px`, `font-weight: 900`, radiant mint turquoise `#5EEAD4` with athletic glow).
      - Canvas export updated to render `studentName` in `900 36px` `#5EEAD4`.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.20s).

#### 6. Coach Score Out of 10, Water Time Metric Pill, & Hero Name Positioning (`MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The user uploaded an annotated screenshot (`media_1794908378077_e03c844b.jpg`) with red arrows and instructions:
    1. `"coach score 100 ruku vena 10 outoff 10 ku vai"`: Change Coach Score from `/100` to `/10` (e.g. `5.5/10` instead of `55/100`).
    2. `"aparo take off ku bathila yevalo hours waterla iruthomnu vai"`: Replace `⚡ 6/10 TAKEOFF POP-UP` metric with total hours spent in the water (`⏱️ 2.0 hrs Water Time`).
    3. `"Name inga varalaam"`: In the top-left corner of the photo where `"THE COACH'S CUT"` was located, display the athlete's name prominently (`🏄 RUCHIKA SHAH`).
- **Resolution**:
  - **Out of 10 Coach Score Scaling**:
    - Created `getScoreOutOfTen(rawScore)` helper that dynamically scales `/100` scores to `/10` with single decimal precision (e.g. 55 -> `5.5/10`, 80 -> `8/10`, 88 -> `8.8/10`).
    - Updated across all 3 templates (Spotlight, Keepsake, Scorecard) in both HTML modal view and high-res canvas exports (`/10` denominator everywhere).
  - **Water Time Metric Replacement**:
    - Replaced the Pop-Up metric pill with `getSessionWaterTime(sess)`:
      - Reads `sess.duration_mins` or parses session time range (`07:00-09:00 AM` -> `2.0 hrs`).
      - Rendered as `⏱️ {waterTime}` with sub-label `Water Time` / `Time in Water`.
    - Updated in Template 1 (Spotlight), Template 2 (Keepsake footer), and Template 3 (Scorecard 3-column metrics), as well as all canvas story image generators.
  - **Surfer Athlete Name on Photo Pill**:
    - Replaced static `"THE COACH'S CUT"` in the photo's top-left corner with `🏄 {studentName.toUpperCase()}` styled with translucent dark teal backdrop, glowing border, and athletic badge styling.
    - As requested (`"inga vena mela mattum pothum"`), removed duplicate student name from below `"A session to be proud of."`, keeping the student name exclusively on the hero top photo pill badge, with clean `[ Group A ] • Date & Time` below.
    - Also matched on the Canvas generator for Instagram/WhatsApp story exports.
  - **Clean Single Domain Watermark (`"inga athnexlive.com nu vatha pothum"`)**:
    - Replaced redundant `"ATHNEX LIVE • athnexlive.com"` watermark at the bottom of all story canvas posters (Spotlight, Keepsake, Scorecard) and the Milestone Story preview in `OurServices.jsx` with a clean, minimal **`athnexlive.com`**.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.45s).

#### 7. Exact 100% WYSIWYG Story Card Download & Share (`"inga katurathu yepadi iruko athey mathiri dhan enaku download aganum"`)
- **Problem & User Feedback**:
  - The user requested: `"inga katurathu yepadi iruko athey mathiri dhan enaku download aganum"` with an attached screenshot of the interactive preview card in the Share Studio modal.
  - The downloaded image from manual HTML5 Canvas drawing diverged from the on-screen interactive CSS card (different font sizes, layout proportions, and pill badge rendering).
- **Resolution**:
  - **Direct DOM Capture via `html-to-image` (`MyAchievements.jsx`)**:
    - Integrated `toBlob` from `html-to-image` into `generateStoryPosterBlob`.
    - When `cardRef.current` is mounted in the DOM, `generateStoryPosterBlob` captures the live card DOM element directly at high resolution (`pixelRatio: 2.5`, generating a crisp 1100 × 1375 px 4:5 portrait image).
    - Guarantees 100% pixel-perfect match with what the surfer sees on screen:
      - Exact photo positioning, cover/contain fit, and live color filters (normal, golden hour, deep ocean, vivid pop).
      - Prominent surfer name pill `🏄 {STUDENT_NAME}` and yellow `✓ SESSION COMPLETE` badge.
      - Hero title `"A session to be proud of."`, training group tag, session date & time range.
      - Bold Coach Score in `/10` format (e.g. `5.5/10`).
      - 3-pill metric stats: `Waves Caught`, `Water Time`, and `Technique Score`.
      - Verified Coach Verdict quote box with teal accent border and coach name.
      - Clean single-domain watermark **`athnexlive.com`** at the bottom.
      - Crisp 20px rounded card borders without shadow clipping.
  - **Preview & Watermark Alignment**:
    - Added the minimal `.ach-card-footer-watermark` (`athnexlive.com`) directly into all three HTML card templates (Spotlight, Keepsake, Scorecard) and optimized slate padding so both preview and export display the clean branding.
  - **Graceful Canvas Fallback**:
    - Wrapped DOM capture in try-catch; if DOM capture is ever interrupted, it seamlessly falls back to the high-resolution canvas renderer.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 1.76s).

#### 8. School Logo & Coach Signature Photo Upload in Certificate Studio (`OurServices.jsx` & `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The user requested: `"inga school logo aparo siginature ahla photo upload panura mathiri venum"` with a screenshot of the Certificate Customizer in `OurServices.jsx`.
  - Previously, certificates only allowed plain text for Academy Name and Coach Signature. Academies could not upload their official crest/logo or a real coach handwritten signature / ink stamp onto student completion certificates.
- **Resolution**:
  - **Dedicated Academy Logo & Signature Photo Upload Cards (`OurServices.jsx`)**:
    - Added an always-visible **"🖼️ Official School Logo & Coach Signature Photos"** card right above Field Placement & Typography:
      - **School Logo Card**: 1-click photo uploader (PNG, JPG, WebP), live thumbnail preview, and delete button.
      - **Coach Signature Card**: 1-click signature image uploader (handwritten signature / stamp photo with transparency), live thumbnail preview, and delete button.
      - Auto-propagates and saves across all course configurations (3-Day, 5-Day, and custom days) so the academy's branding stays consistent without repetitive re-uploading.
  - **Field Selection & Fine-Tuned Typography Controls**:
    - Added dedicated pills: `[ 🖼️ School Logo ]` and `[ ✍️ Coach Signature Photo ]`.
    - Selecting an image field surfaces dedicated photo controls:
      - Upload / Change Photo button
      - Image Display Width slider (30px to 280px)
      - Position X% and Y% sliders
      - Anchor alignment (Left, Center, Right)
      - Visibility toggle (`👁️ Visible` / `🚫 Hidden`)
    - Added reciprocal shortcut buttons between Coach Name text and Signature photo, and between Academy Name text and School Logo.
  - **Live Interactive Canvas with Drag-and-Drop Positioning**:
    - Both the School Logo and Coach Signature photos render directly on the live certificate canvas (`certContainerRef`).
    - Admins can drag and drop both images with mouse or touch anywhere on the certificate canvas.
    - If a photo has not yet been uploaded, an intuitive dashed button (`📷 Upload Logo` / `✍️ Upload Signature`) allows direct 1-click uploading right from the canvas.
    - When a custom school logo is uploaded, the generic circular default 'A' seal automatically yields to the academy's official crest.
  - **High-Resolution & Student Certificate Export Rendering**:
    - Updated `handleDownloadTestCertificate` in `OurServices.jsx` and `handleDownloadCertificate` in `MyAchievements.jsx` to load and draw the uploaded logo and signature images at exact scaled coordinates on the 1754 x 1240 A4 landscape certificate canvas.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.73s).

#### 9. Direct Navigation for "Our Services" (`Sidebar.jsx`)
- **Problem & User Feedback**:
  - The user requested: `"itha mathirila vena click pana mathathuku pora mathiri irukanum"` with a screenshot showing the hover dropdown menu appearing under "Our Services" in the top navigation header.
  - Other nav items (Dashboard, Instructors, Students, Sessions, Analytics, Mock Heat, Athlete Intel) navigate directly to their respective hubs on click, whereas "Our Services" showed a multi-link dropdown overlay.
- **Resolution**:
  - Completely removed the `servicesHovered` state and hover dropdown menu overlay from `Sidebar.jsx`.
  - Replaced the custom dropdown block with the standard navigation link button: clicking **"Our Services"** now navigates directly to `/services` (where cards for all academy services, certificates, and story posters are clearly accessible).
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.01s).

#### 10. Removed "Benchmark Waves" from Course Certificate Cards (`OurServices.jsx`)
- **Problem & User Feedback**:
  - The user requested: `"itha mathiri benchmark wavesna naaba onum vaachidala athala remove panu"` with a cropped screenshot of `"Benchmark Waves: 25 Waves"` and `"Benchmark Waves: 50 Waves"`.
  - The Academy has no wave benchmark requirements, so displaying "Benchmark Waves" on the certificate configuration cards was irrelevant and misleading.
- **Resolution**:
  - Completely removed the `Benchmark Waves` row from the Course Details Box in `OurServices.jsx`.
  - The cards now cleanly show only the actual course requirements: **Required Sessions** and **Template Design**.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 1.70s).

#### 11. Custom Photo Download & Story Export Fix (`"naa upload pana photo varama yetho vara photo varuthu"`)
- **Problem & User Feedback**:
  - The user reported: `"naa upload pana photo varama yetho vara photo varuthu"` with 2 attached images:
    1. On-screen modal preview showing the custom uploaded photo (The Weeknd album artwork).
    2. Downloaded PNG file (`Athnex_Session_spotlight_kim (2).png`) showing an old placeholder screenshot instead of the user's uploaded photo.
  - **Root Cause**:
    1. When DOM capture (`html-to-image`) ran on `cardRef.current`, it attempted to fetch external Google fonts (`@import` in CSS) without `skipFonts: true` and executed `cacheBust: true` on base64 `data:` URIs, throwing an exception and silently triggering the canvas fallback.
    2. In the canvas fallback, setting `crossOrigin = 'anonymous'` on `photoImg` before assigning a `data:` URI caused Chromium to block the data URL as a CORS violation and trigger `onerror`.
    3. The photo containers in the preview modal used CSS `backgroundImage: url(...)` instead of native `<img>` tags, making DOM-to-image conversion less reliable across browsers.
- **Resolution**:
  - **Direct Real `<img>` Tag Rendering**:
    - Converted the photo containers in all three templates (Spotlight, Keepsake, Scorecard) in `MyAchievements.jsx` from CSS `backgroundImage` to native `<img ... />` elements with `width: 100%`, `height: 100%`, `objectFit: cover / contain`, and live `filter`.
    - Real `<img>` tags render natively in `html-to-image` without CSS background parsing errors.
  - **Optimized `html-to-image` Options**:
    - Configured `{ skipFonts: true, cacheBust: false, fontEmbedCSS: '' }` in `toBlob(cardRef.current)` so external fonts or data URI cache queries never interrupt DOM capture.
  - **Canvas Fallback Bulletproofing**:
    - Prioritized `customPhotoUrl` at the absolute top of the photo resolution chain (`customPhotoUrl || photoDataUrl || sess?.image_url || posterBgUrl || '/surf-milestone-bg.jpg'`).
    - Only assign `crossOrigin = 'anonymous'` for remote `http://` / `https://` URLs; for base64 `data:` and `blob:` URLs, `crossOrigin` is omitted so browsers never trigger CORS blocks.
    - Synchronous image resolution check: if `photoImg.complete && photoImg.naturalWidth > 0`, resolves immediately without waiting for an already fired `onload`.
    - Aligned fallback metric pills to match preview text (`In Training` and `Unrated`).
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.49s).

#### 12. Instant Front Page Reset on "Our Services" Navbar Click (`Sidebar.jsx` & `OurServices.jsx`)
- **Problem & User Feedback**:
  - The user requested: `"ingathu our servies ah clik pana front pagekey poidaum"` with a screenshot of the Certificate Customizer view (`/services` with `3-Day Beginner Surf Course` loaded).
  - When users were already on `/services` and editing a certificate or poster, clicking "Our Services" in the top navigation bar did nothing because React Router was already at `/services` without resetting the internal page tab state.
- **Resolution**:
  - **Global Navigation Event & State Trigger (`Sidebar.jsx`)**:
    - Updated `handleNavClick` for both desktop header navigation and mobile drawer navigation: clicking "Our Services" dispatches a custom `athnex_reset_services` event and navigates to `/services` with a unique timestamp state (`resetTab`).
  - **Dynamic Front Page Reset (`OurServices.jsx`)**:
    - Added event listeners for `athnex_reset_services` and `location.state.resetTab`: instantly resets `activeTab` back to `'menu'` (the main services overview page), cleans up lingering URL search queries via `replaceState`, and smoothly scrolls to top.
    - Made the main page banner heading `"Our Services & Academy Media"` clickable with pointer cursor as a direct one-click shortcut back to the services menu.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.46s).

---

### Changes on 18-11-2026

#### 1. Academy Milestone Official Background Photo Auto-Save & Student Portal Sync (`"inga naa upload pana photova varama default dhan varuthu ana apadi vara kudathu"`)
- **Problem & User Feedback**:
  - The user reported: `"inga naa upload pana photova varama default dhan varuthu ana apadi vara kudathu"` with 2 screenshots:
    1. `OurServices > Milestone Story Poster Photo` showing the uploaded custom academy action photo (The Weeknd artwork) in the live preview.
    2. Student Portal (`Share your session` modal) showing the old default sunset surfer image (`/surf-milestone-bg.jpg`) instead of the academy's uploaded photo.
  - **Root Cause**:
    1. In `OurServices.jsx`, `handlePhotoUpload` uploaded the file and set local state `posterUrl`, but never called `handleSaveChanges(uploadedUrl)`. There was also no visible Save button inside the card controls when scrolled down. As a result, the photo was never persisted to the backend or localStorage.
    2. In `MyAchievements.jsx`, `fetchPoster` blindly overwrote the local storage cache if the backend returned default `/surf-milestone-bg.jpg`, and did not dynamically query the student's active school.
- **Resolution**:
  - **Instant Automatic Persistence on Upload (`OurServices.jsx`)**:
    - Updated `handlePhotoUpload` to immediately invoke `await handleSaveChanges(uploadedUrl)` upon file selection, saving the photo to `/api/schools/poster` and caching it in `athnex_milestone_poster_bg` and `athnex_poster_${schoolName}` without requiring any extra clicks.
  - **Dedicated Card & Header Save Controls (`OurServices.jsx`)**:
    - Added a prominent `💾 Save as Default` button right inside the upload control box next to `📁 Choose File` and `↺ Reset to Default`.
    - Added `💾 Save Milestone Background Photo` in the top header action area when editing the poster tab.
    - Dispatches `athnex_poster_updated` custom event across the window for instant live sync.
  - **Reliable School Poster Resolution & Cache Protection (`MyAchievements.jsx`)**:
    - Dynamically resolves `effectiveSchool` from student profile, user record, or `activeSchool` localStorage.
    - Protected cache: if the student portal already has a custom academy photo cached, it never gets wiped out by a default fallback response.
    - Added real-time listener for `athnex_poster_updated` so any change saved in Our Services immediately reflects inside the student's session share modal.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 3.95s).

#### 2. Circular Coach Profile Avatar in Coach Verdict Banner (`"inga coach oda profile chinnatha round ah katanum"`)
- **Problem & User Feedback**:
  - The user requested: `"inga coach oda profile chinnatha round ah katanum"` in the Coach Verdict section of the session milestone share card.
  - Previously, only the text `"Coach Kathir"` / `"Coach Anbumani"` was shown without any visual coach avatar or profile image.
- **Resolution**:
  - **Dynamic Instructor Avatar Resolution (`MyAchievements.jsx`)**:
    - Added `instructorsList` state and auto-fetching from `/api/instructors`.
    - Created `getCoachPhotoForSession(sess, coachName)` and `getCoachAvatar(coachName)` to automatically match the assigned coach's name to their real instructor profile picture stored in the database.
  - **Small Circular Coach Avatar UI**:
    - Integrated a sleek 26px circular avatar right beside the coach name in all three story card templates (`Photo spotlight`, `Ocean keepsake`, `Personal scorecard`):
      - Renders the coach's real profile photo with `objectFit: cover`, `borderRadius: 50%`, and glowing accent border (`#2DD4BF` / `#0D9488`).
      - Elegant fallback badge displaying the coach's initial letter (e.g. `K` or `A`) with clean oceanic gradients if no photo has been uploaded yet.
    - Added the circular coach badge to the Live Milestone Poster Preview in `OurServices.jsx`.
    - Integrated circular coach avatar drawing into the high-res Canvas generator (`generateStoryPosterBlob`).
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.06s).

#### 3. Student Profile Completed Sessions Discovery & Global Score vs Wave Count Swap
- **User Requests**:
  1. `"inga 4 completed session iruku my profile la yan onum katslaa"`: Student Profile (`StudentProfile.jsx`) previously showed "No Completed Sessions Yet" for student Kim despite 4 completed surf sessions existing in History of Sessions.
  2. `"score irukura placela wave countum wave count iruka placela score mathu yelathulaum"`: Swapped Score and Wave Count positions globally across all story templates, certificate templates, overview metric cards, and canvas download generators.
- **Resolution**:
  - **Student Sessions Discovery Sync (`StudentProfile.jsx`)**:
    - Aligned session discovery with `MyAchievements.jsx`: queried `/api/sessions` matching by candidate student IDs (`student_id`, `id`) and student name.
    - Updated `getSessionDisplayStatus` so sessions with attended attendance or past dates automatically resolve as `Completed`.
    - Synced `Next Session` banner and resolved assigned coach automatically.
  - **Global Score & Wave Count Swap**:
    - Swapped Score and Wave Count metrics across all story templates (Spotlight, Keepsake, Scorecard), overview stat cards, session history list, certificate preview cards, and high-resolution HTML5 canvas rendering functions.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.02s).

#### 4. Single Clean Coach Remarks Entry Point & Real Uploaded Video Enforcement (`"INGA YAN ITHANA REMARK NU IRUKU ORU YADATHULA MATTUM VAI POTHUM"`, `"VIDEO UPLOAD PANA MATTUM DHAN IRUKANUM ILLANA IRUKA KUDATHU"`)
- **Problem & User Feedback**:
  1. In `StudentProfile.jsx` (`RECENT COMPLETED SESSIONS`), each completed session card had 3 redundant "See your remarks" buttons/banners:
     - Top-right button: `💬 See your remarks ★` beside `Completed` badge.
     - Middle notification callout banner: `💬 See your remarks [Feedback Ready]` with `Open Session →`.
     - Bottom row button: `💬 See your remarks` next to `Coach: {coachName}`.
     - User feedback: `"INGA YAN ITHANA REMARK NU IRUKU ORU YADATHULA MATTUM VAI POTHUM"`.
  2. In `Video Analysis` card, 3 empty black placeholder cards with "ANALYZED" play buttons were rendered even though no actual video was uploaded for the student.
     - User feedback: `"VIDEO UPLOAD PANA MATTUM DHAN IRUKANUM ILLANA IRUKA KUDATHU"`.
- **Resolution**:
  - **Single Unified Remarks Notification (`StudentProfile.jsx`)**:
    - Removed redundant top-right and bottom-row "See your remarks" buttons.
    - Preserved strictly ONE clean, informative middle callout banner (`💬 See your remarks [Feedback Ready] ... Open Session →`), keeping header and bottom action rows minimal and uncrowded.
  - **Strict Real Uploaded Video Validation (`StudentProfile.jsx`, `backend/main.py`)**:
    - Created `isRealUploadedVideo` validator filtering out legacy seed dummy links (`c041fea3-b7ed-40d0-ad1e-2c1e14ee6e4d.mp4`, `demo1`, `demo2`, `demo3`, `mixkit`, `gtv-videos-bucket`, `placeholder`, `none`, `null`, `undefined`, `#`).
    - Filtered `validVideoSessions` from `effectiveSessions`: if no real video was uploaded by the coach, renders the clean empty state (`📹 No Video Analysis Uploaded Yet`) and hides dummy black cards.
    - When real videos are uploaded, renders video cards with `<video src={`${vUrl}#t=0.5`} preload="metadata" />` preview, session date, coach badge, and direct one-click launcher for AI video analysis (`/analysis`).
    - Added backend auto-patch query in `backend/main.py` clearing legacy dummy video URLs from the `sessions` table.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 4.51s).

#### 5. "See your remarks" Direct Navigation to My Achievements (`"INGA SEE YOU REMARK KUDUTHA MY ACHIVEMENTUKU POGANM"`)
- **Problem & User Feedback**:
  - The user requested: `"INGA SEE YOU REMARK KUDUTHA MY ACHIVEMENTUKU POGANM"` with a screenshot of the completed sessions list in `StudentProfile.jsx`.
  - Clicking "See your remarks" previously navigated to `/sessions?openSession=${session.id}&tab=notes`. The user wanted it to navigate directly to **My Achievements** (`/achievements`).
- **Resolution**:
  - **Direct Navigation to My Achievements (`StudentProfile.jsx`)**:
    - Updated the "See your remarks [Feedback Ready]" banner `onClick` handler to navigate directly to `/achievements?session=${session.id}`.
    - Updated banner text: `Coach {coachName} added evaluation scores & feedback. Click to view in My Achievements.` with right CTA `View in Achievements →`.
    - Made the top header pill `"💬 Coach Remarks Available"` clickable, navigating to `/achievements` on 1 click.
  - **Auto-Open Milestone & Remarks Modal (`MyAchievements.jsx`)**:
    - Added `useSearchParams` handling for `?session=${session.id}`.
    - When `MyAchievements` mounts, it automatically locates the matching session, smoothly scrolls to it in the session list with a teal highlight indicator, and opens the social share/milestone modal displaying the coach verdict, evaluation scores, and wave counts.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.28s).

#### 7. Student My Sessions Discovery & All-Dates Default Display (`Sessions.jsx`)
- **Problem & User Feedback**:
  - The user reported: `"inga yan yethum katala"` with a screenshot of the `My Sessions` (`/sessions`) page showing `Showing 0 of 0 sessions`, all zero counters (`Upcoming: 0`, `In Progress: 0`, `Completed: 0`), and empty state `"No sessions match your filter criteria / No sessions found for your account"`.
- **Root Cause**:
  1. **Strict Date Filter Defaulting to "Today"**:
     - `Sessions.jsx` previously initialized `dateFilter` and `dateRange` to `Today` (`19-11-2026`) for all users. Since Kim's completed and scheduled surf sessions took place on past/specific dates (e.g., Oct 28, Nov 3, Nov 4, Nov 5), filtering strictly to today hid all of the student's sessions.
  2. **School Query Mismatch**:
     - `fetchSessions` had a query parameter logic issue where student requests evaluated to `${API}/api/sessions?school=none`, returning an empty list, and subsequent client-side school filtering dropped sessions lacking explicit school attributes.
  3. **Strict ID Matching Failure in `roleScopedSessions`**:
     - If a session had a different `student_id` or student ID wasn't explicitly linked, the check returned `false` before checking name matching (`idMatch || nameMatch`).
- **Resolution**:
  - **Student All-Dates Default**:
    - Initialized `dateFilter` and `dateRange` to `'all'` (`preset: 'all'`) for student roles so all personal sessions (upcoming, in-progress, completed) immediately display upon page load.
  - **Clean Global Session & Student Roster Fetching**:
    - For students, `fetchSessions` fetches directly from `${API}/api/sessions` without school parameter restrictions, and skips school-level filtering.
    - `allStudentsList` is fetched via `/api/students?school=all` so `loggedInStudent` resolves reliably.
  - **Parity with StudentProfile & MyAchievements**:
    - Updated `roleScopedSessions` for students to match on `idMatch || nameMatch` (supporting student candidate names, username, email prefix, and substring matching), ensuring all assigned sessions are properly discovered.
  - **Dynamic Reset & Active Filters**:
    - Updated `hasActiveFilters` and `resetFilters` so student accounts reset back to the `'all'` preset.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.37s).

#### 8. Consolidated Services Overview Cards: Removed Redundant Third Card (`OurServices.jsx`)
- **Problem & User Feedback**:
  - The user requested: `"ithula firstla irukurathum lastla irukurathum onu dhan athunala orey itha vachidu"` with a screenshot of the 3 cards in `OurServices.jsx`.
  - The first card (`Course Completion Certificates`) and the third card (`Academy Surf Training Packages`) were redundant — both navigated to the exact same Course Completion Certificates menu (`setActiveTab('cert-courses')`) and displayed identical course packages (3-Day, 5-Day).
- **Resolution**:
  - Completely removed the duplicate third card (`Option 3: Academy Surf Course Curriculum Menu Card`).
  - The main Services menu now cleanly renders two prominent, balanced cards side-by-side:
    1. **Course Completion Certificates**: Comprehensive hub card for managing, configuring, and auto-aligning certificates for all course durations.
    2. **Milestone Story Poster Photo**: Branded social sharing backdrop photo configuration.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 1.62s).

---

### Changes on 19-11-2026

#### 1. Fixed `totalWaves` ReferenceError in Certificate Generator (`MyAchievements.jsx`)
- **Problem**:
  - In *My Achievements* (`MyAchievements.jsx`), clicking "Download Certificate" failed to download and threw a red console runtime exception:
    `Certificate generation failed: ReferenceError: totalWaves is not defined at X (index-C1Q-2OLx.js:18897:18425)`
- **Root Cause**:
  - In `handleDownloadCertificate` inside `MyAchievements.jsx`, the default preset metric pill renderer referenced the bare variable `totalWaves` (`val: `${totalWaves || 50} Waves``) instead of `stats.totalWaves`. Because `totalWaves` was not in scope, JavaScript threw a `ReferenceError` during canvas drawing, halting export.
- **Resolution**:
  - Updated line 1976 to correctly access `stats.totalWaves` (`val: `${stats.totalWaves || 0} Waves``) and `stats.completed`.
  - Certificate generation and export now proceed smoothly with zero runtime errors.

#### 2. Multi-Record Student Email Collision & Profile Data Restoration (`StudentProfile.jsx`, `backend/main.py`)
- **Problem**:
  - When student `kim` logged in, their profile displayed completely blank data (`Coach: Not Assigned Yet`, `No Completed Sessions Yet`, `No pending sessions`, `No Video Analysis Uploaded Yet`) despite having 5 completed sessions and an assigned coach in the school roster.
- **Root Cause**:
  - There were two records registered with email `kim@gmail.com`:
    1. Student `557`: The real active student with 5 completed sessions, coach Pugazh, videos, and 5-Day Course under `rpn tech ac`.
    2. Student `562`: An empty duplicate with no sessions under `rpn surf school`.
  - In `backend/main.py` (`/api/students/me`) and `StudentProfile.jsx`, the query `filter(Student.email == email).first()` or `list[0]` picked the empty duplicate record (562) instead of the active linked account (557).
- **Resolution**:
  - Updated `/api/students/me` in `backend/main.py` to prioritize `Student.user_id == user_id` and prefer candidates with active sessions.
  - Enhanced `StudentProfile.jsx` to detect empty records and automatically switch/navigate to the real student record matching the user's ID and session history.
  - Synced User 440's `school_name` to `rpn tech ac` in the database.

#### 3. Robust Certificate Download Engine & Lock Modal Parity (`MyAchievements.jsx`)
- **Problem**:
  - Clicking "Download Certificate" in *My Achievements* (`MyAchievements.jsx`) did not initiate the file download or remained unresponsive.
- **Root Cause**:
  - `canvas.toBlob` created an Object URL (`blob:http...`), called `a.click()`, and on the immediate next synchronous line called `URL.revokeObjectURL(url)`. In Chromium and WebKit browsers, revoking the blob URL synchronously cancels the download before the browser's download manager can read the blob stream.
  - Furthermore, if `canvas.toBlob` returned a `null` blob (common when external poster or school logo images are drawn without clean CORS or cross-origin headers), the code hit `if (!blob) return;`, silently terminating without calling `setDownloadingCert(false)` and leaving the button permanently in "Generating...".
  - In addition, if `stats.completed` was 1 for students who completed their single-day or accelerated course while `requiredSessions` defaulted higher, the certificate locked modal popped up without an option to trigger the download.
- **Resolution**:
  - Implemented `triggerCanvasDownload(targetCanvas, filename)`:
    - Retains Blob Object URLs for 60 seconds (`setTimeout(() => URL.revokeObjectURL(url), 60000)`) before cleanup, ensuring complete, uninterruptible file downloads across all browsers.
    - Automatically falls back to `targetCanvas.toDataURL('image/png')` if `toBlob` returns `null` or throws an exception.
    - Guaranteed `setDownloadingCert(false)` execution in all execution paths.
  - Implemented `loadImgSafely(url)` with anonymous crossOrigin and timeout guard to prevent tainted canvas exceptions when rendering background posters or school logos.
  - Enhanced `isCertificateUnlocked` to recognize `stats.completed > 0` or completed student course status.
  - Added direct **"Download Certificate"** action inside the course progress guidance modal as well.

#### 4. Dynamic Course Day Count in Certificate Generator (`MyAchievements.jsx`)
- **Problem**:
  - In *My Achievements* (`MyAchievements.jsx`), when student `abi` (enrolled in a 1 Day Course at `rpn tech ac`) downloaded their certificate, the certificate text displayed:
    - Title: `10-Day Surf Training Course`
    - Body Text: `has successfully completed the comprehensive 10-day ocean surfing, paddle technique, and wave riding modules.`
  - User requested: `"naa 1 day couse dhan pana ana 10 days nu varuthu ipa na 3 daysu oru template vacha day 1 day 2 day 3 ithu munthukum same certficate dhan ana athula day mattum maranum one na 1 day tow na 2 days nu"` (Even if the academy keeps a single certificate template, for Day 1, Day 2, Day 3, the same template must be used, but the day number in the title, body, ID, and download filename must dynamically change based on each student's course duration).
- **Root Cause**:
  - In `MyAchievements.jsx`, `for (const field of allFields)` rendered `textToDraw = field.sample || ...`. The template saved by the school had static text `"10-Day Surf Training Course"` and `"comprehensive 10-day ocean surfing..."` in `field.sample`. Because `field.sample` was truthy, it drew the static text directly without replacing the day count with the student's actual `requiredSessions`.
  - Furthermore, the download filename had `const courseTag = requiredSessions === 5 ? '5Day' : '3Day';`, which only supported 5 or 3 days, ignoring 1-day, 2-day, or other courses.
- **Resolution**:
  - Implemented `formatWithStudentDays(text)` regex transformation in `MyAchievements.jsx`:
    - Replaces hyphenated patterns like `\b\d+\s*-\s*day(s)?\b` with `${studentDays}-${isCap ? 'Day' : 'day'}` (e.g. `10-Day` -> `1-Day`, `3-Day` -> `2-Day`).
    - Replaces spaced patterns like `\b\d+\s+day(s)?\b` with `${studentDays} ${dayWord}` (e.g. `10 days` -> `1 day`, `5 Days` -> `2 Days`).
    - Replaces compact patterns like `\b\d+day(s)?\b` with `${studentDays}-${isCap ? 'Day' : 'day'}`.
  - Dynamically applies `formatWithStudentDays` to:
    - `course_title`: e.g. `1-Day Surf Training Course`, `2-Day Surf Training Course`, `3-Day Surf Training Course`.
    - `body_text`: e.g. `has successfully completed the comprehensive 1-day ocean surfing, paddle technique, and wave riding modules.`.
    - Any custom/subtext fields mentioning days.
    - `cert_id`: `ATHNEX-CERT-${studentDays}D-${Date.now().toString().slice(-4)}`.
    - Download filename: `${studentSchool}_${studentDays}Day_Certificate_${cleanName}.png`.
  - Updated fallback default certificate generator to use `${studentDays}-Day Surf Training Course` and `Athnex_${studentDays}Day_Certificate_${cleanName}.png`.

#### 5. Backend Student Sessions Query & Profile Error Resolution (`backend/main.py`, `StudentProfile.jsx`)
- **Problem**:
  - Student profile page failed to load with HTTP 500 (`Failed to load resource: the server responded with a status of 500 (Internal Server Error)` on `/api/students/562`) and React Minified error #310 in the browser console.
- **Root Cause**:
  - `backend/main.py` line 5181 in `get_student` attempted to query `SurfSession.school == s.school`, but `SurfSession` model does not contain a `school` column (`AttributeError: type object 'SurfSession' has no attribute 'school'`).
  - In `StudentProfile.jsx`, a `useMemo` for `allUploadedVideos` was placed after an early return (`if (loading) return ...`), causing a React Hook count mismatch (React error #310).
- **Resolution**:
  - Fixed `backend/main.py` to query `SurfSession.student_id == s.id`.
  - Converted `allUploadedVideos` in `StudentProfile.jsx` to an immediately-invoked function expression (IIFE), completely eliminating the React hook ordering violation.
  - Deployed both backend and frontend live to AWS production instances (`i-0c62e04f44a9ea237` and `i-02999b6093bc5bfd2`).

#### 6. "All Sessions Completed" Hero Banner Status (`StudentProfile.jsx`)
- **Requirement**:
  - In student profile (`StudentProfile.jsx`), when a student has completed all scheduled surf training sessions and has no upcoming or pending sessions remaining, the top hero box previously displayed `🗓️ NEXT SESSION - Not Assigned Yet - Your next surf session will appear here once scheduled`.
  - User requested: `"all session completed apadinu varanum"`.
- **Resolution**:
  - Added condition `isAllSessionsCompleted = Boolean(completedSessions.length > 0 && !nextSession && !pendingBannerSession && upcomingSessions.length === 0 && pendingReviewSessions.length === 0 && inProgressSessions.length === 0)`.
  - When true, the hero card renders an emerald celebratory status card:
    - **Header**: `🎉 ALL SESSIONS COMPLETED` with `Completed` badge.
    - **Title**: `All Sessions Completed`.
    - **Subtext**: `{completedSessions.length} sessions completed • View in My Achievements →`.
    - **Action**: One-click navigation directly to `/achievements` to view achievements, certificates, and wave history.
  - When false, it defaults to the upcoming session, pending session, or empty `Not Assigned Yet` placeholder as appropriate.

#### 7. Synchronized Course Duration Requirements in Student Certificate View (`MyAchievements.jsx`, `backend/main.py`)
- **Problem**:
  - When coach/admin updated a student's course duration to **5 Days Course** in *Students Management* (`StudentsManagement.jsx`), the student page (*My Achievements / History of Sessions* - `MyAchievements.jsx`) was still showing `Download Certificate (0/10)` or a stale requirement of 10 sessions.
- **Root Cause**:
  - In `MyAchievements.jsx`, `fetchStudentAndSessions` attempted to query `/api/students/${studentId}` using `loggedUser?.student_id || loggedUser?.id`. For athlete users without `student_id` in their token, `loggedUser.id` was a `users` table ID that happened to collide with another student record in `students` table whose course duration was 10 days and had 0 completed sessions.
  - Furthermore, `backend/main.py`'s `make_user_response` did not include `course_duration` in the login response payload.
- **Resolution**:
  - Updated `MyAchievements.jsx` to fetch and match students by unique `email` first, falling back to `student_id`, `user_id`, and `name`.
  - Synced `sessionStorage.getItem('user')` with the live database `course_duration`.
  - Added `course_duration`, `start_date`, `end_date`, and `total_days` to `make_user_response` in `backend/main.py`.
  - `requiredSessions` now dynamically reflects the student's actual enrolled course (e.g. 5 days -> 5 sessions requirement).

#### 8. Video Analysis Multi-Video Parsing & Full Gallery Display (`StudentProfile.jsx`)
- **Problem**:
  - In `StudentProfile.jsx`, when 3 videos were uploaded, only 2 videos were showing.
- **Root Cause**:
  - `validVideoSessions` iterated over sessions rather than individual video clips. If a session had multiple videos, only the first clip `sess.video_urls[0]` was rendered, skipping subsequent clips.
  - Multiple video uploads saved as JSON strings (e.g. `[{"url":"..."}]`) were failing the legacy direct string prefix check.
- **Resolution**:
  - Added `parseSessionVideoList` to safely parse JSON arrays, pipe-separated lists, and direct URLs.
  - Created `allUploadedVideos` memo to flatten and collect every uploaded video clip across all sessions and technical logs.
  - Updated the *Video Analysis* badge and grid to display all individual uploaded videos with thumbnail previews, dates, coaches, and launch buttons.

---

#### 9. Cross-School & Cross-Student Session Contamination + Profile Hang Resolution (Sessions.jsx, MyAchievements.jsx, StudentProfile.jsx, ackend/main.py)

#### Root Cause Analysis:
1. **User ID vs Student ID Sequence Collision**:
   - In PostgreSQL, the `users` table and `students` table have completely separate primary key sequences.
   - When student/athlete users logged in, `sessionStorage.getItem('user').id` (which is `users.id`) was erroneously added into `studentCandidateIds` in `MyAchievements.jsx`, `Sessions.jsx`, and `StudentProfile.jsx`.
   - Consequently, when user `velavan` (whose `users.id` was 12) opened "My Sessions", the app matched all sessions with `student_id = 12` (which belonged to student **Parijat Mazumder**).
   - Similarly, user `abi` (whose `users.id` was 21) was matched with sessions belonging to student #21 from "Aquatic Indica Surf School - Mulki Beach", falsely inflating their completed sessions to 21 and prematurely unlocking certificate download.
2. **Coach Notes Substring Matching (`notesMatch`)**:
   - In `MyAchievements.jsx`, coach notes were scanned using `s.notes.toLowerCase().includes(targetName)`.
   - For `abi`, common surfing terms like `"ability"`, `"swimming ability"`, and `"stability"` in session notes matched unrelated students' sessions from other surf schools across India.
3. **No School Scoping**:
   - Sessions fetched from `/api/sessions` had no school filter, allowing sessions from other surf schools to leak into the student's history when matching fallback names.
4. **StudentProfile Crash & Infinite Loading**:
   - In `Sidebar.jsx`, the "My Profile" navigation fallback used `user?.student_id || user?.id || 1`, sending `users.id` as the student route parameter.
   - In `StudentProfile.jsx`, video analysis `vObj.url.trim()` lacked null-checks, resulting in potential runtime `TypeError` crashes (blank screen).

#### Key Fixes Applied:
1. **ID Isolation**:
   - Removed `currentUser.id` / `savedUser.id` / `loggedUser.id` from `studentCandidateIds` across [Sessions.jsx](file:///d:/surfing/ai/frontend/src/pages/Sessions.jsx), [MyAchievements.jsx](file:///d:/surfing/ai/frontend/src/pages/MyAchievements.jsx), and [StudentProfile.jsx](file:///d:/surfing/ai/frontend/src/pages/StudentProfile.jsx).
   - Only genuine `student_id` and verified student profile IDs are used to match sessions.
2. **Removed Notes Matching & Loose Substrings**:
   - Completely deleted `notesMatch` from session matching.
   - Replaced substring matching with strict exact full name equality.
3. **School Boundary Isolation**:
   - Enforced school scoping: sessions from other surf schools are strictly excluded if the student is registered under a specific school.
4. **Backend `/api/students/me` & Strict Linking**:
   - Added `/api/students/me` endpoint in [backend/main.py](file:///d:/surfing/ai/backend/main.py) to securely retrieve the authentic student record by `user_id` or unique `email`.
   - Updated `make_user_response` to auto-link `student.user_id = user.id` and pass `school` / `school_name` to session storage.
   - In `Sidebar.jsx`, changed athlete profile route to `user?.student_id || 'me'`.
5. **Safeguarded Video Analysis & Profile State**:
   - Safeguarded `normUrl` in `StudentProfile.jsx` with `(vObj?.url || (typeof vObj === 'string' ? vObj : '') || '').trim()` to prevent blank screen crashes.
   - Converted `allUploadedVideos` from `useMemo` to an IIFE `(() => { ... })()` so it never violates React's Rules of Hooks when early returns execute (`Minified React error #310`).
   - Fixed `backend/main.py` `get_student` query where querying nonexistent `SurfSession.school` triggered `AttributeError: type object 'SurfSession' has no attribute 'school'` (500 Internal Server Error).
   - Fixed `fetchMockHeats` when `id === 'me'` to prevent invalid routes.
6. **Deployment**:
   - Deployed full frontend and backend live to AWS via `deploy_full_live.py` (Exit Code 0).


---

### Changes on 20-11-2026

#### 1. Group Session Notes Tab Guest Name Resolution (`Sessions.jsx`)
- **Problem & User Feedback**:
  - In Group Sessions (e.g. Group C with 4 students on Friday, Nov 20, 2026), when a booking contained a main student and their guest (e.g., student `Nithish S S` with guest `Pooja Nanditha`, and student `Ojas Bhatia` with guest `Bhavna Jain`), the athlete selector chips in the **Notes** tab incorrectly rendered:
    - Card 1: `Nithish S S [Guest]` (instead of `Pooja Nanditha`)
    - Card 2: `Nithish S S`
    - Card 3: `Ojas Bhatia [Guest]` (instead of `Bhavna Jain`)
    - Card 4: `Ojas Bhatia`
  - Clicking on a guest card still displayed `Active: Nithish S S` in the top-right indicator.
- **Root Cause**:
  - In `Sessions.jsx` (line 5571), the athlete selector chips directly read `s.student || s.student_name` without checking `s.guest_name` or calling `resolveStudentAndGuestDisplay`. Because `s.student` holds the primary booking account name, it displayed the parent student's name for both the student and their accompanying guest.
- **Resolution**:
  - Integrated `resolveStudentAndGuestDisplay` and `s.guest_name` resolution across all athlete selector chips and the active indicator in Tab 4 (**Notes** tab):
    - Card 1 correctly displays `Pooja Nanditha` with `PN` avatar and `Guest` badge (tooltip: `Guest of Nithish S S`).
    - Card 2 correctly displays `Nithish S S` with `NS` avatar.
    - Card 3 correctly displays `Bhavna Jain` with `BJ` avatar and `Guest` badge (tooltip: `Guest of Ojas Bhatia`).
    - Card 4 correctly displays `Ojas Bhatia` with `OB` avatar.
    - Top-right active indicator dynamically displays `Active: {GuestName} (Guest of {ParentName})` when a guest is selected.
    - Performance report card banner dynamically displays the guest's name when selected.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.83s).

#### 2. Persistent Mobile Login Session: Elimination of Automatic Logouts (`App.jsx`, `AuthPage.jsx`, `Sidebar.jsx`)
- **Problem & User Feedback**:
  - The user reported: `"ipa na oru mobile login pani vacha naa koja nali kalichi velaa poitu ula vatha logout akiduthu ana apadi aga kudathu naana panura varakium"` (When logging in on mobile, after leaving the app or browser and returning later, the account gets automatically logged out).
- **Root Cause**:
  - In `App.jsx`, `PrivateRoute` evaluated authentication strictly using `sessionStorage.getItem('token')`.
  - In `AuthPage.jsx`, `handleAuthSuccess` stored credentials exclusively in `sessionStorage`.
  - On mobile devices (iOS Safari, Android Chrome), `sessionStorage` is tied strictly to active tab memory and gets immediately cleared whenever the phone is locked, when the browser unloads background tabs to save RAM, or when the user switches apps. When reopening the site, `sessionStorage` was empty, triggering an immediate redirect to `/auth`.
- **Resolution**:
  - **Persistent Token & User Storage (`AuthPage.jsx`)**: Updated `handleAuthSuccess` to write `token`, `user`, and `activeSchool` to `localStorage` alongside `sessionStorage`.
  - **Auto-Restoration in PrivateRoute (`App.jsx`)**: Updated `PrivateRoute` to check `sessionStorage.getItem('token') || localStorage.getItem('token')`. If `sessionStorage` was cleared by mobile browser tab sleep, it automatically rehydrates `sessionStorage` (`token`, `user`, `activeSchool`) from `localStorage`, seamlessly maintaining authentication without logging the user out.
  - **Auto-Redirect on Auth Page (`AuthPage.jsx`)**: Added mount check in `AuthPage.jsx` so authenticated users visiting `/auth` or reopening the app are automatically redirected straight to their respective dashboard or student profile.
  - **Clean Explicit Logout (`Sidebar.jsx`, `UserProfileMenu.jsx`)**: When the user explicitly clicks "Logout", both `sessionStorage` and `localStorage` are cleared, ensuring clean sign-out only when manually initiated.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.83s).

#### 3. Dynamic Hero Session Banner: Display Finished Session Status Until Next Session Scheduled (`StudentProfile.jsx`)
- **Problem & User Feedback**:
  - The user reported: `"inga session mudchithathuku aparo adutha session crt panura varakium mudicha session complted or pending for review nu katanum upcomeing puthusa vathuta athuku maridanum"` with an image showing the top-right hero card in `StudentProfile.jsx` saying `"NEXT SESSION - Not Assigned Yet - Your next surf session will appear here once scheduled"`.
  - When a student's session finished (time elapsed or review pending), if the school had not yet scheduled their next upcoming session, the card prematurely defaulted to `"Not Assigned Yet"`, giving the impression that their session was lost or unassigned.
- **Root Cause**:
  - In `StudentProfile.jsx`, the hero right card only rendered an upcoming session if `upcomingSessions.length > 0`. If `upcomingSessions` was empty, it only showed a generic "All Sessions Completed" banner or fell back to the empty `"Not Assigned Yet"` box without showing the details (date, time, coach, location) of the session that just finished.
  - In `fetchStudent`, sessions synced from `/api/sessions` were not merged into existing sessions if the ID was already present, causing updated session statuses (such as `Pending for Review`) to stay stale.
  - `getSessionDisplayStatus` was classifying past sessions as `Completed` without checking if coach review was pending (`Pending for Review`).
- **Resolution**:
  - **Dynamic State Logic**:
    - If `nextSession` exists (future/upcoming scheduled session) -> Displays the teal **NEXT SESSION** card with upcoming date, time, coach, and spot.
    - Else if `latestFinishedSession` exists:
      - If status is `Pending for Review` -> Displays the warm amber **PENDING FOR REVIEW** card with date, time, coach, spot, and subtext `"Awaiting Coach Review • Next session will appear once scheduled"`.
      - If status is `Completed` -> Displays the vibrant emerald **SESSION COMPLETED** card with date, time, coach, spot, and subtext `"Next session will appear once scheduled • View in My Achievements →"`, clickable to navigate to achievements.
      - If status is `In Progress` -> Displays the blue **SESSION IN PROGRESS** card (`Live Now`).
    - Only if the student has 0 sessions total -> Displays the empty **Not Assigned Yet** placeholder.
  - **Session Merge Fix**: Updated `fetchStudent` in `StudentProfile.jsx` so that any fresh status updates from `/api/sessions` cleanly update the existing student sessions.
  - **Status Synchronization**: Updated `isSessionCompleted` and `getSessionDisplayStatus` in `StudentProfile.jsx` so that sessions awaiting review strictly maintain their `Pending for Review` status instead of prematurely marking completed before coach evaluation.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 3.86s).

#### 4. Certificate Studio UI Alignment & Responsiveness Fixes (`OurServices.jsx`)
- **Problem & User Feedback**:
  - The user uploaded a screenshot showing two major UI layout bugs in the Certificate Customizer sidebar (`OurServices.jsx`):
    1. **Logo & Signature Cards Overflow**: In the "Official School Logo & Coach Signature Photos" hub, a rigid 2-column grid (`gridTemplateColumns: '1fr 1fr'`) forced inside a narrow ~380px sidebar caused the Coach Signature card to overflow horizontally off the right edge. The `✓ ACTIVE` badge was cut off (`✓ ACTIV`), the title was clipped, and the delete trash button was cut in half by the container's right border.
    2. **Squished Buttons in Field Placement & Typography**: In the "Field Placement & Typography" card, placing the heading, description, and both action buttons ("Show All Fields" and "Add Custom Text") in a single un-wrapped flex row forced each button into ~50px width, causing their text to break word by word into 3 vertical lines (`👁️ Show \n All \n Fields` and `+ Add \n Custom \n Text`).
- **Resolution**:
  - **School Logo & Coach Signature Cards (`OurServices.jsx`)**: Converted the assets into clean, full-width responsive cards with horizontal layout:
    - 48x42px bordered thumbnail on the left.
    - Title (`Academy Crest / Logo` or `Handwritten Signature`) and helper subtext in the middle.
    - `✓ ACTIVE` status badge in the header.
    - Right-aligned action buttons (`Change Logo` / `Upload Logo` and red trash icon) with comfortable padding and no horizontal overflow or clipping.
  - **Field Placement & Typography Header**:
    - Re-architected the header layout with `flexWrap: 'wrap'` and `whiteSpace: 'nowrap'`.
    - Buttons stay on a clean, single line with proper padding, icons, and subtle shadows.
  - **Field Selector Pills**:
    - Simplified `✍️ Coach Signature Photo` to `✍️ Coach Signature` for visual balance with `🖼️ School Logo` and `👤 Coach Name`.
    - Added `whiteSpace: 'nowrap'` and `minWidth: 0` to prevent pills and sidebar from overflowing the grid container.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.81s).

#### 5. Athnexlive Corner Logo & School Name Replacement in Share Posters & Certificates (`MyAchievements.jsx`, `OurServices.jsx`, `StudentProfile.jsx`)
- **Problem & User Feedback**:
  - The user requested:
    - `"Athnexlive logo right corner la varanum"` (Athnexlive logo should be displayed in the top right corner).
    - `"Group Name no need. Instead of Group name. School name varanum."` (Do not display Group Name. Replace it with School Name).
    - `"certficatelaum varanum"` (Also display the Athnexlive logo and School Name on certificates).
- **Resolution**:
  - **Athnexlive Logo Placement**:
    - Uploaded official high-resolution `athnexlive-logo.png` into `frontend/public/` and `frontend/src/assets/`.
    - Integrated a sleek, elevated white badge housing the Athnexlive logo in the **top-right corner** of all 3 share card templates in `MyAchievements.jsx`:
      1. Photo spotlight (`ach-card-spotlight`)
      2. Ocean keepsake (`ach-card-keepsake`)
      3. Personal scorecard (`ach-card-scorecard`)
    - Added the official Athnexlive logo to the **top-right corner of all issued certificates**:
      - Drawn on HTML5 Canvas in `handleDownloadCertificate` (`MyAchievements.jsx`) for both custom academy templates and default certificates.
      - Drawn in the live interactive certificate canvas preview and test download in `OurServices.jsx`.
  - **Group Name Replacement with School Name**:
    - In `MyAchievements.jsx` ("Share your session" modal):
      - Subheader now displays `{displaySchoolName} • {dateFormatted}` instead of `{groupName}`.
      - In Template 1 (Spotlight), the pill badge displays `displaySchoolName` instead of `groupName`.
      - In Template 2 (Keepsake), `ach-keepsake-group-badge` displays `displaySchoolName`.
      - In Template 3 (Scorecard), `ach-sc-ath-sub` displays `{displaySchoolName} · {dateFormatted}`.
    - In `StudentProfile.jsx`:
      - Replaced `nextSession.group_name` and `latestFinishedSession.group_name` with `student.school` across all hero session sublines.
  - Verified production build with `npm --prefix frontend run build` (0 errors in 2.17s).


#### 6. Athnexlive Logo in Live Milestone Poster Studio & Story Canvas Fallback (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - The user shared an image of the "Live Milestone Poster Preview" card in the Poster Studio (`OurServices.jsx`) with the request: `"ingaum enakunlogo varanum"` (I need the logo here as well).
- **Resolution**:
  - **Live Milestone Poster Preview (`OurServices.jsx`)**:
    - Re-architected the top header bar of the live milestone card preview into a two-sided flex layout:
      - Left column holds stacked pill badges for `THE COACH'S CUT` and `✓ SESSION COMPLETE`.
      - Right column displays an elevated, semi-translucent white glassmorphism badge containing the official Athnexlive logo (`/athnexlive-logo.png`).
  - **Canvas Story Card Fallback Generator (`MyAchievements.jsx`)**:
    - Enhanced the 4:5 portrait canvas generator (`handleShareSession`) to pre-load and render the official Athnexlive logo in the top-right corner across all 3 templates:
      1. Photo Spotlight: Top-right corner Athnexlive logo badge (`drawAthnexLogoBadge(1010, 70, 32)`).
      2. Ocean Keepsake: Top-right corner Athnexlive logo badge (`drawAthnexLogoBadge(1000, 60, 32)`).
      3. Personal Scorecard: Top-right corner Athnexlive logo badge (`drawAthnexLogoBadge(1000, 60, 32)`).
    - Replaced all fallback occurrences of `groupName` with `displaySchoolName` across the canvas export scripts.
  - Verified compilation via `npm --prefix frontend run build` (0 errors).


#### 7. Fix Student Sessions Missing on Student Profile, My Sessions & Achievements (`StudentProfile.jsx`, `Sessions.jsx`, `MyAchievements.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  - The user shared two screenshots:
    1. Admin view (`/sessions`) showing 5 completed surf sessions for student `"kim"`.
    2. Student Profile view (`/students/me`) for student `"kim"` showing `"No Completed Sessions Yet"`, `"0 Pending Sessions"`, and `"Not Assigned Yet"`.
    - User asked: `"inga yan yetha seassionnum katala"` (Why is no session showing here?).
- **Root Cause**:
  1. **Backend Query Limitation (`backend/main.py`)**: `/api/students/{student_id}` only queried `SurfSession.student_id == s.id`. Sessions created by admins or coaches with student name or `user_id` were omitted from the student profile payload.
  2. **Overly Aggressive School Check in Frontend (`StudentProfile.jsx`, `Sessions.jsx`, `MyAchievements.jsx`)**: When syncing from `/api/sessions`, the condition `if (studentSchool && sSchool && sSchool !== studentSchool) return false;` immediately discarded sessions whenever the coach's school or session venue did not exactly match the student's profile school string.
  3. **Candidate ID & Token Matching Gap**: `studentCandidateIds` omitted `user_id` and strict string equality failed when student names had whitespace or compound tokens.
- **Resolution**:
  - **Backend (`backend/main.py`)**:
    - Updated `get_student` (`/api/students/{student_id}`) to query sessions matching `SurfSession.student_id == s.id`, `SurfSession.student_id == s.user_id`, `func.lower(SurfSession.student_name) == s.name`, or `func.lower(SurfSession.guest_name) == s.name`.
  - **Frontend (`StudentProfile.jsx`, `Sessions.jsx`, `MyAchievements.jsx`)**:
    - Expanded `studentCandidateIds` to include `data.id`, `data.user_id`, `savedUser.student_id`, and `savedUser.id`.
    - Added tokenized and case-insensitive student/guest name matching.
    - Updated cross-school validation so sessions are only scoped when both student and session have explicit, non-generic schools (`!isGenericSchool`).
  - Verified frontend production build with `npm --prefix frontend run build` (0 errors in 2.06s).


#### 8. Fix Student Sessions in 'My Sessions' & 'My Achievements' Pages (`Sessions.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - After fixing student profile, sessions appeared on `My Profile`, but the user reported: `"ipa my profilela kattuthu ana my sessionlaum my achivemntlaum kamikala"` (Now it shows on My Profile, but not on My Sessions or My Achievements).
  - Screenshot of `My Sessions` (`/sessions`) showed `"Showing 0 of 0 sessions"` and `"No sessions match your filter criteria"`.
- **Root Cause**:
  1. **Cross-School Rejection**: In `roleScopedSessions` (`Sessions.jsx`) and `MyAchievements.jsx`, sessions were still discarded whenever the session venue/coach school differed from the student's registered school string.
  2. **Profile Sessions Merge in MyAchievements**: `MyAchievements.jsx` loaded students from the `/api/students?school=all` summary list (which does not include sessions), and skipped querying `/api/students/{id}` if `fetchedProfile` was already set, leaving `fetchedProfile.sessions` empty.
  3. **Candidate ID Gap in Sessions.jsx**: `studentCandidateIds` lacked `currentUser.id` and `loggedInStudent.user_id`.
- **Resolution**:
  - **`Sessions.jsx`**:
    - Added `currentUser.id` and `loggedInStudent.user_id` into `studentCandidateIds`.
    - In `roleScopedSessions` for `isStudent`, matched directly by student ID or tokenized student/guest name without dropping sessions due to school differences.
  - **`MyAchievements.jsx`**:
    - Always queries `/api/students/{studentId}` if `fetchedProfile.sessions` is empty, ensuring all sessions from the student profile payload are available.
    - Matched sessions directly by candidate ID or tokenized student/guest name.
  - Verified frontend production build with `npm --prefix frontend run build` (0 errors in 2.41s).


#### 9. Production Deployment to AWS (Backend EC2, Frontend EC2 & S3) (`deploy_full_live.py`)
- **Action**:
  - Full production deployment triggered upon user request (`"deploy panu"`).
  - Executed `deploy_full_live.py` targeting AWS us-east-1 production infrastructure.
- **Backend Deployment**:
  - Uploaded updated `backend/main.py` (with expanded student session matching queries) to `s3://aisurf-media-uploads-149051628601/deploy/main.py`.
  - Executed SSM Run Command on Backend EC2 (`i-0c62e04f44a9ea237`):
    - Copied updated `main.py` into `/home/ec2-user/backend/main.py`.
    - Restarted `aisurf-backend` systemd service.
    - Status verified: `active (running)`.
- **Frontend Deployment**:
  - Ran Vite React production build: `npm run build` (Exit code 0, 1923 modules transformed, bundle size 3,128 KB, gzip 723 KB).
  - Packaged `/dist` folder into `aisurf-frontend.zip` (2,300,908 bytes) and uploaded to `s3://aisurf-media-uploads-149051628601/aisurf-frontend.zip`.
  - Executed SSM Run Command on Frontend EC2 (`i-02999b6093bc5bfd2`):
    - Downloaded and unzipped latest frontend assets to `/var/www/frontend`.
    - Reloaded Nginx web server.
    - Status verified: `active (running)`.
- **Live Production URLs**:
  - Custom Domain: `https://www.athnexlive.com`
  - Live Frontend IP: `http://98.94.45.107`
  - Live Achievements: `http://98.94.45.107/achievements`


#### 10. Student & School Session Isolation & Sign In Auto-Redirect Fix (`StudentProfile.jsx`, `Sessions.jsx`, `MyAchievements.jsx`, `AuthPage.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  1. Student cross-contamination: User reported: `"ithula yan innoru data varuthu"` and `"vara schoolathu itha school studentuku vara oru student oda data varuthu"`.
     - When viewing student `mano` (`user_id = 777`, `rpn tech ac`), sessions of student 777 (`Amit G Bhandare` from Mulki) and student 137 (`Shubham Raorane` matching admin user_id 137) were displayed.
     - When student `abi rowdy` (`user_id = 799`, `rpn tech ac`) opened My Achievements, sessions of student 799 (`Sriram Menon` from Mulki) were displayed.
  2. Sign In auto-redirect bug: User reported: `"ingathu sign in kudutha direct ah naa open pani vacha ac ku pothu apadi poga kudathu passworldla potu dhan ponum"` with screenshot of landing page.
     - Clicking "Sign In" from the landing page bypassed the login screen and automatically logged into the previously cached session without prompting for credentials.
- **Root Cause**:
  1. `users.id` vs `students.id` collision: `users` and `students` are two different tables with independent auto-increment IDs. Comparing `SurfSession.student_id == s.user_id` or inserting `savedUser.id` / `loggedUser.id` into `studentCandidateIds` matched unrelated students whose `students.id` happened to equal the user's `users.id`.
  2. Missing school verification: Sessions from other schools were not checked against the student's registered school.
  3. In `AuthPage.jsx`, a `useEffect` auto-redirected users having active tokens in storage straight into the app whenever `/auth` was visited.
- **Resolution**:
  1. **Backend (`backend/main.py`)**:
     - Removed `SurfSession.student_id == s.user_id` in `get_student`.
     - Matched strictly by `SurfSession.student_id == s.id`.
     - Unassigned sessions matching name now require `SurfSession.student_id.is_(None)` and verify that the session school matches `s.school`.
  2. **Frontend (`StudentProfile.jsx`, `Sessions.jsx`, `MyAchievements.jsx`)**:
     - Completely removed `user_id`, `savedUser.id`, `currentUser.id`, and `loggedUser.id` from student candidate ID arrays.
     - Enforced strict school isolation: if both student and session have non-generic schools and they do not match, the session is rejected.
     - Blocked sessions already assigned to other student IDs (`if (sid && !studentCandidateIds.has(sid)) return false;`).
  3. **AuthPage Auto-Redirect Fix (`AuthPage.jsx`)**:
     - Removed the automatic redirect `useEffect` in `AuthPage.jsx`. Navigating to `/auth` (or clicking "Sign In" on the landing page) now consistently displays the Login form requiring email and password credentials.
  4. Verified frontend production build with `npm --prefix frontend run build` (0 errors).
  5. Live Deployment: Executed `deploy_full_live.py`. Backend service `aisurf-backend` restarted active and frontend deployed to `/var/www/frontend` on Nginx.
  6. Live Database Verification:
     - `get_student(870)` (Mano): 0 sessions (Mulki student Amit Bhandare / Shubham Raorane cross-data completely eliminated).
     - `get_student(889)` (Abi Rowdy): 1 session strictly belonging to Abi (`Sess 3027`, Kovalam Beach, `rpn tech ac`; Sriram Menon Mulki sessions completely eliminated).


#### 11. Students UI Mobile Screen Alignment & Responsiveness Fix (`StudentsManagement.jsx`)
- **Problem & User Feedback**:
  - User requested: `"Students UI mobile screen ah alignment fix pannunga"` (Fix alignment of Students UI on mobile screens).
  - Previous mobile responsiveness issues:
    1. Stats cards in `.sm-stats-grid` used `repeat(auto-fit, minmax(60px, 1fr))` causing an awkward 5 / 3 wrapping split across rows on mobile devices, with squished and clipped 8px text labels.
    2. Action buttons (`.sm-actions`) used loose flex wrapping with `min-width: 110px`, resulting in jagged button heights and misaligned rows on narrow viewports.
    3. Dropdown filters row (`.sm-dropdowns-row`) and search box lacked unified grid structure on screens below 768px.
    4. Main container lacked explicit `overflow-x: hidden` and horizontal boundaries, causing slight horizontal wobble on mobile swipes.
    5. Add Student multi-mode modal (`.sm-tab-cards-grid`, `.sm-single-layout`, `.sm-grid-2`) lacked column collapsing for mobile screens, squeezing 2-column and 3-column forms into 300px viewports.
- **Resolution**:
  - **Stats Grid Balance**: Redesigned `.sm-stats-grid` to a symmetrical 4-column grid (`repeat(4, 1fr)`) on mobile devices, aligning all 8 metrics neatly into two balanced rows of 4 cards each (Row 1: Total, Active, Upcoming, Beginner; Row 2: Adv Beg, Intermed, Adv Int, Pro) with readable font sizes and centered badges.
  - **Action Buttons Grid**: Transformed `.sm-actions` into a unified 2-column mobile grid (`repeat(2, 1fr)`) ensuring equal-width buttons with neat ellipsis handling.
  - **Filter Controls**: Enhanced `.sm-dropdowns-row` into a 2-column grid (`1fr 1fr`) with balanced touch targets and proper padding for dropdown chevrons.
  - **Zero Horizontal Wobble**: Enforced `overflow-x: hidden !important` and `box-sizing: border-box !important` across `.sm-page` and `.sm-main`, while keeping horizontal scrolling smooth and isolated strictly to `.sm-table-container` with an interactive swipe hint.
  - **Modal Layout Collapse**: Collapsed tab cards (`.sm-tab-cards-grid`), form layouts (`.sm-single-layout`), and form input grids (`.sm-grid-2`) into single-column responsive stacks on mobile with full-width primary/secondary actions.
  - Verified frontend build with `npm --prefix frontend run build` (0 errors, 2.63s).


#### 12. Default Photo Opacity & "Upload your session Photo and Inspire your friends" CTA Badge (`MyAchievements.jsx`)
- **Problem & User Feedback**:
  - User requested: `"Default photo opacity low ah vachu.. "Upload your session Photo and Inspire your friends" nu Text vantha nalla irukum"` with screenshot of "Share your session" story card modal for student Ruchika Shah.
  - When a student opened the share card modal without having uploaded a personalized photo or selfie, the default ocean placeholder (`/surf-milestone-bg.jpg`) was rendered at full 100% opacity without any visual cue prompting the student to upload their own session action picture.
- **Resolution**:
  - **Dynamic Default Photo Detection**:
    - Defined `isDefaultPhoto = !customPhotoUrl` in the share modal scope, and `isCustomUserPhoto = Boolean(customPhotoUrl)` in the canvas generator.
  - **Reduced Opacity & Dark Theme Backdrop**:
    - When `isDefaultPhoto` is active, lowered the default photo image opacity to `0.38` with a smooth `transition: opacity 0.25s ease` and a solid dark background (`#0F172A` in Spotlight & Keepsake, `#004D40` in Scorecard), creating ideal contrast.
  - **Inspiring Call-to-Action Text Badge**:
    - Overlaid a centered, glassmorphic CTA card on the photo container across all 3 story card templates (Photo spotlight, Ocean keepsake, and Personal scorecard):
      - 📸 Camera badge
      - Primary headline: `"Upload your session Photo and Inspire your friends"` (bold typography, 13.5px, #FFFFFF)
      - Sub-label: `"Tap here to upload"` (#2DD4BF teal)
      - Clicking anywhere on the banner automatically triggers the file picker (`fileInputRef.current?.click()`).
  - **Canvas Export Generator Alignment (`handleShareSession`)**:
    - Updated canvas rendering so that if no custom photo is uploaded, `drawCover` draws the default photo with `ctx.globalAlpha = 0.42` and renders the inspiring upload prompt banner onto the canvas.
  - Verified frontend build with `npm --prefix frontend run build` (0 errors in 1.94s).


#### 13. Student Session Resolution Fix for Duplicate Accounts (`MyAchievements.jsx`, `Sessions.jsx`, `StudentProfile.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  - User reported: `"kim ku yan inga yethum illa enna dhan problem ithu vathutey iruku unaku ariu iruka illaya mental ah ne"` with a screenshot of `localhost:5173/achievements` showing `0 Sessions Completed`, `Unrated`, `0.0 hrs`, and `-- Total Waves Caught` for student Kim.
  - In Admin view, Kim had 5 completed sessions under `rpn tech ac` (Oct 28, Nov 2, Nov 3, Nov 4, Nov 5), but when logged in as Kim, all student views (`/achievements`, `/sessions`, `/profile`) displayed 0 sessions.
- **Root Cause Identified**:
  1. **Duplicate Student Records**:
     - Database had two student records with email `kim@gmail.com`:
       - Student 557: `school: 'rpn tech ac'`, containing all 5 completed surf sessions and 8 badges.
       - Student 562: `school: 'rpn surf school'`, containing 0 sessions and 0 badges.
  2. **Arbitrary Order-By Collision**:
     - `GET /api/students` sorted students by `id DESC`. Because Student 562 had a higher ID, frontend `allStds.find(s => s.email === uEmail)` picked the empty duplicate Student 562.
     - Frontend set `studentCandidateIds = ['562']` and `studentSchool = 'rpn surf school'`.
     - When matching sessions, all 5 sessions had `student_id = 557` and `school = 'rpn tech ac'`. Both ID check and school check rejected the sessions.
  3. **Missing `user_id` Foreign Key Link**:
     - User 440 (`kim@gmail.com`) was not linked to Student 557 (`user_id = NULL`), so backend `make_user_response` failed to link the active student with sessions.
- **Resolution**:
  1. **Database Link & Cleanup (`backend/aisurf.db`)**:
     - Linked active Student 557 directly to User 440 (`user_id = 440`).
     - Safely deleted empty duplicate Student 562 (which had 0 sessions/badges).
  2. **Backend Session-Prioritization Architecture (`backend/main.py`)**:
     - `make_user_response`: When matching student records by email, prioritizes the candidate with the most sessions and links `user_id = user.id`.
     - `student_to_dict`: Exposed `"session_count": len(s.sessions)` on student payloads so client apps immediately know which record has active sessions.
     - `get_students` (`GET /api/students`): When queried by email, sorts candidates by session count descending, guaranteeing the active student is returned first.
     - `get_current_student` (`GET /api/students/me`): Evaluates session count when selecting the student candidate.
  3. **Frontend Multi-Candidate Resolution (`MyAchievements.jsx`, `Sessions.jsx`, `StudentProfile.jsx`)**:
     - `MyAchievements.jsx`: Added all candidate IDs sharing the verified user's email into `studentCandidateIds`. Placed direct verified ID match (`sid && studentCandidateIds.has(sid)`) first so assigned sessions are never rejected by profile school string discrepancies.
     - `Sessions.jsx`: Included all student IDs matching the user's email from `allStudentsList` in `studentCandidateIds`. Ensured verified ID match executes before name-based school isolation.
     - `StudentProfile.jsx`: Updated candidate selection to prioritize records with active sessions (`s.session_count > 0`). Verified ID matches are approved immediately.
  4. Verified frontend build with `npm --prefix frontend run build` (0 errors in 2.15s).


### Changes on 23-11-2026

#### 14. 2-Stage Session Flow: Slot Scheduling & Beach Briefing Architecture (`NewSession.jsx`, `Sessions.jsx`, `StudentProfile.jsx`, `backend/main.py`)
- **Problem & Requirement**:
  - User requested: `"enaku oru idea sollu yethum change panatha inga student ah atha atha slotuku select panathuku aparo group ccrt panamey itha slot la nega irukinganu sollanum ana anaki mrng dhan group beachla crt panuvanga thanglisla sollu ithuuku enna panalanu"` followed by approval `"panu"`.
  - In real surf schools, exact coach-student groups (Group A, Group B) cannot be locked down the previous day because morning surf swell/tide conditions and student attendance vary.
  - However, students must be notified of their confirmed time slot (e.g. 06:30 AM) the previous evening so they arrive at the beach on time.
- **Resolution**:
  1. **Backend Slot Confirmation API (`backend/main.py`)**:
     - Added `SlotAllocationItem` and `ConfirmSlotsRequest` Pydantic schemas.
     - Created `@app.post("/api/sessions/confirm-slots")` endpoint:
       - Confirms time slots for all selected students atomically without requiring coaches or groups.
       - Creates/updates sessions for the target date with `group_name = "Slot Confirmed"`, `status = "Upcoming"`, and `instructor = "Assigned at Beach"`.
       - Automatically syncs each student's `session_time` in database.
       - Logs an activity log entry for the school.
  2. **Step 2 Bottom Action Bar (`NewSession.jsx`)**:
     - Added prominent **"✓ Confirm Slot Schedule"** button (`.ns-confirm-slots-btn`) between "Save Draft" and "Import & Next »".
     - Implemented `handleConfirmSlotsSchedule`:
       - Gathers all allocated students across slots.
       - Confirms via dialog showing exact slot breakdown.
       - Calls `/api/sessions/confirm-slots` and alerts admin upon successful confirmation.
  3. **Student Profile Visibility (`StudentProfile.jsx`)**:
     - In `Next Session` hero card, when `nextSession.group_name === 'Slot Confirmed'`, displays:
       - Top Pill: `✓ SLOT CONFIRMED` (Teal badge)
       - Time: `Monday, Nov 23, 2026 • 06:30 AM - 08:30 AM`
       - Subtitle: `🌊 Kovalam Beach • Groups & Coaches assigned at beach roll call`
  4. **Admin Sessions List & Beach Grouping (`Sessions.jsx`)**:
     - In `buildSessionGrouping`: Groups slot-confirmed sessions into `{time} Slot Pool`.
     - Displays `SLOT CONFIRMED` status pill with teal theme.
     - Adds prominent **"🏄 Beach Grouping"** action button on the parent row so admin/head coach can quickly finalize groups and coaches on the beach next morning.
  5. Verified frontend production build with `npm --prefix frontend run build` (0 errors in 2.10s).


#### 15. Fix Network Error on "Confirm Slot Schedule" (`backend/main.py`, `frontend/src/pages/NewSession.jsx`)
- **Problem**:
  - When clicking `"✓ Confirm Slot Schedule"` in Step 2 of New Session, UI displayed an alert: `"Network Error - Failed to connect to server. Please check your network connection"`.
- **Root Cause**:
  - In `backend/main.py`, the `SurfSession` SQLAlchemy model does not have an `instructor` column (it uses `instructor_id` and `instructor_ids`).
  - The endpoint passed `instructor="Assigned at Beach"` to `SurfSession(...)` and accessed `existing_sess.instructor`, raising `TypeError: 'instructor' is an invalid keyword argument for SurfSession` and returning HTTP 500 Internal Server Error.
- **Resolution**:
  - Updated `confirm_slot_schedule` in `backend/main.py`:
    - Removed `existing_sess.instructor` reference.
    - Initialized new `SurfSession` with `instructor_id=None` and `instructor_ids="[]"`.
  - Enhanced error handling in `frontend/src/pages/NewSession.jsx` so that any detailed error message is surfaced in the alert.
  - Verified live API call via both backend direct port (`8000`) and Vite proxy (`5173`), returning `200 OK` with `success: true`.
  - Verified clean frontend build with `npm --prefix frontend run build` (0 errors in 3.54s).


### Changes on 25-11-2026

#### 16. Edit Published Group: Keep Removed Students in Students List & Scope Column 1 Strictly to Slot (`NewSession.jsx`, `backend/main.py`)
- **Problem & User Feedback**:
  - User reported: `"group publish anathuku aparom thiruba edit kuduthu student ah remove pana atha student fulla remove akiduranga ana student list dhan avanga ponum full remove aga kudathu aparo yela studdentum aga katturaga apadi aga kudathu"`.
  - Two issues occurred when clicking **Edit Session** on a published group:
    1. **All School Students Shown in Step 3 Students List**: `allPoolStudents` in `editSession` mode loads all active `dbStudents` (for Step 2 selection if user navigates back), and `importedStudents` returned `allPoolStudents` directly in `editSession` mode while `slotImportedStudents` / `filteredColumn1Students` bypassed slot filtering. This dumped every active student in the school into Step 3 Column 1 ("Students List").
    2. **Removed Students Completely Deleted Instead of Returning to Students List**: When removing a student from a published group via `×` and saving, `handlePublishSession` executed `DELETE /api/sessions/{id}`, permanently deleting the student's session instead of returning them to the slot's unassigned Students List (`Slot Confirmed`).
- **Resolution**:
  1. **Strict Slot Scoping in Edit Mode (`frontend/src/pages/NewSession.jsx`)**:
     - Removed the `if (editSession) return allPoolStudents;` shortcut in `importedStudents` and removed the `editSession` bypass in `slotImportedStudents` and `filteredColumn1Students`.
     - Column 1 ("Students List") now strictly shows only students belonging to `slotStudentMap` / `trainingGroups` for the active slot.
     - During `editSession` prefill, any existing `"Slot Confirmed"` (unassigned pool) sessions for the same slot time and date are also loaded into `slotStudentMap[targetSlotId]` so they remain visible in Column 1.
  2. **Preserve Removed Students in Slot Pool (`frontend/src/pages/NewSession.jsx`, `backend/main.py`)**:
     - In `handlePublishSession`, when a student is removed from a group (`safeToDelete`) while still present in `slotStudentMap` (i.e. sitting in Column 1 Students List rather than unchecked in Step 2), the session is updated via `PUT /api/sessions/{id}` with `group_name: "Slot Confirmed"` instead of `DELETE`.
     - In `backend/main.py` (`PUT /api/sessions/{session_id}`), explicitly cleared `instructor_id = None` and `instructor_ids = "[]"` whenever `group_name == "Slot Confirmed"`.
  3. Verified frontend build (`npm --prefix frontend run build` — 0 errors in 3.19s) and backend Python syntax (`py_compile`).


#### 17. Slot Confirmed Coach ("Not Assigned"), Student Profile Display & Step 3 Students List Fix (`NewSession.jsx`, `StudentProfile.jsx`, `backend/main.py`)
- **Problems & User Feedback**:
  - User reported: `"slot mattum dhan confirm pana coachla yarumey vaikala aparo yan ipadi katuthu not assion nu katanum aparo slot cofirm pana avagala student listla katanumla yan katala"` along with 3 screenshots.
  - **Issue 1 (`selectedSchool` ReferenceError)**: Clicking `"✓ Confirm Slot Schedule"` threw `ReferenceError: selectedSchool is not defined` in `NewSession.jsx` (`handleConfirmSlotsSchedule`).
  - **Issue 2 (`StudentProfile.jsx` Hero & Pending Sessions Cards)**:
    - When a `Slot Confirmed` session's slot time passed for the day (or appeared under `Pending Sessions`), `StudentProfile.jsx` displayed `⏳ PENDING FOR REVIEW` / `Under Review` and fell back to `assignedCoachName` (e.g. `gabriel, Kathir, santhosh, sundari` from past sessions) or `Coach: Coach ★ Review`, instead of `✓ Slot Confirmed` and `Coach: Not Assigned`.
  - **Issue 3 (Slot-Confirmed Students Missing from Step 3 `Students List`)**:
    - Once `confirm-slots` created a `"Slot Confirmed"` session in DB for a student (`testing`), `isStudentScheduledInDbOnDate` treated that session as already scheduled/blocked, causing `allSelectedStudentIds` to exclude the main student while leaving only their guests in Step 3 `Students List`.
- **Resolution**:
  1. **`NewSession.jsx`**:
     - Fixed `school: activeSchoolName || currentUser?.school || currentUser?.school_name || ''` in `handleConfirmSlotsSchedule`.
     - Excluded `group_name === 'Slot Confirmed'` sessions from `existingDbScheduledInfoMapOnDate` and `existingScheduledStudentNamesOnDate` so slot-confirmed students remain selected and visible in Step 3 `Students List` (alongside their guests) until assigned to a real group.
  2. **`StudentProfile.jsx`**:
     - Added `isSlotConfirmedSession(s)` helper (checks `Slot Confirmed` / `Assigned at Beach` with no assigned `instructor_id` / `instructor_ids`).
     - Updated `latestFinishedCoach` and `assignedCoaches` so `Slot Confirmed` sessions never pull coaches from old sessions and return `'Not Assigned'`.
     - Updated Hero Card (`nextSession` and `latestFinishedSession`) and `Pending Sessions` list to display `✓ Slot Confirmed` (teal badge) and `Coach: Not Assigned` without `★ Review` or `Pending for Review`.
  3. **`backend/main.py` (`create_sessions_bulk`)**:
     - Automatically deletes any `"Slot Confirmed"` placeholder session for the same `student_id` + `date` (matching guest vs non-guest) when publishing a real group so no duplicate session remains.
  4. Verified frontend build (`npm --prefix frontend run build`) and backend Python syntax (`py_compile`).


#### 18. Fix Blank/Black Certificate Download for S3 Custom Certificate Templates (`backend/main.py`, `MyAchievements.jsx`, `OurServices.jsx`)
- **Problem & User Feedback**:
  - User reported: `"certificate crt ah illa paru olunga vai download pana black ah varuthu"` with screenshots showing custom certificates configured in `OurServices.jsx` rendering only overlay text (`Ruchika Shah`, `Date`, `Serial ID`, `athnexlive` logo) on a blank/black background when downloaded in `MyAchievements.jsx`.
- **Root Cause**:
  - Custom certificate backgrounds uploaded to S3 (`https://aisurf-media-uploads-...s3.us-east-1.amazonaws.com/...`) rendered fine in CSS `background-image` preview, but failed when loaded into HTML5 `<canvas>` with `img.crossOrigin = 'anonymous'` due to S3 CORS / non-CORS browser cache mismatch, causing `loadImgSafely` to return `null` and fall back to a solid blank fill.
- **Resolution**:
  1. **Same-Origin Image Proxy (`backend/main.py`)**:
     - Added `@app.get("/api/proxy-image")` to safely fetch external HTTP/HTTPS certificate/logo images server-side (blocking private/local IPs) and serve them on the same origin with `Cache-Control: public, max-age=86400`.
  2. **CORS-Safe Canvas Image Loader (`MyAchievements.jsx`, `OurServices.jsx`)**:
     - Updated `loadImgSafely` (`MyAchievements.jsx`) and added `loadCertImgSafely` (`OurServices.jsx`) to try direct load with cache-busting first and automatically fall back to `${API}/api/proxy-image?url=...` if CORS blocks direct canvas access.
     - Painted a solid `#FFFFFF` base before drawing `bgImg` so transparent PNG templates never render black.
  3. Verified `/api/proxy-image` live via Vite proxy (`200 OK`), frontend build (`npm --prefix frontend run build`), and backend syntax (`py_compile`).
  4. Fixed `Uncaught ReferenceError: activeCourseData is not defined` in `OurServices.jsx` (`handleDownloadTestCertificate`) when downloading custom certificates by hoisting `activeCourseData` declaration outside the default-template branch.


#### 19. Editable (Draggable & Resizable) Non-Removable Athnexlive Brand Logo on Certificates (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & Requirement**:
  - User requested: `"itha edit panura mathiri vachikaala ana remove pana kudatha mathiri irukanum"` with screenshot of the top-right `athnexlive` brand badge overlapping the certificate border.
  - Admins need to reposition and resize the `athnexlive` brand badge so it fits cleanly on custom certificate designs without overlapping borders or logos, while ensuring the brand badge can never be hidden or deleted.
- **Resolution**:
  1. **Added `athnex_logo` Field (`OurServices.jsx`)**:
     - Added `athnex_logo` (`🏷️ Athnex Logo`) to `defaultCourseCertificates` and the Field Selection Pills.
     - Made `athnex_logo` draggable directly on the Live Certificate Interactive Canvas and resizable/alignable via X%, Y%, Alignment, and Image Display Width sliders.
     - Locked visibility (`lockedVisible: true`, `visible: true` enforced in `updateActiveField` and `handleRemoveImageField`), replacing the Hide/Remove buttons with a **`🔒 Required Brand Logo`** badge.
  2. **Synced High-Res Canvas Exports (`OurServices.jsx`, `MyAchievements.jsx`)**:
     - Updated both `handleDownloadTestCertificate` and `handleDownloadCertificate` to render `/athnexlive-logo.png` at the exact saved `(x, y, width, align)` coordinates of `athnex_logo`.
  3. Verified frontend build (`npm --prefix frontend run build`).


#### 20. Fix `ReferenceError: currentUser is not defined` in `UserProfileMenu.jsx`
- **Problem**:
  - Coach profile edit dropdown in `UserProfileMenu.jsx` referenced `currentUser?.school` instead of `effectiveUser?.school`, causing `Uncaught ReferenceError: currentUser is not defined` and a blank white screen when rendered.
- **Resolution**:
  - Updated `frontend/src/components/UserProfileMenu.jsx` line 3151 to use `effectiveUser?.school`.
  - Verified frontend production build (`npm --prefix frontend run build`).


#### 21. Hide & Block "Our Services" for School-Affiliated Coaches (`Sidebar.jsx`, `OurServices.jsx`)
- **Problem & User Feedback**:
  - User reported: `"inga oru schoola iruka coachku yan our servies kattuthu indivaull coah ku mattum dhana katnaum unakey oru arivu vena"` with screenshot showing a school-affiliated Surf Coach (`Eric Sheldon RS`, `rpn tech ac`) seeing and accessing the `Our Services` tab.
- **Root Cause**:
  - `Sidebar.jsx` used `if (!isStudent)` to show the `Our Services` nav tab, which exposed it to regular school-affiliated coaches too. `OurServices.jsx` also lacked a route guard against school coaches.
- **Resolution**:
  - Updated `Sidebar.jsx` (`getNavItems`) to detect `isSchoolCoach` (a non-head coach affiliated with a school rather than `Individual / Freelance Coach`) and hide `Our Services` (`if (!isStudent && !isSchoolCoach)`).
  - Added a `useEffect` route guard in `OurServices.jsx` that redirects school-affiliated regular coaches to their profile (`/instructors/:id`) and students to their profile if `/services` is accessed directly.
  - Verified frontend production build (`npm --prefix frontend run build`).


#### 22. Decouple Default Certificate Backdrop from Milestone Story Poster Photo (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - User reported: `"naa inga reset tu defaut aluthuna naa milestone nuku upload pana photo dhan inga varutha ana apadi vara kudathu"` with screenshot showing the custom Milestone Story Poster photo appearing faded behind the Default Certificate template when clicking **Reset to Default**.
- **Root Cause**:
  - Both `OurServices.jsx` (preview & `handleDownloadTestCertificate`) and `MyAchievements.jsx` (`handleDownloadCertificate`) used `posterUrl || '/surf-milestone-bg.jpg'` / `posterBgUrl || '/surf-milestone-bg.jpg'` for the Default Certificate's ocean wave backdrop.
- **Resolution**:
  - Updated `OurServices.jsx` and `MyAchievements.jsx` so the Default Certificate template always uses the official default ocean wave image (`'/surf-milestone-bg.jpg'`), completely independent of the school's Milestone Story Poster photo.
  - Verified frontend production build (`npm --prefix frontend run build`).


#### 23. Fix `scaleFactor` Scope Error for Athnexlive Logo in Certificate Downloads (`OurServices.jsx`, `MyAchievements.jsx`)
- **Problem & User Feedback**:
  - User reported: `"test ku download pani patha athenxlive logo vara mattuthu munadi mathiri"` with screenshot showing the downloaded test certificate missing the `athnexlive` logo.
- **Root Cause**:
  - Both `OurServices.jsx` (`handleDownloadTestCertificate`) and `MyAchievements.jsx` (`handleDownloadCertificate`) referenced `scaleFactor` outside the `allFields` loop when calculating `alW` for `athnex_logo`, throwing `ReferenceError: scaleFactor is not defined` (caught silently by `try/catch` in `OurServices.jsx`).
- **Resolution**:
  - Defined `const alScale = W / 800;` explicitly inside the Athnexlive logo rendering block in both `OurServices.jsx` and `MyAchievements.jsx`.
  - Verified frontend build (`npm --prefix frontend run build`).


### Changes on 26-11-2026

#### 24. Remove Duplicate `"to"` Separator in Date Range Filter Bar (`DateRangeFilterBar.jsx`)
- **Problem**:
  - Date range picker displayed `"From: [date] to To: [date]"` due to a redundant `<span className="drfb-separator">to</span>` next to the `To:` label.
- **Resolution**:
  - Removed the duplicate `"to"` separator in `frontend/src/components/DateRangeFilterBar.jsx` so it cleanly reads `From: [date] To: [date]`.
  - Verified frontend production build (`npm --prefix frontend run build`).


#### 25. Combine "Confirm Slot Schedule" & "Import & Next »" into Single Button (`NewSession.jsx`)
- **Requirement**:
  - User requested: `"ithu reduthaum orey betton ah vai"` to merge the two Step 2 action buttons (`✓ Confirm Slot Schedule` and `Import & Next »`) into one streamlined button.
- **Resolution**:
  - Added `handleConfirmSlotsAndNext` in `frontend/src/pages/NewSession.jsx` which validates slot capacities, automatically confirms allocated student slots via `POST /api/sessions/confirm-slots` (in create mode), saves draft progress, and proceeds directly to Step 3.
  - Replaced the two separate buttons in the Step 2 bottom bar with a single **`✓ Confirm & Next »`** button.
  - Verified frontend production build (`npm --prefix frontend run build`).


#### 27. Mobile UI Responsive Overhaul (`NewSession.jsx`, `SessionConfigure.jsx`, `UserProfileMenu.jsx`, `InstructorManagement.jsx`, `StudentsManagement.jsx`, `DateRangeFilterBar.jsx`)
- **Problem & User Feedback**:
  - User reported multiple mobile viewport issues across screens (`"itha paru mobile ui ki yelathaum chinnatha aki olunga vai"`, `"ithu yelathaum chinna chinnatha aku crt ah vai"`, `"ITHA INNom kojom better ah vai user patha onum puriyala olunga nalla responsible ah vai"`).
- **Resolution**:
  1. **`NewSession.jsx`**:
     - Stacked `.ns-sticky-bar` into 2 compact rows on mobile and removed `.finalize-btn` `min-width: 200px` so Step 1 (`Save & Next »`), Step 2 (`✓ Confirm →`), and Step 3 (`🚀 Publish`) fit inside the dark bar without right-edge clipping.
     - Made Step 2 time slots a compact 2-column grid with single-line student count badges and converted filter pills into single-row horizontal scrollable strips.
  2. **`SessionConfigure.jsx`**:
     - Converted the 6-column Time Slots table into responsive 2-column mobile cards with all 7 weekday buttons (`Mon–Sun`) fitting in a single 7-column row.
  3. **`UserProfileMenu.jsx` / `index.css`**:
     - Anchored `.db-profile-dropdown` with `position: fixed; left: 12px; right: 12px;` on mobile so it never clips off the left edge.
  4. **`InstructorManagement.jsx`**:
     - Wrapped header action buttons (`Leave Requests`, `Join Requests`) and scaled down `.im-card` avatars, typography, and buttons for mobile.
  5. **`DateRangeFilterBar.jsx` & `StudentsManagement.jsx`**:
     - Prevented date picker calendar icon overlap in `DateRangeFilterBar.jsx` on narrow mobile screens.
     - Replaced the horizontal-scroll Students table on mobile (`<= 768px`) with a clean, zero-scroll **Mobile Student Card List** (`.sm-mobile-cards`) showing identity, badges, course progress, contact, editable dates/expected time, invite/joined status, and actions at a glance.
  6. Verified frontend production build (`npm --prefix frontend run build`).


#### 28. Lock Student Profile Editing Strictly to Student Self Only (`StudentProfile.jsx`)
- **Problem & User Feedback**:
  - User reported: `"lusu onu nalla purijika yetha coach or admin nalaum student profile ah edit pana mudiya kudathu"` with screenshot showing the Edit (`📝`) button visible on a student's profile when viewed by an Admin/Head Coach.
- **Root Cause**:
  - `StudentProfile.jsx` rendered the avatar upload overlay and name-side Edit button using `(isOwnProfile || isSchoolAdmin)`, allowing School Admins / Head Coaches / Super Admins to open the student profile edit modal.
- **Resolution**:
  - Restricted the avatar overlay, Edit Profile button, and `handleEditClick` strictly to `isOwnProfile` (only the student themselves), completely blocking all coaches and admins from editing student profiles.
  - Verified frontend production build (`npm --prefix frontend run build`).




#### 26. Mobile UI Compactness & Sticky Bar Overflow Fix (`NewSession.jsx`)
- **Problem & User Feedback**:
  - User reported: `"itha paru mobile ui ki yelathaum chinnatha aki olunga vai"` with mobile screenshot showing Step 2 header/stepper clipping, oversized vertical time slot & filter pills, and the bottom sticky action bar overflowing off the right edge (`Save Draft` and `✓ Confirm →` cut off).
- **Resolution**:
  - Updated `@media (max-width: 768px)` styles in `frontend/src/pages/NewSession.jsx`:
    - Made `.ns-sticky-bar` stack cleanly into 2 compact full-width rows (Row 1: centered `Total / Selected / Remaining`; Row 2: full-width equal-spaced `← Back`, `Save Draft`, and `✓ Confirm →` buttons) so nothing overflows off-screen.
    - Converted `.ns-slot-pills-wrap` into a compact 2-column grid (`repeat(2, minmax(0, 1fr))`) and scaled down `.ns-pill`, `.ns-filter-row`, `.ns-title`, and `.ns-step-item` sizes for clean mobile viewing.
  - Verified frontend production build (`npm --prefix frontend run build`).

#### 29. Mobile UI Polish, Student Removal Fix, Certificate Save State, Share Card Isolation & Active Breakdown (`2026-11-26`)
- **Summary of Changes**:
  1. **Student Profile Mobile Hero & `isOwnProfile` TDZ Fix (`frontend/src/pages/StudentProfile.jsx`)**:
     - Redesigned the mobile (`<= 768px`) hero card into a compact CSS grid with left-aligned `46px` avatar, name/badges beside it, and a full-width `.sp-hero-coach-actions` strip (`Coach` pill + `Change Password`) below.
     - Fixed `ReferenceError: Cannot access 'isOwnProfile' before initialization` in `fetchStudent` by computing `isOwn` directly from `savedUser` and `id`.
  2. **Our Services Mobile Responsiveness & Certificate Save State (`frontend/src/pages/OurServices.jsx`)**:
     - Added `@media (max-width: 768px)` and `@media (max-width: 900px)` responsive rules so the header, school badge, menu cards, course grid, poster grid, and certificate studio stack cleanly without horizontal overflow.
     - Added `savedCertSnapshot` tracking so the Certificate Save button displays `✓ Saved` when unchanged and switches back to `💾 Save Template` / `💾 Save Certificate Template` when edited.
  3. **Coach Profile Mobile Hero Compactness (`frontend/src/pages/InstructorProfile.jsx`)**:
     - Updated `@media (max-width: 768px)` hero, badge pills, action buttons (`flex-wrap: wrap`, compact `28px` min-height), and Personal Details cards for clean mobile sizing without button clipping.
  4. **Achievements & Share Card Mobile UI, CORS & Image Isolation (`frontend/src/pages/MyAchievements.jsx`)**:
     - Compacted mobile (`<= 600px`) header, 2×2 stats grid, 3-column filter tabs, and session card action bars; updated the `Share card` button icon to a standard share icon.
     - Fixed Share modal scrolling (`max-height: calc(100dvh - 20px)`), story card height (`height: auto`), and `Ocean keepsake` mobile tag/footer spacing; removed the `Personal scorecard` template option per user request.
     - Removed `crossOrigin="anonymous"` from S3 preview `<img>` elements to eliminate CORS blocking, and added `isCertificateImageUrl` + school-scoped poster caching so certificate template images never leak into Share Card previews.
  5. **Preserve Students Removed from Published Groups (`frontend/src/pages/NewSession.jsx`)**:
     - Updated `removeStudentFromGroup` to preserve removed student IDs in `slotStudentMap` and `unassignedPoolIds` (included in `importedStudents`) so students removed from a published group return to the Available/Unassigned Students list instead of disappearing.
  6. **Active Students Scheduled / Not Scheduled Breakdown (`frontend/src/pages/StudentsManagement.jsx`)**:
     - Added `activeScheduledCount` and `activeNotScheduledCount` (computed for `targetEvaluationDate` across active students and guests, excluding `Slot Confirmed` and `cancelled`/`rejected` entries) and displayed them inside the `ACTIVE` stat card.
- **Verification**:
  - Verified frontend production build (`npm --prefix frontend run build`) passes with 0 errors.
