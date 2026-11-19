# Build a Mobile-First Mess Meal Booking & Management Application

You are an experienced full-stack engineer. Build a fully functional prototype of a college mess meal booking and management application for **IIIT Allahabad**.

This is a college project prototype, but the implementation should follow good software engineering practices, have a proper database architecture, secure authorization, and a polished mobile-app-like UI.

Do not build a static mockup. All major features must work end-to-end with Supabase as the backend.

---

# 1. Technology Stack

Use the following technologies:

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Backend:** Supabase
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth with Google OAuth
- **Routing:** React Router
- **Data Fetching:** TanStack Query
- **QR Generation:** qrcode
- **QR Scanning:** html5-qrcode or an equivalent maintained library
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod

Use Supabase migrations for database schema management.

Keep the application modular, with reusable components, hooks, services, and clearly separated role-specific functionality.

# 2. Application Architecture

The application has three roles:

1. Student
2. Staff
3. Admin

There can be multiple messes within the college.

For example:
- BH1
- BH2
- BH3
- BH4
- Other messes created by administrators

Each mess operates independently.

### Access control rules

**Students**
- Belong to exactly one mess at a time.
- Can only see meals, menus, and booking information belonging to their assigned mess.
- Can only manage their own meal bookings and preferences.
- Cannot access staff or admin functionality.

**Staff**
- Are assigned to one or more messes (support multiple assignments if convenient).
- Can only manage the messes they are assigned to.
- Can view students belonging to their assigned messes.
- Cannot access global administration functionality.

**Admins**
- Have global access.
- Can create, edit, and delete messes.
- Can create and manage student and staff accounts.
- Can assign and transfer users between messes.
- Can access reports and export rebate information.

Implement role-based access control at both frontend and database levels.

IMPORTANT: Frontend route protection is not sufficient. Use PostgreSQL Row Level Security (RLS) policies to enforce permissions.

# 3. Authentication

Everyone must authenticate exclusively using Google OAuth.

Requirements:

- Only Google accounts ending in `@iiita.ac.in` are allowed.
- No email/password login.
- No public registration.
- Users must be pre-registered by an administrator.
- Google authentication should link the authenticated Google account to the existing user record.
- A user must not be able to assign themselves an arbitrary role.

### Login flow

1. User opens the application.
2. User sees a Google sign-in button.
3. User authenticates using Google.
4. Verify that their email ends in `@iiita.ac.in`.
5. Check whether their account has been provisioned by an administrator.
6. Fetch their assigned role and mess information.
7. Redirect them to the appropriate dashboard.

Unregistered users should see an appropriate access-denied screen.

The initial admin account should be provisioned securely through a seed script or documented administrative setup process.

Do not rely on client-side email checks alone. Enforce account provisioning and domain restrictions through trusted backend logic.

# 4. Student Application

The student experience is the primary part of the application.

The student dashboard should contain the following sections.

## 4.1 Home / Upcoming Meals

Display upcoming meals in chronological order.

Meal categories:
- Breakfast
- Lunch
- Snacks
- Dinner

Each meal card should display:

- Meal name
- Date
- Serving time
- Menu items
- Mess name
- Current booking status (Opted In / Opted Out)
- Booking cutoff time

The menu must be dynamically fetched from the menu configured for the student's assigned mess and the particular meal.

Students should not see menus belonging to other messes.

## 4.2 Opt-in / Opt-out

Students should be able to opt in or opt out of individual meals.

There should be a configurable cutoff time for every meal.

For example:
- Dinner starts at 8 PM.
- Booking cutoff is 6 PM.
- Students can change their booking until 6 PM.
- After 6 PM, students cannot change their booking.

Display the remaining time until the cutoff wherever appropriate.

### Default booking preference

Every student should have a configurable preference:

- Opt In by Default
- Opt Out by Default

Default value: **Opt In by Default**.

The preference determines the initial booking state for newly scheduled meals.

When a meal is created or scheduled, generate the initial booking based on the student's default preference.

Students can override the default for individual meals before the cutoff.

Changing the preference should affect future meal bookings, not silently overwrite existing bookings.

### Booking event history

Every booking transition must record:

- Student ID
- Meal ID
- Previous booking status
- New booking status
- Exact timestamp
- Action source (student, system, or staff)

Do not simply overwrite booking status without preserving the event history.

This data will be used for mess rebate calculations.

