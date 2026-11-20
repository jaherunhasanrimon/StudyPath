# design.md — Dishari (working title)

Version 1.0 · 17 November 2026
Audience: the AI coding agent (Google Antigravity) and the founder.
Companion files: `architecture.md`, `phases.md`.

---

## 1. Who this is for, and what it feels like

**Users.** Bangladeshi students, mostly 15 to 18, on mid-range Android phones, often a shared family phone, limited data, Bangla first. Occasionally a guardian. Later, admins and reviewers.

**The job.** "Tell me what to watch and do today, and keep me on track."

**The feel.** Calm, clear and a little warm. Like a class routine pinned on the wall, not a game and not a corporate dashboard.

---

## 2. Design direction: the Pathway

**The one thing to remember:** a stitched path runs down the screen and connects every class, quiz and assignment. As you finish things, the stitches fill in with solid thread.

**Where it comes from.** Every Bangladeshi student has seen the **class routine chart**: a weekly timetable pinned to a wall. And the **running stitch** of nakshi kantha is a dashed line of thread. The product's promise is a path from the first video to the last, so the path is the interface.

**What it looks like**

- A vertical rail of dashed stitches for what is ahead, solid thread for what is done.
- Knots on the rail: circle = class, diamond = quiz, square = assignment, small ring = review.
- One marigold knot with an ink outline marks **today** (or the next thing to do). It is the only place the marigold colour appears.
- Everything else stays quiet: paper background, ink text, one blue for actions.

**Where boldness is spent.** Only two places: the Pathway rail with its today knot, and the large serif title on Today. Restraint everywhere else.

**What to avoid**

- Purple or blue gradients, pastel blobs, stock illustrations of students, emoji as icons.
- Grids of identical rounded cards with shadows.
- Tracked all-caps labels and middle-dot meta strings. Use sentence-case labels and real separate elements.
- Streak confetti, guilt copy, leaderboards that name minors.
- The default look of any UI kit. Override shadcn's default palette, radii and fonts.
- Cream background with terracotta, and near-black with acid green.

---

## 3. Principles

1. **One next step.** Each screen has one primary action.
2. **A promise, not a prison.** Missed days are normal. Replanning is easy and never shames.
3. **Show the arithmetic.** Every schedule can explain itself ("Why this plan?").
4. **Bangla first, bilingual by design.** Every string exists in `bn` and `en`.
5. **Light on data.** No autoplay, lazy thumbnails, offline plan.
6. **Quiet by default.** Bold only on the Pathway.
7. **Less typing.** Paste, tap, step. Sensible defaults.

---

## 4. Tokens

### 4.1 Colour

Light is the default; dark follows the operating system with a manual toggle. Contrast ratios below were computed against WCAG 2 luminance.

| Token | Light | Dark | Use | Contrast |
|---|---|---|---|---|
| `ink` | `#14202B` | `#E7EEF0` | Primary text | 15.3:1 on paper; 14.9:1 on night |
| `paper` | `#F5F7F4` | `#0F1B23` | Page background | n/a |
| `surface` | `#FFFFFF` | `#16262F` | Sheets, dialogs, inputs | n/a |
| `slate` | `#52636E` | `#9DB0BA` | Secondary text | 5.8:1 on paper; 7.8:1 on night |
| `border` | `#6B7A84` | `#7B919E` | Control borders, rail dashes | 4.1:1 on paper; 5.3:1 on night |
| `mist` | `#D9E2DE` | `#2A3D48` | Decorative hairlines only | 1.2:1, never for essential boundaries |
| `river` | `#1B6E8A` | `#5FB3D1` | Actions, links, focus | 5.4:1 on paper; 7.4:1 on night |
| `marigold` | `#F2A900` | `#F2A900` | Today and next knot only | Never as text; ink on marigold is 8.2:1 |
| `paddy` | `#2B7A4B` | `#5BC48A` | Done | 4.9:1 on paper; 8.1:1 on night |
| `brick` | `#B5402F` | `#F08A7A` | Overdue, error | 5.2:1 on paper; 7.2:1 on night |

**Rules**

- **Never convey status by colour alone.** Pair colour with shape, an icon and a text label.
- Marigold always carries a 2 px ink outline and ink content on top.
- Primary buttons use `river` with `paper` text (5.4:1).

