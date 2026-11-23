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
    const actorName = (session.user as any).name || (session.user as any).email || 'Admin Opname';

    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id: params.id },
      include: {
        location: true,
        items: {
          include: {
            asset: {
              include: {
                location: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!opnameSession) {
      return NextResponse.json({ error: 'Sesi Stock Opname tidak ditemukan' }, { status: 404 });
    }

    let reconciledCount = 0;
    let locationUpdatedCount = 0;
    let conditionUpdatedCount = 0;

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targetRoomName = opnameSession.location
      ? `${opnameSession.location.name || opnameSession.location.building}${opnameSession.location.room ? ` (${opnameSession.location.room})` : ''}`
      : 'Ruangan Audit';

    await prisma.$transaction(async (tx) => {
      for (const item of opnameSession.items) {
        if (item.isResolved) continue;

        const asset = item.asset;
        const updates: any = {};

        // 1. Relocate wrong-location assets to this actual room
        if (item.scanStatus === 'WRONG_LOCATION' && (item.actualLocationId || opnameSession.locationId)) {
          const newLocId = item.actualLocationId || opnameSession.locationId;
          updates.locationId = newLocId;
          locationUpdatedCount++;

          const fromRoomName = asset.location
            ? `${asset.location.name || asset.location.building}${asset.location.room ? ` (${asset.location.room})` : ''}`
            : 'Gudang Utama / Tanpa Ruangan';

          const rand = Math.floor(1000 + Math.random() * 9000);
          const transferNumber = `MUT-${ym}-${rand}`;

          // Record transfer log
          await tx.transferLog.create({
            data: {
              transferNumber,
              assetId: asset.id,
              fromLocationId: asset.locationId,
              toLocationId: newLocId,
              fromLocation: fromRoomName,
              toLocation: targetRoomName,
              fromDepartmentId: asset.departmentId,
              toDepartmentId: asset.departmentId,
              fromDepartment: asset.department ? `${asset.department.name} (${asset.department.code})` : 'Inventaris Pusat',
              toDepartment: asset.department ? `${asset.department.name} (${asset.department.code})` : 'Inventaris Pusat',
              fromPicName: asset.picName || asset.location?.picName || 'Belum Ditentukan',
              toPicName: opnameSession.location?.picName || asset.picName || 'Belum Ditentukan',
              status: 'APPROVED',
              transferredAt: now,
              transferredBy: actorName,
              approvedBy: actorName,
              approvedAt: now,
              reason: `[SINKRONISASI OPNAME] Dipindahkan otomatis sesuai temuan fisik pada ${opnameSession.title} (#${opnameSession.sessionNumber}).`,
            },
          });

          // Sinkronisasi RoomAssetAllocation agar KIR ruangan lama & baru akurat
          if (asset.locationId) {
            await tx.roomAssetAllocation.deleteMany({
              where: { assetId: asset.id, locationId: asset.locationId },
            });
          }
          if (newLocId) {
            await tx.roomAssetAllocation.upsert({
              where: {
                locationId_assetId: {
                  locationId: newLocId,
                  assetId: asset.id,
                },
              },
              update: { quantity: asset.quantity || 1 },
              create: {
                locationId: newLocId,
                assetId: asset.id,
                quantity: asset.quantity || 1,
                notes: `Rekonsiliasi Opname #${opnameSession.sessionNumber}`,
              },
            });
          }
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
