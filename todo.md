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

## Driver Login Restriction
- [x] Only allow invited drivers (in drivers table) to login to driver portal
- [x] Show clear error message for unauthorized users ("Phone number not registered")
- [x] Unauthorized users stay on login page (no redirect needed)

## Login Attempt Logging
- [x] Create loginAttempts database table
- [x] Log failed login attempts (wrong phone, invalid code)
- [x] Log successful login attempts
- [x] Add Security Logs page to admin dashboard
- [x] Display login attempts with filtering options

## Bug Fixes
- [x] Fix driver login code email message - now shows accurate error about Resend domain verification
- [x] Update sender email to use verified domain movingmountainslogistics.com

## Driver Availability Save Button
- [x] Add save button for drivers to confirm availability selections
- [x] Ensure availability updates sync to admin schedule view

## Schedule Availability Display
- [x] Show all available drivers per day in weekly schedule (not just assigned routes)
- [x] Display driver availability count per day in calendar header
- [x] Distinguish between available drivers and assigned routes visually (green dots in table)

## Quick Route Assignment
- [x] Click on driver's available day in schedule to open quick assign dialog
- [x] Pre-fill driver and date in the dialog
- [x] Allow selecting route type and van

## Availability Conflict Warnings
- [x] Show warning when assigning route to unavailable driver
- [x] Allow override with confirmation
- [x] Visual indicator in route assignment dialog

## Weekly Availability Summary Email
- [x] Create endpoint to generate weekly availability summary
- [x] Send email to admin with driver availability for upcoming week
- [x] Email Summary button in schedule page (manual trigger)

## Documentation
- [x] Create driver quick guide with screenshots (login and availability)

## Landing Page Redesign
- [x] Make landing page driver-focused (remove Admin Portal card)
- [x] Add simple admin login link in corner/footer

## Branding Update
- [x] Add MML logo to landing page
- [x] Update color scheme to match logo (orange/red gradient)

## Remember Me Feature
- [x] Add Remember me checkbox to driver login page
- [x] Store preference and extend session duration when checked (90 days vs 1 day)

## Email Improvements
- [x] Include website link (driversched.com) in driver invite email

## Availability Reminder System
- [x] Create database table to track reminder emails sent (prevent duplicate emails)
- [x] Add function to find drivers without availability set for upcoming days
- [x] Create reminder email template with link to driver portal
- [x] Implement scheduled job to run every 6 hours
- [x] Only remind drivers who haven't set availability 24hrs before a given day
- [x] Test reminder system (8 tests passing)

## Admin Reminder Trigger UI
- [x] Add button to admin dashboard to manually trigger availability reminders
- [x] Show results of reminder job (how many sent, failed)

## Training Route Feature
- [x] Create database schema for training sessions and checklist items
- [x] Create training checklist templates (MML Yard, Warehouse, On-Road)
- [x] Implement backend procedures for training management
- [x] Add admin UI to assign training routes and view progress
- [x] Add driver UI to complete training checklists
- [x] Add confidence rating (1-10) and improvement areas
- [x] Add training history and completion tracking (52 tests passing)

## Training Analytics Dashboard
- [x] Add backend procedure to calculate training statistics
- [x] Calculate average confidence scores (overall and per trainer)
- [x] Aggregate common improvement areas across all sessions
- [x] Track training completion rates
- [x] Create admin UI dashboard with charts and metrics
- [x] Add time-based filtering (last 30 days, 90 days, all time)

## Independent Driver Agreement Feature
- [x] Research e-signature options (chose in-app solution for cost savings)
- [x] Store agreement document content for display
- [x] Create database schema for tracking agreement status per driver
- [x] Implement HTML5 Canvas signature capture
- [x] Create admin UI to view who has signed vs not signed
- [x] Create driver UI to view and sign the agreement
- [x] Send signed agreement confirmation email to driver
- [x] Implement 6-hour reminder emails for drivers who haven't signed
- [x] Test the complete agreement workflow (71 tests passing)

## Bug Fix - Agreement Reminder Emails
- [x] Remove automatic scheduler for agreement reminders (only admin-triggered)
