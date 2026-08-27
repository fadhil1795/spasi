import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/maintenance/[id] - Mendapatkan satu detail record perawatan
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const record = await prisma.maintenance.findUnique({
      where: { id: params.id },
      include: {
        asset: true,
        location: true,
        claim: true
      }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record maintenance tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/maintenance/[id] - Mengupdate status pekerjaan maintenance
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, cost, endDate, vendor, notes, resultingAssetStatus } = body;

    const existing = await prisma.maintenance.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record maintenance tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.maintenance.update({
      where: { id: params.id },
      data: {
        status: status || existing.status,
        cost: cost !== undefined ? parseFloat(cost) : existing.cost,
        endDate: endDate ? new Date(endDate) : (status === 'COMPLETED' || status === 'FAILED' ? new Date() : existing.endDate),
        vendor: vendor !== undefined ? vendor : existing.vendor,
        notes: notes !== undefined ? notes : existing.notes
      }
    });

    // Handle Transisi Status Operasional Objek Aset / Ruangan
    if (status === 'COMPLETED') {
      if (existing.assetId) {
        await prisma.asset.update({
          where: { id: existing.assetId },
          data: { status: 'AVAILABLE' }
        });
      }
      if (existing.locationId) {
        await prisma.location.update({
          where: { id: existing.locationId },
          data: { status: 'AVAILABLE' }
        });
      }

      // Jika korektif dari claim, update status claim menjadi RESOLVED
      if (existing.claimId) {
        await prisma.assetClaim.update({
          where: { id: existing.claimId },
          data: { status: 'RESOLVED', resolvedAt: new Date() }
        });
      }
    } else if (status === 'FAILED') {
      // Jika perbaikan gagal, tentukan status akhir (default DAMAGED / rusak berat)
      const finalObjStatus = resultingAssetStatus || 'DAMAGED'; // DAMAGED, DISPOSED
      if (existing.assetId) {
        await prisma.asset.update({
          where: { id: existing.assetId },
          data: { status: finalObjStatus }
        });
      }
      if (existing.locationId) {
        await prisma.location.update({
          where: { id: existing.locationId },
          // Untuk ruangan: gagal servis bisa ditandai INACTIVE (nonaktif)
          data: { status: finalObjStatus === 'DISPOSED' ? 'INACTIVE' : 'MAINTENANCE' }
        });
      }
    } else if (status === 'ONGOING') {
      // Jika dikembalikan ke ONGOING, kembalikan status objek ke MAINTENANCE
      if (existing.assetId) {
        await prisma.asset.update({
          where: { id: existing.assetId },
          data: { status: 'MAINTENANCE' }
        });
      }
      if (existing.locationId) {
        await prisma.location.update({
          where: { id: existing.locationId },
          data: { status: 'MAINTENANCE' }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating maintenance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/maintenance/[id] - Menghapus record maintenance
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.maintenance.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Record maintenance tidak ditemukan' }, { status: 404 });
    }

    // Jika record yang dihapus sedang berjalan, kembalikan objek target menjadi AVAILABLE
    if (['ONGOING', 'SCHEDULED'].includes(existing.status)) {
      if (existing.assetId) {
        await prisma.asset.update({
          where: { id: existing.assetId },
          data: { status: 'AVAILABLE' }
        });
      }
      if (existing.locationId) {
        await prisma.location.update({
          where: { id: existing.locationId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    await prisma.maintenance.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Record maintenance berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting maintenance:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
