/**
 * rides.ts — seshaa.ride / seshaa.delivery / seshaa.transport
 *
 * All three services share the same data model (RideRequest + DriverProfile).
 * type field distinguishes them: 'RIDE' | 'DELIVERY' | 'TRANSPORT'
 *
 * Flow:
 *  1. User POSTs /rides            → creates PENDING request
 *  2. Driver GETs /rides/available → sees nearby requests for their service type
 *  3. Driver POSTs /rides/:id/accept → assigns themselves, status → ACCEPTED
 *  4. Driver POSTs /rides/:id/status → updates status (IN_PROGRESS, COMPLETED, CANCELLED)
 *  5. Admin sees all via /rides/admin
 */
import { Router, Response } from 'express';
import prisma from '../db';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Driver registration ───────────────────────────────────────────────────────
router.post('/driver/register', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { vehicleType, services, plateNumber, licenseNo, city, country, bio, photoUrl } = req.body as {
    vehicleType: string; services: string[]; plateNumber?: string; licenseNo?: string;
    city: string; country: string; bio?: string; photoUrl?: string;
  };

  const existing = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT id FROM "DriverProfile" WHERE "userId" = $1`, userId
  );

  let driver;
  if ((existing as { id: string }[]).length > 0) {
    driver = await prisma.$queryRawUnsafe<unknown[]>(
      `UPDATE "DriverProfile" SET "vehicleType"=$1,"services"=$2,"plateNumber"=$3,"licenseNo"=$4,
       "city"=$5,"country"=$6,"bio"=$7,"photoUrl"=$8 WHERE "userId"=$9 RETURNING *`,
      vehicleType, services, plateNumber ?? null, licenseNo ?? null,
      city, country, bio ?? null, photoUrl ?? null, userId
    );
  } else {
    driver = await prisma.$queryRawUnsafe<unknown[]>(
      `INSERT INTO "DriverProfile" ("userId","vehicleType","services","plateNumber","licenseNo","city","country","bio","photoUrl")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      userId, vehicleType, services, plateNumber ?? null, licenseNo ?? null,
      city, country, bio ?? null, photoUrl ?? null
    );
  }
  res.status(201).json((driver as unknown[])[0]);
});

// GET /rides/driver/me
router.get('/driver/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT dp.*, u.name, u.phone, u.email FROM "DriverProfile" dp
     JOIN "User" u ON u.id = dp."userId"
     WHERE dp."userId" = $1`, userId
  );
  if (!(rows as unknown[]).length) return res.status(404).json({ error: 'Not a registered driver' });
  res.json((rows as unknown[])[0]);
});

// PATCH /rides/driver/availability
router.patch('/driver/availability', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { available } = req.body as { available: boolean };
  await prisma.$executeRawUnsafe(
    `UPDATE "DriverProfile" SET "available"=$1 WHERE "userId"=$2`, available, userId
  );
  res.json({ ok: true });
});

// GET /rides/drivers — list available drivers for a service type + location
router.get('/drivers', optionalAuth, async (_req: AuthRequest, res: Response) => {
  const { type = 'RIDE', city, country } = _req.query as Record<string, string>;
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT dp.*, u.name, u.phone FROM "DriverProfile" dp
     JOIN "User" u ON u.id = dp."userId"
     WHERE dp."available" = true AND dp."verified" = true
       AND $1 = ANY(dp."services")
       ${city    ? `AND lower(dp."city")    LIKE lower($2)` : ''}
       ${country ? `AND lower(dp."country") LIKE lower(${city ? '$3' : '$2'})` : ''}
     ORDER BY dp."rating" DESC NULLS LAST, dp."totalRides" DESC
     LIMIT 20`,
    ...[type, ...(city ? [city] : []), ...(country ? [country] : [])]
  );
  res.json(rows);
});

// ── Ride requests ─────────────────────────────────────────────────────────────
// POST /rides — create a request
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    type = 'RIDE', pickupAddress, dropoffAddress, pickupLat, pickupLng,
    dropoffLat, dropoffLng, notes, packageDesc, weight, currency = 'USD',
    country, city, scheduledAt,
  } = req.body as {
    type?: string; pickupAddress: string; dropoffAddress?: string;
    pickupLat?: number; pickupLng?: number; dropoffLat?: number; dropoffLng?: number;
    notes?: string; packageDesc?: string; weight?: number; currency?: string;
    country?: string; city?: string; scheduledAt?: string;
  };

  if (!pickupAddress) return res.status(400).json({ error: 'pickupAddress required' });

  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `INSERT INTO "RideRequest"
       ("type","userId","pickupAddress","dropoffAddress","pickupLat","pickupLng",
        "dropoffLat","dropoffLng","notes","packageDesc","weight","currency","country","city","scheduledAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    type, userId, pickupAddress, dropoffAddress ?? null,
    pickupLat ?? null, pickupLng ?? null, dropoffLat ?? null, dropoffLng ?? null,
    notes ?? null, packageDesc ?? null, weight ?? null, currency,
    country ?? null, city ?? null,
    scheduledAt ? new Date(scheduledAt) : null
  );
  res.status(201).json((rows as unknown[])[0]);
});

// GET /rides/my — user's own requests
router.get('/my', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { type } = req.query as { type?: string };
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT r.*, dp."vehicleType", u.name as "driverName", u.phone as "driverPhone"
     FROM "RideRequest" r
     LEFT JOIN "DriverProfile" dp ON dp."userId" = r."driverId"
     LEFT JOIN "User" u ON u.id = r."driverId"
     WHERE r."userId" = $1 ${type ? `AND r."type" = $2` : ''}
     ORDER BY r."createdAt" DESC LIMIT 50`,
    ...[userId, ...(type ? [type] : [])]
  );
  res.json(rows);
});

