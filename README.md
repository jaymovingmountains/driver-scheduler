# Driver Scheduling System

A comprehensive scheduling system for Moving Mountains Logistics to manage drivers, their availability, route assignments, and notifications.

## Features

### Admin Dashboard
- **Driver Management**: Invite, edit, and manage drivers with phone/email
- **Route Assignment**: Assign Big Box, Out of Town, or Regular routes with 24-hour notice validation
- **Weekly Schedule View**: Visual calendar showing driver availability and assigned routes
- **Drag-and-Drop**: Reassign routes by dragging between days/drivers
- **Quick Assign**: Click any driver-day cell to quickly assign a route
- **Availability Conflict Warnings**: Amber warnings when assigning to unavailable drivers
- **Email Notifications**: Send login codes, route assignments, and weekly summaries
- **Security Logs**: Track all login attempts with IP and user agent

### Driver Portal
- **Phone + Code Login**: Secure authentication with 6-digit email codes
- **Remember Me**: Option to stay logged in for 90 days
- **Availability Calendar**: Set availability for 2-week periods with batch save
- **Route Viewing**: See assigned routes with details

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS 4, shadcn/ui
- **Backend**: Express.js, tRPC
- **Database**: MySQL with Drizzle ORM
- **Email**: Resend API (verified domain: movingmountainslogistics.com)
- **Authentication**: Session-based with secure tokens

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm
- MySQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/jaymovingmountains/driver-scheduler.git
cd driver-scheduler

# Install dependencies
pnpm install

# Set up environment variables (see .env.example)

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Environment Variables

Required environment variables:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for session signing
- `RESEND_API_KEY` - Resend API key for email notifications

## Security

See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for the full security audit report.

Key security features:
- ✅ No hardcoded secrets
- ✅ Proper authentication and authorization
- ✅ Input validation on all endpoints (Zod)
- ✅ Secure session management
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ XSS prevention (React)

## Testing

```bash
# Run all tests
pnpm test
```

28 tests covering:
- Driver CRUD operations
- Authentication flows
- Route assignment logic
- Availability management
- Email integration

## License

Private - Moving Mountains Logistics