### 4.2 Typography

Load with `next/font`, subsets `bengali` and `latin`. **Verify availability on Google Fonts** and use the fallbacks if a family is missing.

| Role | Family | Fallbacks |
|---|---|---|
| Display (page titles, the Today heading) | Tiro Bangla | Newsreader, Noto Serif Bengali, Georgia, serif |
| UI and body | Anek Bangla (variable) with Anek Latin for Latin text | Noto Sans Bengali, system-ui, sans-serif |
| Maths | KaTeX fonts | |

**Scale (ratio 1.2):** 12, 14, 16 (body), 19, 23, 28, 34, 40 px.

| Style | Size and weight | Use |
|---|---|---|
| Display XL | 40/48, 600 | Today heading, home hero |
| Display L | 34/42, 600 | Page titles |
| Title | 23/32, 600 | Section titles |
| Heading | 19/28, 600 | Row titles |
| Body | 16, 400 | Text |
| Label | 14, 500, sentence case | Form labels, meta |
| Caption | 12, 500 | Only non-essential notes |
| Numeric | 16, 500, tabular figures | Times, durations, scores |

**Rules.** Bangla line-height 1.7, Latin 1.5. Maximum line length 65 characters. No letter-spacing on Bangla. No italics for Bangla. Latin digits for times and dates by default, with a setting for Bangla digits. Set `lang` on elements so each script gets the right font.

### 4.3 Space, shape, motion

- **Spacing** (4 px base): 4, 8, 12, 16, 24, 32, 48, 64.
- **Radii:** inputs 6, buttons 8, sheets and dialogs 16 (top corners only on mobile). Knots are circles, diamonds, squares. Do not apply one radius everywhere.
- **Elevation:** none on the page. Dialogs and sheets: `0 8px 24px rgba(20,32,43,.18)`. No card shadows.
- **Motion:** 120–180 ms ease-out for state changes. The Pathway "thread-in" is the single orchestrated moment: when a plan is created, the rail draws from the top to the today knot over 400 ms and the knots fade up 20 ms apart (maximum 10). It plays once per plan creation. With reduced motion, show the final state instantly.

### 4.4 CSS variables and Tailwind mapping

```css
:root {
  --ink:#14202B; --paper:#F5F7F4; --surface:#FFFFFF; --slate:#52636E;
  --border:#6B7A84; --mist:#D9E2DE; --river:#1B6E8A; --marigold:#F2A900;
  --paddy:#2B7A4B; --brick:#B5402F;
  --radius-input:6px; --radius-button:8px; --radius-sheet:16px;
  --font-display:"Tiro Bangla","Newsreader","Noto Serif Bengali",Georgia,serif;
  --font-ui:"Anek Bangla","Anek Latin","Noto Sans Bengali",system-ui,sans-serif;
}
:root[data-theme="dark"] {
  --ink:#E7EEF0; --paper:#0F1B23; --surface:#16262F; --slate:#9DB0BA;
  --border:#7B919E; --mist:#2A3D48; --river:#5FB3D1; --marigold:#F2A900;
  --paddy:#5BC48A; --brick:#F08A7A;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ink:#E7EEF0; --paper:#0F1B23; --surface:#16262F; --slate:#9DB0BA;
    --border:#7B919E; --mist:#2A3D48; --river:#5FB3D1; --marigold:#F2A900;
    --paddy:#5BC48A; --brick:#F08A7A;
  }
}
:focus-visible {
  outline: 3px solid var(--river);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px var(--paper);
}
body { background: var(--paper); color: var(--ink); font-family: var(--font-ui); line-height: 1.7; }
```

Tailwind: extend `colors` with `ink`, `paper`, `surface`, `slate`, `border`, `mist`, `river`, `marigold`, `paddy`, `brick` as `var(--name)`; extend `fontFamily` with `display` and `ui`; extend `borderRadius` with `input`, `button`, `sheet`. Remove shadcn's default neutral palette.

---

## 5. Layout