// GET /rides/available — driver sees open requests near them
router.get('/available', requireAuth, async (req: AuthRequest, res: Response) => {
  const { type, city, country } = req.query as Record<string, string>;
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT r.*, u.name as "userName", u.phone as "userPhone"
     FROM "RideRequest" r
     JOIN "User" u ON u.id = r."userId"
     WHERE r."status" = 'PENDING' AND r."driverId" IS NULL
       ${type    ? `AND r."type" = $1`                    : ''}
       ${city    ? `AND lower(r."city") LIKE lower($${type ? 2 : 1})` : ''}
       ${country ? `AND lower(r."country") LIKE lower($${[type,city].filter(Boolean).length + 1})` : ''}
     ORDER BY r."createdAt" ASC LIMIT 30`,
    ...[...(type ? [type] : []), ...(city ? [city] : []), ...(country ? [country] : [])]
  );
  res.json(rows);
});

// POST /rides/:id/accept
router.post('/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  const driverId = req.user!.id;
  const { id } = req.params as { id: string };
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE "RideRequest" SET "driverId"=$1,"status"='ACCEPTED',"updatedAt"=NOW()
     WHERE id=$2 AND "driverId" IS NULL AND "status"='PENDING'
     RETURNING *`,
    driverId, id
  );
  if (!(rows as unknown[]).length) return res.status(409).json({ error: 'Already taken or not found' });
  res.json((rows as unknown[])[0]);
});

// PATCH /rides/:id/status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params as { id: string };
  const { status, finalPrice } = req.body as { status: string; finalPrice?: number };
  const validStatuses = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const completedAt = status === 'COMPLETED' ? new Date() : null;
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `UPDATE "RideRequest" SET "status"=$1,"updatedAt"=NOW(),
     ${finalPrice !== undefined ? `"finalPrice"=${finalPrice},` : ''}
     "completedAt"=$2
     WHERE id=$3 AND ("driverId"=$4 OR "userId"=$4)
     RETURNING *`,
    status, completedAt, id, userId
  );
  if (!(rows as unknown[]).length) return res.status(404).json({ error: 'Not found or not authorized' });

  // Increment driver totalRides on completion
  if (status === 'COMPLETED') {
    await prisma.$executeRawUnsafe(
      `UPDATE "DriverProfile" SET "totalRides" = "totalRides" + 1 WHERE "userId" = (SELECT "driverId" FROM "RideRequest" WHERE id=$1)`,
      id
    );
  }
  res.json((rows as unknown[])[0]);
});

// GET /rides/:id — single request
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params as { id: string };
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT r.*, u.name as "userName", u.phone as "userPhone",
            d.name as "driverName", d.phone as "driverPhone", dp."vehicleType"
     FROM "RideRequest" r
     JOIN "User" u ON u.id = r."userId"
     LEFT JOIN "User" d ON d.id = r."driverId"
     LEFT JOIN "DriverProfile" dp ON dp."userId" = r."driverId"
     WHERE r.id = $1`, id
  );
  if (!(rows as unknown[]).length) return res.status(404).json({ error: 'Not found' });
  res.json((rows as unknown[])[0]);
});

// ── Admin endpoints ───────────────────────────────────────────────────────────
router.get('/admin/all', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { type, status, page = '1' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * 50;
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT r.*, u.name as "userName", d.name as "driverName"
     FROM "RideRequest" r
     JOIN "User" u ON u.id = r."userId"
     LEFT JOIN "User" d ON d.id = r."driverId"
     WHERE 1=1 ${type ? `AND r."type"=$1` : ''} ${status ? `AND r."status"=$${type ? 2 : 1}` : ''}
     ORDER BY r."createdAt" DESC
     LIMIT 50 OFFSET ${skip}`,
    ...[...(type ? [type] : []), ...(status ? [status] : [])]
  );
  res.json(rows);
});

router.get('/admin/drivers', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const rows = await prisma.$queryRawUnsafe<unknown[]>(
    `SELECT dp.*, u.name, u.email, u.phone FROM "DriverProfile" dp JOIN "User" u ON u.id = dp."userId" ORDER BY dp."createdAt" DESC LIMIT 100`
  );
  res.json(rows);
});

router.patch('/admin/drivers/:id/verify', requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' });
  const { id } = req.params as { id: string };
  await prisma.$executeRawUnsafe(`UPDATE "DriverProfile" SET "verified"=true WHERE id=$1`, id);
  res.json({ ok: true });
});

export default router;