Use server-generated timestamps, preferably UTC, and display times in the Asia/Kolkata timezone.

# 5. Student QR Code

Every opted-in student should receive a unique QR code for each meal.

### Behaviour

1. Student opts into a meal.
2. Backend creates or activates the corresponding booking.
3. A QR code is generated for that booking.
4. Student can open the QR from the meal card or a dedicated meal pass screen.
5. Staff scans the QR code when the student arrives.
6. Backend verifies the booking.
7. Booking is marked as consumed.

QR code should contain a unique, non-guessable booking token.

Keep this implementation simple for the prototype. Do not build a complex ticketing or cryptographic infrastructure.

However:
- Never put sensitive student information directly inside the QR code.
- Do not allow a student to generate a valid booking simply by manipulating frontend state.
- Prevent duplicate scans.
- An opted-out booking must not be accepted.

Display useful feedback after scanning, such as:
- Valid booking
- Already scanned
- Invalid QR
- Student opted out

The student should be able to see whether their meal has been marked as consumed.

# 6. Student Meal History

Provide a dedicated meal history screen.

Display past meals with:

- Date
- Meal category
- Menu
- Booking status
- Whether the meal was consumed/scanned
- Opt-in timestamp
- Opt-out timestamp, if applicable

Allow basic filtering:
- All
- Opted In
- Opted Out
- Consumed
- Not Consumed

Use pagination or infinite scrolling if necessary.

# 7. Staff Application

Staff members have a separate dashboard.

The staff dashboard should be focused on daily mess operations.

## 7.1 Staff Dashboard

Display:

- Assigned mess name
- Today's meals
- Upcoming meals
- Number of students opted in for each meal
- Number of students opted out
- Number of students already scanned
- Number of students remaining to be scanned

Include a quick action to open the QR scanner.

## 7.2 QR Scanner

Build a camera-based QR scanner.

The scanner should:

- Request camera permission.
- Support mobile rear cameras.
- Scan booking QR codes.
- Send the token to a trusted backend function for verification.
- Display student information after a successful scan.

After scanning, display:

- Student name
- Student roll number
- Mess
- Meal
- Booking status
- Scan result

Allow staff to return to scanning the next student without manually refreshing the page.

Prevent duplicate consumption records.

Staff must only be able to scan bookings for meals belonging to their assigned mess.

Also provide a manual fallback option to search for a student by roll number and verify their booking.

## 7.3 Meal Management

Staff should be able to manage their mess's meals.

Functionalities:

- Create new meals.
- Edit meal details.
- Set meal category.
- Set serving date.
- Set start and end time.
- Set booking cutoff time.
- Add and edit menu items.
- Remove menu items.
- View historical meals.

Provide sensible default timings for each category:

- Breakfast: 7:30 AM – 9:00 AM
- Lunch: 12:30 PM – 2:00 PM
- Snacks: 5:00 PM – 6:00 PM
- Dinner: 7:30 PM – 9:00 PM

These are defaults only. Staff must be able to customize timings for their mess and individual meals.

When creating a meal, allow staff to configure its menu and timing.

Past meals should be preserved for historical reporting.

## 7.4 Meal Participation Overview

For each meal, display:

- Total students assigned to the mess
- Opted-in students
- Opted-out students
- Scanned students
- Not-yet-scanned students

Allow staff to view the actual student list for each category.

Provide both upcoming and historical meal participation data.

## 7.5 Student Management

Staff should have access to their mess's student directory.

Display:
- Student name
- Roll number
- Email
- Current booking preference
- Mess assignment

Staff can search and filter students.

Staff should not be able to transfer students between messes unless explicitly granted administrative permission.

# 8. Admin Application

Admins have a global administration dashboard.

## 8.1 Dashboard

Display:
- Total students
- Total staff
- Total messes
- Today's meals
- Total bookings
- Overall meal participation

Provide a summary across all messes.

## 8.2 Mess Management

Admins can:

- Create a new mess.
- Edit mess details.
- Activate/deactivate a mess.
- View all messes.
- View students assigned to each mess.
- View staff assigned to each mess.

A mess should have:
- Unique ID
- Name
- Description (optional)
- Status
- Created timestamp

## 8.3 Student Management

Admins can:

- Create individual student accounts.
- Edit student information.
- Assign students to a mess.
- Transfer students between messes.
- Activate/deactivate accounts.
- View student booking history.