- **Mobile first,** 360 px baseline. Breakpoints at 640 and 1024 px. Content maximum width 1100 px; the Pathway column maximum 720 px.
- **Mobile navigation:** a bottom bar with four items: Today, Plans, Progress, Me. Icon plus visible label always. Respect `env(safe-area-inset-bottom)`.
- **Desktop:** a left rail with icon and text. Plan preview is a two-pane view (Pathway left, details right).
- **Page structure:** header with the display-font title and a one-line context; main content; a sticky bottom action bar when there is a primary action.
- **Surfaces:** content sits as rows on the paper. Use `surface` only for sheets, dialogs, the quiz result summary and inputs.

---

## 6. The Pathway component

| Part | Spec |
|---|---|
| Rail | 2 px line, 20 px from the left edge on mobile. Upcoming: dashed (`stroke-dasharray: 6 5`, round caps) in `border`. Done: solid 3 px `paddy`. The stretch between the last done item and the today knot stays dashed |
| Knots | Visible 14 px, hit area 44 px. Class = circle, quiz = diamond, assignment = square, review = small ring |
| States | Upcoming: outline in `border`. Today or next: `marigold` fill with 2 px `ink` outline. Done: `paddy` fill with a check glyph. Missed: `brick` outline with an exclamation glyph and the word "Missed". Skipped: hollow with a slash and the word "Skipped" |
| Week pins | A sentence-case label attached to the rail: "Week 2, 23–29 Nov" (14/600) |
| Item row | Title (Heading style), then separate text elements for weekday, time range and duration, then a status word at the right |
| Interaction | Tap a row to expand details and the Start button. In edit mode a drag handle appears, plus a "Move…" menu with date and time pickers (the accessible alternative to dragging) |
| Semantics | An ordered list (`<ol>`). The today item has `aria-current="step"`. Each item's accessible name includes its status, for example "Class 3, Monday 19:30, 58 minutes, not started" |
| Implementation | Draw the rail and knots as SVG; keep all text in HTML |

---

## 7. Screens

### 7.1 Home (signed out)

```
+------------------------------+
| Dishari            বাংলা  EN  |
|                              |
| Paste a playlist.            |   display serif, 40 px
| Get a schedule.              |
|                              |
| +--------------------------+ |
| | youtube.com/playlist...  | |   input, 56 px tall
| +--------------------------+ |
| [ Build my schedule ]        |   river button
| Try a sample playlist        |
|                              |
|  o---- Add a playlist        |   mini Pathway as the explainer
|  :                           |
|  o---- Choose your days      |
|  :                           |
|  o---- Follow the path       |
|                              |
| No ads. We embed YouTube     |
| videos and never copy them.  |
+------------------------------+
```

### 7.2 New plan: four steps

Step names: Playlist, Pace, Checks, Plan. Show them as a text stepper ("Step 2 of 4: Pace"), not a row of tiny circles.

**Playlist.** Paste box, then a preview: title, channel, "10 classes, 10 h 12 min", warnings as icon plus text lines, the first five videos with durations and a "Show all" control, an order hint ("Order looks sequential" or "Order may be off", with a reorder control).

**Pace**

- Start date picker, default the next study day.
- **WindowPicker:** seven day chips in the user's week order. Tapping a chip toggles it; a selected day reveals a time range. A "Same for all selected days" option. A live line: "You have 7 h 30 min a week."
- **Pace mode** (segmented): Fastest, Classes per week, Minutes per day, Finish by date. Show only the input for the chosen mode.
- **Speed** (segmented): 1×, 1.25×, 1.5×.
- "Extra time for pausing and notes" slider from 0% to 50%.
- "Group short videos into classes" toggle, shown only when the playlist has many short videos.

**Checks**

- **CadenceSelector** for quiz and for assignment: segmented options 1, 2, 3, a custom stepper, "At the end", "Never". Helper text computes the outcome: "Quiz after classes 2, 4, 6, 8, 10 (5 quizzes)".
- Question count (5, 10, 15, 20). Assignment length stepper in minutes.
- Toggles with one-line explanations: spaced review, weekly test, one catch-up day each week.

**Plan.** See 7.3.

**Defaults** **[A]:** start on the next study day; windows Saturday, Monday and Wednesday 19:30–22:00 (editable); speed 1×; quiz every 2 classes with 10 questions; assignment every 3 classes; review off; weekly test off; buffer off.

