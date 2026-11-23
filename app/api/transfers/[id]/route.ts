import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transfer = await prisma.transferLog.findUnique({
      where: { id: params.id },
      include: {
        asset: {
          include: {
            category: true,
            department: true,
            location: true,
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: 'Data mutasi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (error) {
    console.error('Error fetching transfer log:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole)) {
      return NextResponse.json({ error: 'Hanya Admin atau Approver yang dapat menyetujui/menolak mutasi' }, { status: 403 });
    }

    const body = await request.json();
    const { action, rejectionNotes } = body; // action: 'APPROVE' | 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Tindakan tidak valid' }, { status: 400 });
    }

    const existing = await prisma.transferLog.findUnique({
      where: { id: params.id },
      include: { asset: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data mutasi tidak ditemukan' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: `Pengajuan mutasi ini sudah berstatus ${existing.status}` }, { status: 400 });
    }

    const actorName = (session.user as any)?.name || (session.user as any)?.email || 'Pejabat Approver';
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLog = await tx.transferLog.update({
        where: { id: params.id },
        data: {
          status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          approvedBy: actorName,
          approvedAt: now,
          rejectionNotes: action === 'REJECT' ? (rejectionNotes?.trim() || 'Ditolak oleh pejabat berwenang') : null,
        },
        include: {
          asset: {
            include: {
              category: true,
              location: true,
              department: true,
            },
          },
        },
      });

      if (action === 'APPROVE') {
        const assetUpdateData: any = {
          locationId: existing.toLocationId ?? null,
          departmentId: existing.toDepartmentId ?? null,
        };
        if (existing.toPicName) {
          assetUpdateData.picName = existing.toPicName;
        }

        await tx.asset.update({
          where: { id: existing.assetId },
          data: assetUpdateData,
        });

        // Sinkronisasi RoomAssetAllocation agar Kartu Inventaris Ruangan (KIR) selalu akurat
        if ((existing.fromLocationId || null) !== (existing.toLocationId || null)) {
          if (existing.fromLocationId) {
            await tx.roomAssetAllocation.deleteMany({
              where: { assetId: existing.assetId, locationId: existing.fromLocationId },
            });
          }
          if (existing.toLocationId) {
            await tx.roomAssetAllocation.upsert({
              where: {
                locationId_assetId: {
                  locationId: existing.toLocationId,
                  assetId: existing.assetId,
                },
              },
              update: { quantity: existing.asset?.quantity || 1 },
              create: {
                locationId: existing.toLocationId,
                assetId: existing.assetId,
                quantity: existing.asset?.quantity || 1,
                notes: `Mutasi ${existing.transferNumber || existing.id}`,
              },
            });
          }
        }
      }

      return updatedLog;
    });

    await recordAuditLog({
      action: action === 'APPROVE' ? 'APPROVE_TRANSFER' : 'REJECT_TRANSFER',
      entity: 'TransferLog',
      entityId: params.id,
      userId: (session.user as any)?.id,
      details: `${action === 'APPROVE' ? 'Menyetujui' : 'Menolak'} mutasi aset ${existing.asset.name} (${existing.asset.code}): ${existing.fromLocation} -> ${existing.toLocation}`,
      oldData: existing,
      newData: updated,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating transfer:', error);
    return NextResponse.json({ error: 'Gagal memproses persetujuan mutasi' }, { status: 500 });
  }
}