Student details:
- Full name
- Roll number (unique)
- Institutional email (unique)
- Mess assignment
- Default booking preference
- Account status

When a student is transferred to another mess, future meals should use the new mess assignment.

Historical bookings must remain associated with the original mess and meal. Never rewrite historical records when a student changes mess.

## 8.4 Staff Management

Admins can:

- Create staff accounts.
- Assign staff to one or more messes.
- Change staff assignments.
- Deactivate staff accounts.
- View staff details.

Staff details:
- Full name
- Institutional email
- Assigned mess(es)
- Account status

## 8.5 Bulk Student Import

Provide CSV upload functionality.

Expected CSV columns:

`name, roll_number, email, mess`

The importer should:

1. Allow CSV file upload.
2. Parse and preview the records.
3. Validate required fields.
4. Check email format and uniqueness.
5. Check roll number uniqueness.
6. Verify that the referenced mess exists.
7. Show validation errors before importing.
8. Allow valid records to be imported.
9. Show a final import summary.

Do not silently skip invalid records.

Allow downloading a sample CSV template.

## 8.6 Mess Rebate Reports

This is an important feature.

Admins should be able to export meal participation and booking data for calculating mess rebates.

Create a reporting interface with filters:

- Mess
- Student
- Date range
- Meal category

Export the data as CSV.

Include:
- Student name
- Roll number
- Mess
- Meal date
- Meal category
- Menu
- Booking status
- Initial/default booking status
- Opt-in timestamp
- Opt-out timestamp
- Booking event history
- Consumption/scan status
- Scan timestamp

IMPORTANT:

Do not implement an arbitrary rebate calculation formula.

The goal is to preserve accurate booking event timestamps and provide an export that can be used to calculate rebates later.

Make sure the data model supports multiple opt-in/opt-out transitions within the allowed booking window.

# 9. Database Design

Design a normalized PostgreSQL schema.

Suggested tables:

### profiles
- id (references auth.users)
- name
- email
- role (student, staff, admin)
- is_active
- created_at
- updated_at

### messes
- id
- name
- description
- is_active
- created_at

### students
- id
- profile_id
- roll_number
- mess_id
- default_booking_preference (opt_in, opt_out)

### staff_assignments
- id
- staff_id
- mess_id

### meals
- id
- mess_id
- category
- title
- description
- meal_date
- start_time
- end_time
- booking_cutoff_at
- created_by
- created_at
- updated_at

### menu_items
- id
- meal_id
- name
- description
- sort_order

### meal_bookings
- id
- student_id
- meal_id
- status (opted_in, opted_out)
- qr_token
- consumed_at
- created_at
- updated_at

Add a unique constraint on `(student_id, meal_id)`.

### booking_events
- id
- booking_id
- previous_status
- new_status
- action_source
- created_at

### meal_scans
- id
- booking_id
- scanned_by
- scanned_at

Add appropriate foreign keys, indexes, uniqueness constraints, and database-level validations.

You may refine this schema as needed, but preserve the separation between current booking state and historical booking events.

Use database functions or triggers where necessary to ensure booking events are recorded consistently.

# 10. Supabase Security

Security is an important part of this project.

Implement proper Row Level Security policies.

Requirements:

- Students can read their own profile and booking history.
- Students can read meals and menus from their currently assigned mess.
- Students can only modify their own bookings.
- Students cannot change booking status after the cutoff.
- Staff can manage meals and menus only for assigned messes.
- Staff can access students only from assigned messes.
- Staff can scan bookings only for their assigned messes.
- Admins have global access.
- No user can modify their own role.
- No user can assign themselves to another mess.
- QR tokens must not be publicly readable.
- Service-role credentials must never be exposed in frontend code.

Use Supabase RPC functions or Edge Functions for sensitive operations such as:
- Creating/updating bookings.
- Generating and validating QR tokens.
- Recording meal scans.
- Bulk account provisioning.
- Other privileged operations.

Ensure these operations validate authorization server-side.

# 11. Mobile-Only UI/UX

This is a mobile application prototype delivered as a web application.

**Do not design a conventional desktop website.**

The application should look and feel like a modern mobile app.

Design principles:

- Mobile viewport as the primary target.
- App-like navigation.
- Clean and minimal UI.
- Good typography.
- Rounded cards.
- Subtle shadows.
- Consistent spacing.
- Smooth transitions.
- Clear visual hierarchy.
- Proper loading, empty, and error states.