### 7.3 Plan preview (the heart)

The pure scheduler runs in the browser, so the preview updates as controls change (debounced 150 ms). The server recomputes on save.

```
+----------------------------------------------------------------------+
| Higher Math 1st Paper, Chapter 1                  [ Change settings ]|
| 10 classes, 10 h of video. Finishes Sat 5 Dec. 7 study days.         |
| [check] Fits your plan    [triangle] 2 warnings    [ Why this plan? ]|
+--------------------------------------+-------------------------------+
| Week 1, 21-27 Nov                    | Selected: Class 3             |
|  (o)  Class 1      Sat 19:30-20:30   | Mon 23 Nov, 19:30-20:30       |
|  (o)  Class 2      Sat 20:35-21:35   | 58 min at 1x                  |
|  <>   Quiz         Sat 21:40-21:55   | [ Move... ] [ Skip ]          |
|  (o)  Class 3      Mon 19:30-20:30   |                               |
|  [ ]  Assignment   Mon 20:35-21:05   | Day load: 95 of 150 min       |
| Week 2, 28 Nov-4 Dec                 |                               |
|  ...                                 |                               |
+--------------------------------------+-------------------------------+
| [ Add to calendar ]                              [ Start this plan ] |
+----------------------------------------------------------------------+
```

- **FeasibilityBanner** has three states, each with a distinct icon and a text label: *Fits your plan* (check circle), *Tight* (triangle, with the reason), *Not possible by your date* (octagon, with up to three one-tap suggestions such as "Watch at 1.25× and finish Sat 28 Nov").
- **"Why this plan?"** opens a drawer with the deterministic explanation: totals, days used, the busiest day, and which preferences shaped the result.
- On mobile the details pane becomes a bottom sheet. The two buttons form a sticky bar.

### 7.4 Today

```
+------------------------------+
| Today                        |   display serif
| Saturday 21 November         |
|                              |
| (*) Class 3                  |   marigold knot, large title
|     Limits and continuity    |
|     19:30 to 20:30, 58 min   |
|     [ Start class ]          |
|                              |
| Behind by one class          |
| Catch up: Class 2            |
|                              |
| Next                         |
|  <>  Quiz after Class 4      |
|  (o) Class 5     Wed 20:55   |
|                              |
|  Today | Plans | Progress | Me|
+------------------------------+
```

One primary action only. If nothing is due: "Nothing due today. Next class: Monday 19:30."

### 7.5 Class page

```
+------------------------------+
| [          video 16:9       ]|
| Video by Channel Name        |
| Open on YouTube              |
| Key points | Notes | Quiz    |
|  AI-generated, unchecked     |
|  - Limits of a function 02:10|
|  - Continuity at a point 14:45
| [ Mark as done ]             |
+------------------------------+
```

- The player is never covered, cropped or overlaid, and never autoplays [architecture.md 6.5].
- Key-point timestamps are buttons that seek the player.
- If the video cannot be embedded, show a clear "Watch on YouTube" button in the player's place.
- "Report a problem" is always reachable.

### 7.6 Quiz runner and results

- One question per screen. "Question 3 of 10" as text with a progress bar.
- Maths with KaTeX. MCQ options as full-width rows at least 44 px high with letter labels. Numeric answers use an input with an on-screen maths keyboard. Three hint levels, one tap each. Skip is allowed.
- Submit shows a short confirmation. Grading is on the server.
- **Results:** the score as text, a list of questions with right or wrong shown by icon, label and colour, an explanation, "Review at 12:30" links that open the class at that time, a badge ("AI-generated, checked" or "AI-generated, unchecked", or "Reviewed"), and a report button. Never shame; wrong answers are information.

### 7.7 Assignment

- **Problem set:** problems with hints. "Show worked solution" stays disabled until the student taps "I tried it".
- **Summary:** a prompt, a rubric as a checklist the student ticks, and a private text area.

### 7.8 Replan sheet

Bottom sheet on mobile, dialog on desktop.

```
+------------------------------+
| You missed 2 classes.        |
| Choose how to adjust:        |
| ( ) Keep my pace             |
|     Finish Sat 12 Dec (+7)   |
| ( ) Keep my finish date      |
|     +25 min per study day    |
| (o) A bit of both            |
|     Finish Wed 9 Dec (+4)    |
| [ See what changes ]         |
+------------------------------+
```

