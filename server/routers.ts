import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { notifyDriver, notifyRouteAssignment, sendDriverInvitation, sendLoginCode } from "./notifications";

// Cookie names
const ADMIN_COOKIE_NAME = 'admin_session';
const DRIVER_COOKIE_NAME = 'driver_session';

// Helper to generate 6-digit code
function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to get week boundaries
function getWeekBoundaries(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// Admin-only procedure using session-based auth
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  // Check cookie first, then Authorization header (for preview environment)
  let token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token) {
    const authHeader = ctx.req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Admin login required' });
  }
  
  const session = await db.getAdminBySessionToken(token);
  if (!session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired session' });
  }
  
  return next({ 
    ctx: { 
      ...ctx, 
      admin: session.admin 
    } 
  });
});

export const appRouter = router({
  system: systemRouter,
  
  // ============ ADMIN AUTH (Username/Password) ============
  adminAuth: router({
    // Check if admin exists (for initial setup)
    exists: publicProcedure.query(async () => {
      return db.adminExists();
    }),

    // Setup initial admin (only works if no admin exists)
    setup: publicProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const exists = await db.adminExists();
        if (exists) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Admin already exists' });
        }
        
        await db.createAdminCredential(input.username, input.password);
        return { success: true };
      }),

    // Admin login
    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const admin = await db.verifyAdminPassword(input.username, input.password);
        if (!admin) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid username or password' });
        }
        
        const token = await db.createAdminSession(admin.id);
        
        // Set cookie for server-side auth
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        // Also return token for client-side storage (for preview environment)
        return { success: true, token, admin: { id: admin.id, username: admin.username } };
      }),

    // Get current admin
    me: publicProcedure.query(async ({ ctx }) => {
      // Check cookie first, then Authorization header (for preview environment)
      let token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
      if (!token) {
        const authHeader = ctx.req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7);
        }
      }
      if (!token) return null;
      
      const session = await db.getAdminBySessionToken(token);
      if (!session) return null;
      
      return { id: session.admin.id, username: session.admin.username };
    }),

    // Admin logout
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies?.[ADMIN_COOKIE_NAME];
      if (token) {
        await db.deleteAdminSession(token);
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Change password
    changePassword: adminProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const admin = await db.verifyAdminPassword((ctx as any).admin.username, input.currentPassword);
        if (!admin) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Current password is incorrect' });
        }
        
        await db.updateAdminPassword(admin.id, input.newPassword);
        return { success: true };
      }),
  }),

  // Keep old auth for compatibility but it won't be used
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(({ ctx }) => {
      return { success: true } as const;
    }),
  }),

  // ============ DRIVER AUTH ============
  driverAuth: router({
    requestCode: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input }) => {
        const driver = await db.getDriverByPhone(input.phone);
        if (!driver) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Phone number not registered' });
        }
        
        const code = generateLoginCode();
        await db.setDriverLoginCode(driver.id, code, 10);
        
        const { emailSent, smsSent } = await sendLoginCode(driver.phone, driver.email, code);
        
        return { 
          success: true, 
          message: smsSent ? 'Code sent via SMS' : (emailSent ? 'Code sent via email' : 'Code generated (notifications not configured)'),
        };
      }),

    verifyCode: publicProcedure
      .input(z.object({ 
        phone: z.string().min(10),
        code: z.string().length(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const driver = await db.verifyDriverLoginCode(input.phone, input.code);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired code' });
        }
        
        const token = await db.createDriverSession(driver.id);
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(DRIVER_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        
        return { success: true, driver: { id: driver.id, name: driver.name, phone: driver.phone } };
      }),

    me: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
      if (!token) return null;
      
      const driver = await db.getDriverBySessionToken(token);
      return driver;
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
      if (token) {
        await db.deleteDriverSession(token);
      }
      
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(DRIVER_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
  }),

  // ============ ADMIN: DRIVER MANAGEMENT ============
  drivers: router({
    list: adminProcedure.query(async () => {
      return db.getAllDrivers();
    }),

    get: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const driver = await db.getDriverById(input.id);
        if (!driver) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Driver not found' });
        }
        return driver;
      }),

    invite: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().min(10),
        email: z.string().email().optional().or(z.literal('')).transform(v => v || undefined),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getDriverByPhone(input.phone);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Phone number already registered' });
        }

        const code = generateLoginCode();
        const driverId = await db.createDriver({
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          loginCode: code,
          loginCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'pending',
        });

        if (input.email) {
          await sendDriverInvitation(input.email, input.name, input.phone, code);
        }

        return { success: true, driverId, loginCode: code };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().min(10).optional(),
        email: z.string().email().nullable().optional(),
        status: z.enum(['active', 'inactive', 'pending']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDriver(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDriver(input.id);
        return { success: true };
      }),

    resendInvite: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const driver = await db.getDriverById(input.id);
        if (!driver) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Driver not found' });
        }

        const code = generateLoginCode();
        await db.setDriverLoginCode(driver.id, code, 24 * 60);

        if (driver.email) {
          await sendDriverInvitation(driver.email, driver.name, driver.phone, code);
        }

        return { success: true, loginCode: code };
      }),

    notify: adminProcedure
      .input(z.object({
        id: z.number(),
        subject: z.string().min(1),
        message: z.string().min(1),
        email: z.boolean().default(true),
        sms: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const result = await notifyDriver(input.id, input.subject, input.message, {
          email: input.email,
          sms: input.sms,
        });
        return result;
      }),
  }),

  // ============ VANS ============
  vans: router({
    list: publicProcedure.query(async () => {
      return db.getAllVans();
    }),

    seed: adminProcedure.mutation(async () => {
      await db.seedVans();
      return { success: true };
    }),
  }),

  // ============ ROUTE ASSIGNMENTS ============
  routes: router({
    list: adminProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllRouteAssignments(input?.startDate, input?.endDate);
      }),

    assign: adminProcedure
      .input(z.object({
        driverId: z.number(),
        date: z.string(),
        routeType: z.enum(['regular', 'big-box', 'out-of-town']),
        vanId: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const assignmentDate = new Date(input.date + 'T00:00:00');
        const now = new Date();
        const hoursDiff = (assignmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Route assignments require at least 24 hours advance notice' 
          });
        }

        if (input.routeType === 'big-box' || input.routeType === 'out-of-town') {
          const { start, end } = getWeekBoundaries(assignmentDate);
          const existingSpecial = await db.getDriverSpecialRoutesThisWeek(
            input.driverId, 
            input.routeType, 
            start, 
            end
          );
          
          if (existingSpecial.length > 0) {
            const typeDisplay = input.routeType === 'big-box' ? 'Big Box' : 'Out of Town';
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Driver already has a ${typeDisplay} route assigned this week` 
            });
          }
        }

        const availability = await db.getDriverAvailability(input.driverId, input.date, input.date);
        if (availability.length === 0 || !availability[0].isAvailable) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Driver is not available on this date' 
          });
        }

        const assignmentId = await db.createRouteAssignment({
          driverId: input.driverId,
          date: new Date(input.date + 'T00:00:00'),
          routeType: input.routeType,
          vanId: input.vanId || null,
          notes: input.notes || null,
        });

        await notifyRouteAssignment(input.driverId, input.routeType, input.date);

        return { success: true, assignmentId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        vanId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(['assigned', 'completed', 'cancelled']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateRouteAssignment(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteRouteAssignment(input.id);
        return { success: true };
      }),
  }),

  // ============ SCHEDULE VIEW ============
  schedule: router({
    byDate: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const available = await db.getAvailableDriversForDate(input.date);
        const routes = await db.getAllRouteAssignments(input.date, input.date);
        return { available, routes };
      }),

    driverAvailability: adminProcedure
      .input(z.object({
        driverId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getDriverAvailability(input.driverId, input.startDate, input.endDate);
      }),

    allAvailability: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const drivers = await db.getAllDrivers();
        const result = [];
        
        for (const driver of drivers) {
          const avail = await db.getDriverAvailability(driver.id, input.startDate, input.endDate);
          result.push({ driver, availability: avail });
        }
        
        return result;
      }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    list: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => {
        return db.getNotificationLogs(input?.driverId, input?.limit);
      }),
  }),

  // ============ DRIVER PORTAL ============
  driverPortal: router({
    myRoutes: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Driver login required' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }
        
        return db.getDriverRouteAssignments(driver.id, input.startDate, input.endDate);
      }),

    myAvailability: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Driver login required' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }
        
        return db.getDriverAvailability(driver.id, input.startDate, input.endDate);
      }),

    setAvailability: publicProcedure
      .input(z.object({
        date: z.string(),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Driver login required' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }
        
        await db.setAvailability(driver.id, input.date, input.isAvailable);
        return { success: true };
      }),

    updateRoute: publicProcedure
      .input(z.object({
        routeId: z.number(),
        vanId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Driver login required' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }
        
        const route = await db.getRouteAssignmentById(input.routeId);
        if (!route || route.driverId !== driver.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your route' });
        }
        
        await db.updateRouteAssignment(input.routeId, {
          vanId: input.vanId,
          notes: input.notes,
        });
        
        return { success: true };
      }),

    completeRoute: publicProcedure
      .input(z.object({
        routeId: z.number(),
        vanId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Driver login required' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid session' });
        }
        
        const route = await db.getRouteAssignmentById(input.routeId);
        if (!route || route.driverId !== driver.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your route' });
        }
        
        await db.updateRouteAssignment(input.routeId, {
          vanId: input.vanId,
          notes: input.notes,
          status: 'completed',
        });
        
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
