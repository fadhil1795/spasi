import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Admin yang berhak melakukan rekonsiliasi data master aset' }, { status: 403 });
    }

    const userId = (session.user as any).id;

    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        items: {
          include: { asset: true },
        },
      },
    });

    if (!opnameSession) {
      return NextResponse.json({ error: 'Sesi Stock Opname tidak ditemukan' }, { status: 404 });
    }

    let reconciledCount = 0;
    let locationUpdatedCount = 0;
    let conditionUpdatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of opnameSession.items) {
        if (item.isResolved) continue;

        const asset = item.asset;
        const updates: any = {};

        // 1. Relocate wrong-location assets to this actual room
        if (item.scanStatus === 'WRONG_LOCATION' && item.actualLocationId) {
          updates.locationId = item.actualLocationId;
          locationUpdatedCount++;

          // Record transfer log
          await tx.transferLog.create({
            data: {
              assetId: asset.id,
              fromLocation: item.expectedLocationId || 'Lokasi Sebelumnya',
              toLocation: item.actualLocationId || opnameSession.locationId,
              transferredAt: new Date(),
              transferredBy: userId,
              reason: `[SINKRONISASI OPNAME] Dipindahkan secara otomatis sesuai temuan fisik pada ${opnameSession.title} (#${opnameSession.sessionNumber}).`,
            },
          });
        }

        // 2. Update condition if physical condition changed
        if (item.conditionAfter && item.conditionAfter !== asset.condition) {
          updates.condition = item.conditionAfter;
          conditionUpdatedCount++;
        }

        // Apply asset updates if any
        if (Object.keys(updates).length > 0) {
          await tx.asset.update({
            where: { id: asset.id },
            data: updates,
          });
        }

        // Mark item as resolved
        await tx.stockOpnameItem.update({
          where: { id: item.id },
          data: { isResolved: true },
        });

        reconciledCount++;
      }

      // Mark session as COMPLETED
      await tx.stockOpnameSession.update({
        where: { id: opnameSession.id },
        data: {
          status: 'COMPLETED',
          completedDate: new Date(),
        },
      });
    });

    return NextResponse.json({
      message: `Rekonsiliasi selesai. ${reconciledCount} aset disinkronisasi (${locationUpdatedCount} pemindahan lokasi otomatis, ${conditionUpdatedCount} pembaruan kondisi fisik).`,
      reconciledCount,
      locationUpdatedCount,
      conditionUpdatedCount,
    });
  } catch (error) {
    console.error('Error reconciling stock opname:', error);
    return NextResponse.json({ error: 'Gagal melakukan sinkronisasi data hasil opname' }, { status: 500 });
  }
}