Next screen: the list of moved items (a diff), then **Apply**. After applying, an 8-second **Undo** toast.

### 7.9 Progress: the attendance register

No donut charts. Show an attendance register like a school roll book: one row per week, one cell per item.

```
Week      C1  C2  Q1  C3  A1  C4
Week 1    v   v   v   v   .   .
Week 2    v   x   -   .   .   .
```

`v` done, `x` missed, `-` skipped, `.` upcoming. Real UI uses the knot shapes and the words in an accessible table. Add a minutes-per-week bar chart, a quiz-score line (shown only with at least 5 points), and one plain sentence for plan health ("On track" or "About 2 days behind").

### 7.10 Settings and privacy

Language, timezone, week start, digits (Latin or Bangla), 12 or 24 hour time, reminders and quiet hours, data saver, data export, delete account, and a plain-language privacy summary with the guardian status for students under 18.

### 7.11 Guardian page

No login, large type, plain text. Example: "Rahim finished 3 of 4 classes this week. Quiz average 70%. Next: Class 5 on Monday at 20:00." A single "Withdraw consent" control.

### 7.12 Admin review (Phase 7)

Dense and keyboard-first is acceptable here: a queue of reported questions with approve, edit and hide actions.

---

## 8. Component inventory

| Component | Purpose | States to build |
|---|---|---|
| PathwayRail, PathwayItem, Knot, WeekPin | The signature element | upcoming, today, done, missed, skipped, loading, empty |
| CadenceSelector | "After every N classes" control | default, custom, end, never, error |
| WindowPicker | Choose study days and times | none, some, invalid range, copy to all |
| PaceModeControl, SpeedControl | Pace and playback speed | each mode |
| FeasibilityBanner | Fits, tight, not possible | three states with suggestions |
| WhyDrawer | Plan explanation | closed, open |
| PlayerFrame | Embedded player wrapper | loading, playing, blocked, offline |
| KeyPoints | AI key points with timestamp buttons | loading, ready, unchecked label, failed |
| NotesEditor | Private notes | empty, saving, saved |
| QuestionView | MCQ, numeric, short, true/false | unanswered, answered, hint open, reviewed |
| MathKeyboard | On-screen maths input | open, closed |
| HintLadder | Three hint levels | levels 0 to 3 |
| ResultList, ReviewLink | Quiz results | right, wrong, unchecked |
| AttendanceRegister | Progress table | empty, partial, complete |
| ReplanSheet | Replan choices and diff | choose, diff, applied, undo |
| EmptyState, ErrorState, SkeletonRows, OfflineBanner | System states | all |
| ConsentSheet | Guardian consent text and controls | pending, granted, withdrawn |
| Toast with Undo | Feedback | 8-second undo |
| LanguageSwitcher | bn and en | both |

**Empty states** use a single stitched line with one knot and a plain sentence, not an illustration.
**Icons:** Lucide, 1.5 px stroke, always with a text label where meaning matters. No emoji.

---

## 9. Interaction patterns

- **Defaults first.** The wizard is pre-filled; the student can build a plan with two taps after pasting.
- **Instant preview.** Changing any control updates the schedule immediately.
- **Undo over confirm.** Skip and move use an Undo toast. Only delete-plan asks for confirmation.
- **Honest waiting.** Long AI work shows "Reading the video, about a minute" and lets the student leave. A reminder or banner announces when it is ready.
- **Errors.** Say what happened and what to do next. Keep what the student typed. Never blame the student.
- **Notifications.** One a day at most. Missed-class messages offer a short catch-up, never guilt.

---

## 10. Content and microcopy

**Voice.** Plain, warm, direct. Short sentences. No exclamation marks except one on finishing a plan. No "Oops". No guilt.

**Terms.** Class (ক্লাস), quiz (কুইজ), assignment (অ্যাসাইনমেন্ট), plan (রুটিন), today (আজ). Use the same word every time.

**Starter strings.** The Bangla text is a draft and must be reviewed by a native speaker before release.

