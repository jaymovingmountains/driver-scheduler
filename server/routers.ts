import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { notifyDriver, notifyRouteAssignment, sendDriverInvitation, sendLoginCode } from "./notifications";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Driver session cookie name
const DRIVER_COOKIE_NAME = 'driver_session';

// Helper to generate 6-digit code
function generateLoginCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to get week boundaries
function getWeekBoundaries(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ DRIVER AUTH ============
  driverAuth: router({
    // Request login code
    requestCode: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input }) => {
        const driver = await db.getDriverByPhone(input.phone);
        if (!driver) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Phone number not registered' });
        }
        
        const code = generateLoginCode();
        await db.setDriverLoginCode(driver.id, code, 10); // 10 minutes expiry
        
        // Send code via SMS and email
        const { emailSent, smsSent } = await sendLoginCode(driver.phone, driver.email, code);
        
        return { 
          success: true, 
          message: smsSent ? 'Code sent via SMS' : (emailSent ? 'Code sent via email' : 'Code generated (notifications not configured)'),
        };
      }),

    // Verify login code
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
        
        // Create session
        const token = await db.createDriverSession(driver.id);
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(DRIVER_COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
        
        return { success: true, driver: { id: driver.id, name: driver.name, phone: driver.phone } };
      }),

    // Get current driver from session
    me: publicProcedure.query(async ({ ctx }) => {
      const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
      if (!token) return null;
      
      const driver = await db.getDriverBySessionToken(token);
      return driver;
    }),

    // Driver logout
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
        email: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if phone already exists
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
          loginCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: 'pending',
        });

        // Send invitation email if email provided
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
        await db.setDriverLoginCode(driver.id, code, 24 * 60); // 24 hours

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
        // Validate 24-hour notice
        const assignmentDate = new Date(input.date + 'T00:00:00');
        const now = new Date();
        const hoursDiff = (assignmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Route assignments require at least 24 hours advance notice' 
          });
        }

        // Validate special routes (once per week)
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

        // Check driver availability
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

        // Get van name for notification
        let vanName: string | undefined;
        if (input.vanId) {
          const vans = await db.getAllVans();
          vanName = vans.find(v => v.id === input.vanId)?.name;
        }

        // Send notification
        await notifyRouteAssignment(input.driverId, input.routeType, input.date, vanName);

        return { success: true, assignmentId };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        vanId: z.number().nullable().optional(),
        status: z.enum(['assigned', 'completed', 'cancelled']).optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        if (data.status === 'completed') {
          (data as any).completedAt = new Date();
        }
        
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

  // ============ DRIVER PORTAL ============
  driverPortal: router({
    // Get driver's own routes
    myRoutes: publicProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
        }

        return db.getDriverRouteAssignments(driver.id, input?.startDate, input?.endDate);
      }),

    // Get driver's availability
    myAvailability: publicProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
        }

        return db.getDriverAvailability(driver.id, input.startDate, input.endDate);
      }),

    // Set availability for a date
    setAvailability: publicProcedure
      .input(z.object({
        date: z.string(),
        isAvailable: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
        }

        await db.setAvailability(driver.id, input.date, input.isAvailable);
        return { success: true };
      }),

    // Update route with van selection
    updateRoute: publicProcedure
      .input(z.object({
        routeId: z.number(),
        vanId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
        }

        // Verify the route belongs to this driver
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

    // Mark route as completed
    completeRoute: publicProcedure
      .input(z.object({
        routeId: z.number(),
        vanId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = ctx.req.cookies?.[DRIVER_COOKIE_NAME];
        if (!token) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
        }
        
        const driver = await db.getDriverBySessionToken(token);
        if (!driver) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Session expired' });
        }

        // Verify the route belongs to this driver
        const route = await db.getRouteAssignmentById(input.routeId);
        if (!route || route.driverId !== driver.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your route' });
        }

        await db.updateRouteAssignment(input.routeId, {
          vanId: input.vanId,
          notes: input.notes,
          status: 'completed',
          completedAt: new Date(),
        });

        return { success: true };
      }),
  }),

  // ============ ADMIN: AVAILABILITY VIEW ============
  availability: router({
    getForDate: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return db.getAvailableDriversForDate(input.date);
      }),

    getForDriver: adminProcedure
      .input(z.object({
        driverId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getDriverAvailability(input.driverId, input.startDate, input.endDate);
      }),
  }),

  // ============ NOTIFICATIONS ============
  notifications: router({
    logs: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        limit: z.number().default(50),
      }).optional())
      .query(async ({ input }) => {
        return db.getNotificationLogs(input?.driverId, input?.limit || 50);
      }),
  }),
});

export type AppRouter = typeof appRouter;
