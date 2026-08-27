import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/maintenance - Mendapatkan list semua record perawatan
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ONGOING, SCHEDULED, COMPLETED, FAILED
    const type = searchParams.get('type');     // PREVENTIVE, CORRECTIVE
    const assetId = searchParams.get('assetId');
    const locationId = searchParams.get('locationId');

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (assetId) where.assetId = assetId;
    if (locationId) where.locationId = locationId;

    const records = await prisma.maintenance.findMany({
      where,
      include: {
        asset: { select: { name: true, code: true, status: true } },
        location: { select: { name: true, code: true, status: true, building: true } },
        claim: { select: { claimNumber: true, type: true, status: true } }
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/maintenance - Membuat record perawatan baru
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      assetId,
      locationId,
      type, // PREVENTIVE, CORRECTIVE
      description,
      cost,
      startDate,
      endDate,
      status, // SCHEDULED, ONGOING, COMPLETED, FAILED
      vendor,
      claimId,
      notes
    } = body;

    if (!description || (!assetId && !locationId)) {
      return NextResponse.json({ error: 'Data maintenance tidak lengkap. Deskripsi & target objek wajib ditentukan.' }, { status: 400 });
    }

    const parsedStartDate = startDate ? new Date(startDate) : new Date();
    const parsedEndDate = endDate ? new Date(endDate) : null;
    const finalStatus = status || 'ONGOING';

    // Buat record maintenance baru
    const record = await prisma.maintenance.create({
      data: {
        assetId: assetId || null,
        locationId: locationId || null,
        type: type || 'PREVENTIVE',
        description,
        cost: cost ? parseFloat(cost) : 0,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        status: finalStatus,
        vendor: vendor || null,
        claimId: claimId || null,
        notes: notes || null
      },
      include: {
        asset: true,
        location: true
      }
    });

    // Jika status pekerjaan dijadwalkan sekarang / sedang berjalan (SCHEDULED / ONGOING)
    // Otomatis ubah status operasional objek menjadi MAINTENANCE agar tidak dapat dibooking
    if (['SCHEDULED', 'ONGOING'].includes(finalStatus)) {
      if (assetId) {
        await prisma.asset.update({
          where: { id: assetId },
          data: { status: 'MAINTENANCE' }
        });
      }
      if (locationId) {
        await prisma.location.update({
          where: { id: locationId },
          data: { status: 'MAINTENANCE' }
        });
      }
    } else if (finalStatus === 'COMPLETED') {
      // Jika langsung di-set COMPLETED, kembalikan status operasional ke AVAILABLE
      if (assetId) {
        await prisma.asset.update({
          where: { id: assetId },
          data: { status: 'AVAILABLE' }
        });
      }
      if (locationId) {
        await prisma.location.update({
          where: { id: locationId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error: any) {
    console.error('Error creating maintenance record:', error);
    // Handle unique constraint error on claimId (P2002)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Klaim kerusakan ini sudah terhubung ke jadwal perbaikan aktif.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