| Key | English | Bangla (draft) |
|---|---|---|
| paste.label | Paste a playlist link | প্লেলিস্টের লিংক পেস্ট করুন |
| cta.build | Build my schedule | আমার রুটিন তৈরি করুন |
| nav.today | Today | আজ |
| cta.start | Start class | ক্লাস শুরু করুন |
| cta.done | Mark as done | শেষ হয়েছে |
| cadence.quiz | Quiz after every 2 classes | প্রতি ২টি ক্লাসের পর কুইজ |
| missed.banner | You missed 2 classes. Let us fix the plan. | ২টি ক্লাস বাদ পড়েছে। চলুন রুটিনটা ঠিক করে নিই। |
| cta.replan | Adjust plan | রুটিন ঠিক করুন |
| today.empty | Nothing due today. Next class: Monday 19:30. | আজ কোনো কাজ নেই। পরের ক্লাস: সোমবার, রাত ৭:৩০। |
| error.import | We could not read that playlist. Check that it is public or unlisted. | এই প্লেলিস্টটি পড়া যায়নি। এটি পাবলিক বা আনলিস্টেড কি না দেখুন। |
| offline | You are offline. Your plan is still here. | আপনি অফলাইনে আছেন। আপনার রুটিন এখানেই আছে। |
| ai.checked | AI-generated, checked | এআই তৈরি, যাচাই করা |
| ai.unchecked | AI-generated, unchecked | এআই তৈরি, যাচাই হয়নি |
| report | Report a problem | সমস্যা জানান |
| credit | Video by {channel} | ভিডিও: {channel} |
| feasible.ok | Fits your plan | আপনার রুটিনে ঠিকমতো হচ্ছে |

**Formats.** Week starts on Saturday by default (setting). Time defaults to 12-hour. Digits default to Latin with a setting for Bangla digits **[A]**. Dates always show the weekday.

---

## 11. Accessibility

- **Contrast:** use the pairs in 4.1. Status is never colour alone.
- **Focus:** the double ring in 4.4 on every interactive element.
- **Targets:** at least 44 by 44 px.
- **Scaling:** works at 200% text size without clipping or horizontal scroll.
- **Motion:** respect reduced motion; no autoplaying anything.
- **Screen readers:** the Pathway is an ordered list with status in each item's name. Each text element carries its own `lang` for mixed Bangla and English.
- **Forms:** visible labels, error text next to the field, numeric input modes, no placeholder-only labels.
- **Keyboard:** every action reachable; a skip link; no focus traps except dialogs.
- **Testing:** axe in CI plus a manual pass with TalkBack on Android for Today, Class and Quiz.

---

## 12. Low data and offline

- No autoplay. Thumbnails lazy-loaded and optional (data saver in Settings, and automatically when the browser sends a Save-Data signal).
- Skeleton screens instead of spinners.
- The plan, Today and loaded quiz assets work offline. Actions such as Mark as done queue and sync later. An offline banner says so plainly.
- Decorative images: none. Icons are inline SVG. Fonts are subsetted.

---

## 13. Dark mode

Dark is a designed theme, not an inversion: `night` background, tokens from 4.1. Marigold stays the same so "today" looks the same in both themes. Review screenshots in both.

---

## 14. Implementation notes for the agent

- Override shadcn/ui through the CSS variables in 4.4. Remove its default palette, radii and fonts.
- Build the Pathway as SVG plus semantic HTML, with text in HTML.
- Provide the dev-only `/design` route in Phase 0 showing tokens, type scale, focus ring and sample components in both themes.
- For every new screen, capture screenshots at 360, 768 and 1280 px in light and dark, attach them to the Walkthrough and compare with the wireframes here.

## 15. Design review checklist (tick before calling UI work done)

- [ ] Each screen has exactly one primary action.
- [ ] Marigold appears only on the today or next knot.
- [ ] Contrast matches 4.1 and focus is visible everywhere.
- [ ] Works at 360 px with no horizontal scroll and 44 px targets.
- [ ] Bangla text checked for clipping and line height; `bn` and `en` strings both exist.
- [ ] Status is never conveyed by colour alone.
- [ ] No identical-card grids, no tracked all-caps labels, no emoji icons, no gradients.
- [ ] Empty, loading, error and offline states exist.
- [ ] Reduced motion is honoured.