### Navigation

Use:
- Bottom navigation for primary student navigation.
- Side drawer for secondary navigation and account settings.
- Appropriate navigation for staff and admin roles.

The app should include a proper app shell with:
- Top app bar
- Page title
- Profile/avatar menu
- Side drawer
- Bottom navigation where appropriate

On wider screens, keep the application inside a centered mobile-sized viewport instead of expanding into a desktop dashboard.

The application should feel like something that could eventually be wrapped using Capacitor or installed as a PWA.

### Student navigation

Suggested bottom navigation:

1. Home
2. My Meals
3. History
4. Profile

The QR pass should be easily accessible from upcoming meal cards.

### Staff navigation

Suggested sections:

1. Dashboard
2. Scanner
3. Meals
4. Students

### Admin navigation

Suggested sections:

1. Overview
2. Messes
3. Students
4. Staff
5. Reports

Keep navigation role-specific.

# 12. Suggested Application Structure

Organize the React project cleanly.

Example:

src/
  components/
    ui/
    common/
    navigation/
    meals/
    bookings/
    qr/
  layouts/
    AppLayout.tsx
    StudentLayout.tsx
    StaffLayout.tsx
    AdminLayout.tsx
  pages/
    auth/
    student/
    staff/
    admin/
  hooks/
  services/
    supabase/
    auth/
    meals/
    bookings/
    reports/
  lib/
    supabase.ts
    utils.ts
    validations/
  types/
  routes/
  contexts/

supabase/
  migrations/
  functions/
  seed.sql

You can adjust this structure as the application develops.

# 13. Implementation Strategy

Build the application in phases.

### Phase 1: Foundation

- Initialize React + TypeScript + Vite.
- Configure Tailwind and shadcn/ui.
- Set up Supabase client.
- Create database migrations.
- Configure Google OAuth.
- Implement user profiles and roles.
- Implement route guards.
- Implement RLS policies.

### Phase 2: Student Features

- Student dashboard.
- Upcoming meals.
- Menu display.
- Default booking preferences.
- Opt-in/opt-out functionality.
- Booking event tracking.
- QR generation.
- Meal history.

### Phase 3: Staff Features

- Staff dashboard.
- Meal creation and editing.
- Menu management.
- Meal participation overview.
- QR scanning.
- Consumption tracking.
- Student directory.

### Phase 4: Admin Features

- Admin dashboard.
- Mess management.
- Student management.
- Staff management.
- CSV bulk import.
- Student transfers.
- Rebate reporting and CSV export.

### Phase 5: Polish and Testing

- Test all three roles.
- Test access restrictions.
- Test RLS policies.
- Test booking cutoff enforcement.
- Test duplicate QR scans.
- Test student transfers.
- Test historical data integrity.
- Test mobile camera permissions.
- Test CSV imports and exports.
- Fix UI and interaction issues.

# 14. Important Engineering Instructions

1. Prioritize working functionality over unnecessary abstractions.
2. Do not create fake data as a substitute for actual backend functionality.
3. Seed realistic demo data for development, but keep it separate from production data.
4. Do not hardcode roles, messes, meals, or student information in frontend components.
5. Keep all database operations in reusable service functions or hooks.
6. Use TypeScript types generated from the Supabase schema wherever practical.
7. Use proper loading, error, and success states.
8. Handle concurrent QR scans safely using database transactions or atomic RPC operations.
9. Never trust client-side booking cutoff checks; validate them in the backend.
10. Preserve historical booking records when students or staff change mess assignments.
11. Make the UI usable on small mobile screens.
12. Keep the implementation simple enough to understand, demonstrate, and maintain as a college project.

# 15. Expected Deliverables

At completion, provide:

- Fully functional React application.
- Supabase SQL migrations.
- RLS policies.
- Database seed script with realistic demo data.
- Supabase Edge Functions/RPC functions where required.
- Google OAuth setup instructions.
- `.env.example`.
- README with local development and deployment instructions.
- Sample student import CSV.
- Explanation of database architecture.
- Instructions for creating the initial admin account.

Do not stop after generating the project structure or implementing the landing page.

Implement the application end-to-end, verify the major user flows, and ensure that the three roles can actually use their respective features.

Start by inspecting the existing repository. If it is empty, initialize the project. Before implementing the UI, establish the database schema and authorization model so that the frontend is built around the actual data model.
