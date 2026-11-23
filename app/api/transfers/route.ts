import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assetId = searchParams.get('assetId');

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (assetId) {
      where.assetId = assetId;
    }

    const transfers = await prisma.transferLog.findMany({
      where,
      orderBy: { transferredAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            code: true,
            name: true,
            brand: true,
            condition: true,
            status: true,
            picName: true,
            category: { select: { id: true, name: true } },
            location: { select: { id: true, name: true, building: true, room: true, picName: true } },
            department: { select: { id: true, code: true, name: true, headName: true } },
          },
        },
      },
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'APPROVER', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      assetId,
      toLocationId,
      toDepartmentId,
      toPicName,
      reason,
      autoApprove,
    } = body;

    if (!assetId) {
      return NextResponse.json({ error: 'Pilih aset yang akan dimutasi' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        location: true,
        department: true,
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    // Resolve target location & department
    const targetLocation =
      toLocationId && toLocationId !== 'NONE'
        ? await prisma.location.findUnique({ where: { id: toLocationId } })
        : null;

    const targetDepartment =
      toDepartmentId && toDepartmentId !== 'NONE'
        ? await prisma.department.findUnique({ where: { id: toDepartmentId } })
        : null;

    const fromLocationText = asset.location
      ? `${asset.location.name || asset.location.building}${asset.location.room ? ` (${asset.location.room})` : ''}`
      : 'Gudang Utama / Tanpa Ruangan';

    const toLocationText =
      toLocationId === undefined
        ? fromLocationText
        : targetLocation
        ? `${targetLocation.name || targetLocation.building}${targetLocation.room ? ` (${targetLocation.room})` : ''}`
        : 'Gudang Utama / Tanpa Ruangan';

    const fromDeptText = asset.department ? `${asset.department.name} (${asset.department.code})` : 'Inventaris Pusat Instansi';
    const toDeptText =
      toDepartmentId === undefined
        ? fromDeptText
        : targetDepartment
        ? `${targetDepartment.name} (${targetDepartment.code})`
        : 'Inventaris Pusat Instansi';

    const fromPicText = asset.picName || asset.location?.picName || asset.department?.headName || 'Belum Ditentukan';
    const toPicText =
      toPicName !== undefined && toPicName.trim() !== ''
        ? toPicName.trim()
        : targetLocation?.picName || targetDepartment?.headName || fromPicText;

    const isLocationChanged = toLocationId !== undefined && (toLocationId || null) !== (asset.locationId || null);
    const isDeptChanged = toDepartmentId !== undefined && (toDepartmentId || null) !== (asset.departmentId || null);
    const isPicChanged = toPicText !== fromPicText;

    if (!isLocationChanged && !isDeptChanged && !isPicChanged) {
      return NextResponse.json(
        { error: 'Tidak ada perubahan ruangan, unit/fakultas, maupun penanggung jawab pada pengajuan mutasi ini.' },
        { status: 400 }
      );
    }

    const canImmediateApprove = ['SUPER_ADMIN', 'ADMIN', 'APPROVER'].includes(userRole) && Boolean(autoApprove);
    const initialStatus = canImmediateApprove ? 'APPROVED' : 'PENDING';
    const actorName = (session.user as any)?.name || (session.user as any)?.email || 'Petugas Sarpras';

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    const transferNumber = `MUT-${ym}-${rand}`;

    const result = await prisma.$transaction(async (tx) => {
      const createdTransfer = await tx.transferLog.create({
        data: {
          transferNumber,
          assetId: asset.id,
          fromLocationId: asset.locationId,
          toLocationId: toLocationId === 'NONE' ? null : (toLocationId !== undefined ? toLocationId : asset.locationId),
          fromLocation: fromLocationText,
          toLocation: toLocationText,
          fromDepartmentId: asset.departmentId,
          toDepartmentId: toDepartmentId === 'NONE' ? null : (toDepartmentId !== undefined ? toDepartmentId : asset.departmentId),
          fromDepartment: fromDeptText,
          toDepartment: toDeptText,
          fromPicName: fromPicText,
          toPicName: toPicText,
          status: initialStatus,
          transferredBy: actorName,
          approvedBy: canImmediateApprove ? actorName : null,
          approvedAt: canImmediateApprove ? now : null,
          reason: reason?.trim() || 'Mutasi penempatan / pengelolaan aset',
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

      if (canImmediateApprove) {
        await tx.asset.update({
          where: { id: asset.id },
          data: {
            locationId: toLocationId === 'NONE' ? null : (toLocationId !== undefined ? toLocationId : asset.locationId),
            departmentId: toDepartmentId === 'NONE' ? null : (toDepartmentId !== undefined ? toDepartmentId : asset.departmentId),
            picName: toPicText,
          },
        });
      }

      return createdTransfer;
    });

    await recordAuditLog({
      action: canImmediateApprove ? 'CREATE_AND_APPROVE_TRANSFER' : 'REQUEST_TRANSFER',
      entity: 'TransferLog',
      entityId: result.id,
      userId: (session.user as any)?.id,
      details: `${canImmediateApprove ? 'Memproses & menyetujui' : 'Mengajukan'} mutasi aset ${asset.name} (${asset.code}) [${transferNumber}]: ${fromLocationText} -> ${toLocationText}`,
      newData: result,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({ error: 'Gagal memproses pengajuan mutasi aset' }, { status: 500 });
  }
}
