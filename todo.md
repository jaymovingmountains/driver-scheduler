# Driver Scheduling System - TODO

## Database & Schema
- [x] Drivers table (name, phone, email, status, login code)
- [x] Availability table (driver, date, available status)
- [x] Routes table (type: regular/big-box/out-of-town, driver, date, van)
- [x] Route assignments with 24-hour notice validation
- [x] Notification logs table

## Admin Features
- [x] Admin authentication (single admin login)
- [x] Admin dashboard layout
- [x] Driver invitation via email
- [x] Driver management (view, edit, remove)
- [x] Route assignment interface
- [x] 24-hour advance notice validation
- [x] Send notifications (email + SMS)

## Driver Features
- [x] Driver phone/code login (passwordless)
- [x] Two-week availability calendar
- [x] Mark available days
- [x] Van selection dropdown (T1-T6, Z1-Z5, M1)
- [x] View assigned routes
- [x] Driver work logging

## Notifications
- [x] Resend email integration
- [x] Textbelt SMS integration (free tier)
- [x] Route assignment notifications
- [x] Route update notifications

## Route Types
- [x] Regular routes (daily)
- [x] Big Box routes (once per week per driver)
- [x] Out of Town routes (once per week per driver)


## Admin Auth Update
- [x] Remove OAuth dependency for admin login
- [x] Implement simple username/password admin authentication
- [x] Update admin dashboard to use new auth

## Bug Fixes
- [x] Fix redirect after successful admin login
- [x] Fix cookie-based auth for preview environment (use localStorage + Authorization header)

## Driver Management Page Enhancement
- [x] Driver list view with search and filter
- [x] Add new driver form (name, phone, email)
- [x] Edit driver details
- [x] Invite driver via email with login code
- [x] View driver status (active/inactive/pending)
- [x] Delete/deactivate driver functionality

## Bug Fixes (Round 2)
- [x] Fix email validation error when adding driver without email
- [x] Fix driver portal login redirect to dashboard (same cookie issue as admin)
- [x] Verify driver portal login redirect logic is working correctly
- [x] Fix circular import issue with auth token constants

## Bug Fixes (Round 3)
- [x] Fix driver token not being sent with API requests after login (updated all driverPortal routes to check x-driver-token header)

## Twilio Integration (Cancelled)
- [x] Install Twilio SDK
- [x] Update notifications service to use Twilio instead of Textbelt
- [ ] ~~Request Twilio credentials~~ - Cancelled, switching to email-only
- [ ] ~~Test SMS delivery~~ - Cancelled

## Email-Only Login
- [x] Remove SMS dependency from login flow
- [x] Update driver login to use email for codes
- [x] Update notifications to email-only for route assignments
- [x] Remove Twilio dependency

## Form Updates
- [x] Make email field required in Add Driver form (frontend validation)
- [x] Make email field required in server validation

## OAuth Cleanup
- [x] Remove OAuth login page from home page
- [x] Disable global OAuth redirect on unauthorized errors
- [x] Make home page and driver portal publicly accessible

## UI Improvements
- [x] Add search bar to driver list to filter by name or email (already implemented)

## Admin Email-Based Login
- [x] Update admin credentials table to store email and login code
- [x] Hardcode admin email: jay@movingmountainslogistics.com
- [x] Create endpoint to send login code to admin email
- [x] Create endpoint to verify admin login code
- [x] Update admin login UI to use email and code flow
- [x] Remove password-based authentication

## Resend Code Feature
- [x] Add Resend Code button to admin login interface
- [x] Add Resend Code button to driver login interface
- [x] Add cooldown timer to prevent spam (60 seconds)

## Route Assignment Feature
- [x] Route assignment UI in admin dashboard
- [x] Driver portal displays assigned routes
- [x] Email notification for route assignments
- [x] 24-hour advance notice validation

## Weekly Schedule View
- [x] Weekly calendar grid showing all days of the week
- [x] Display driver assignments per day with route type badges
- [x] Week navigation (previous/next week)
- [x] Show driver availability status per day
- [x] Quick view of assigned van for each route

## Drag-and-Drop Route Reassignment
- [x] Install drag-and-drop library (@dnd-kit)
- [x] Add backend endpoint for route reassignment (update date/driver)
- [x] Make route cards draggable in weekly calendar
- [x] Create drop zones for each day column
- [x] Create drop zones for each driver row in table
- [x] Show visual feedback during drag operations
- [x] Validate reassignment (driver availability, 24-hour notice)
- [x] Update UI optimistically on successful drop
