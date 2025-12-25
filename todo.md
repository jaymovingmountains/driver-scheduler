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
