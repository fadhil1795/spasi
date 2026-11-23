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

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        location: true,
        department: true,
        loans: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        rentals: {
          include: { renter: { select: { name: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenance: {
          orderBy: { startDate: 'desc' },
          take: 10,
        },
        transfers: {
          orderBy: { transferredAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json(asset);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const qty = body.quantity ? Math.max(1, parseInt(body.quantity)) : 1;

    // Ambil data aset sebelum diupdate untuk perbandingan
    const existing = await prisma.asset.findUnique({
      where: { id: params.id },
      include: { location: true, department: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    // Validasi duplikasi nomor seri (Serial Number) saat pembaruan
    if (body.serialNumber !== undefined) {
      const cleanSerial = body.serialNumber ? String(body.serialNumber).trim() : null;
      if (cleanSerial && cleanSerial !== '-' && cleanSerial !== 'N/A' && cleanSerial !== existing.serialNumber) {
        const duplicateSerial = await prisma.asset.findFirst({
          where: {
            id: { not: params.id },
            serialNumber: { equals: cleanSerial },
          },
        });

        if (duplicateSerial) {
          return NextResponse.json(
            {
              error: `Nomor seri (S/N) "${cleanSerial}" sudah terdaftar pada aset ${duplicateSerial.name} (${duplicateSerial.code}). Pastikan nomor seri fisik unik.`,
            },
            { status: 409 }
          );
        }
      }
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        categoryId: body.categoryId !== undefined ? body.categoryId : existing.categoryId,
        locationId: body.locationId !== undefined ? (body.locationId || null) : existing.locationId,
        departmentId: body.departmentId !== undefined ? (body.departmentId || null) : existing.departmentId,
        status: body.status !== undefined ? body.status : existing.status,
        condition: body.condition !== undefined ? body.condition : existing.condition,
        quantity: body.quantity !== undefined ? qty : existing.quantity,
        availableQty: body.availableQty !== undefined ? Math.max(0, parseInt(body.availableQty)) : existing.availableQty,
        purchaseDate: body.purchaseDate !== undefined ? (body.purchaseDate ? new Date(body.purchaseDate) : null) : existing.purchaseDate,
        purchaseCost: body.purchaseCost !== undefined ? (body.purchaseCost ? parseFloat(body.purchaseCost) : null) : existing.purchaseCost,
        currentValue: body.currentValue !== undefined ? (body.currentValue ? parseFloat(body.currentValue) : null) : existing.currentValue,
        salvageValue: body.salvageValue !== undefined ? (body.salvageValue ? parseFloat(body.salvageValue) : 0) : existing.salvageValue,
        brand: body.brand !== undefined ? body.brand : existing.brand,
        serialNumber: body.serialNumber !== undefined ? (body.serialNumber?.trim() || null) : existing.serialNumber,
        dailyRentRate: body.dailyRentRate !== undefined ? (body.dailyRentRate ? parseFloat(body.dailyRentRate) : null) : existing.dailyRentRate,
        sessionRentRate: body.sessionRentRate !== undefined ? (body.sessionRentRate ? parseFloat(body.sessionRentRate) : null) : existing.sessionRentRate,
        isRentable: body.isRentable !== undefined ? Boolean(body.isRentable) : existing.isRentable,
        isLoanable: body.isLoanable !== undefined ? Boolean(body.isLoanable) : existing.isLoanable,
        isFixedToRoom: body.isFixedToRoom !== undefined ? Boolean(body.isFixedToRoom) : existing.isFixedToRoom,
        picName: body.picName !== undefined ? (body.picName?.trim() || null) : existing.picName,
        images: body.images !== undefined ? (Array.isArray(body.images) ? JSON.stringify(body.images) : body.images) : existing.images,
        customAttributes: body.customAttributes !== undefined ? (typeof body.customAttributes === 'object' ? JSON.stringify(body.customAttributes) : (body.customAttributes || null)) : existing.customAttributes,
      },
    });

    // Jika terjadi perpindahan/mutasi lokasi, unit, atau PIC, catat otomatis di TransferLog
    const locChanged = body.locationId !== undefined && (body.locationId || null) !== (existing.locationId || null);
    const deptChanged = body.departmentId !== undefined && (body.departmentId || null) !== (existing.departmentId || null);
    const picChanged = body.picName !== undefined && (body.picName?.trim() || null) !== (existing.picName || null);

    if (existing && (locChanged || deptChanged || picChanged)) {
      const newLoc = updatedAsset.locationId ? await prisma.location.findUnique({ where: { id: updatedAsset.locationId } }) : null;
      const newDept = updatedAsset.departmentId ? await prisma.department.findUnique({ where: { id: updatedAsset.departmentId } }) : null;

      const fromText = existing.location ? `${existing.location.name || existing.location.building} (${existing.location.room || '-'})` : 'Gudang Umum / Tanpa Lokasi';
      const toText = newLoc ? `${newLoc.name || newLoc.building} (${newLoc.room || '-'})` : 'Gudang Umum / Tanpa Lokasi';
      const fromDeptText = existing.department ? `${existing.department.name} (${existing.department.code})` : 'Inventaris Pusat Instansi';
      const toDeptText = newDept ? `${newDept.name} (${newDept.code})` : 'Inventaris Pusat Instansi';
      const fromPic = existing.picName || existing.location?.picName || existing.department?.headName || 'Belum Ditentukan';
      const toPic = updatedAsset.picName || newLoc?.picName || newDept?.headName || fromPic;

      const actorName = (session.user as any).name || (session.user as any).email || 'Petugas Sarpras';
      const now = new Date();
      const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const rand = Math.floor(1000 + Math.random() * 9000);

      await prisma.transferLog.create({
        data: {
          transferNumber: `MUT-${ym}-${rand}`,
          assetId: params.id,
          fromLocationId: existing.locationId,
          toLocationId: updatedAsset.locationId,
          fromLocation: fromText,
          toLocation: toText,
          fromDepartmentId: existing.departmentId,
          toDepartmentId: updatedAsset.departmentId,
          fromDepartment: fromDeptText,
          toDepartment: toDeptText,
          fromPicName: fromPic,
          toPicName: toPic,
          status: 'APPROVED',
          transferredBy: actorName,
          approvedBy: actorName,
          approvedAt: now,
          reason: body.transferReason || 'Perubahan penempatan / mutasi aset melalui sistem',
        },
      });
    }

    // Catat di AuditLog lengkap dengan perubahan data (A -> B)
    await recordAuditLog({
      action: 'UPDATE_ASSET',
      entity: 'Asset',
      entityId: params.id,
      userId: (session.user as any).id,
      details: `Memperbarui data & spesifikasi aset ${updatedAsset.name} (${updatedAsset.code})`,
      oldData: existing,
      newData: updatedAsset,
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const PATCH = PUT;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.asset.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        status: true,
        condition: true,
        loans: {
          where: { status: { in: ['PENDING_L1', 'PENDING_L2', 'APPROVED', 'ACTIVE'] } },
          select: { id: true, ticketNumber: true, status: true },
          take: 1,
        },
        rentals: {
          where: { payStatus: { notIn: ['REFUNDED', 'CANCELLED'] } },
          select: { id: true, bookingNumber: true, payStatus: true },
          take: 1,
        },
        maintenance: {
          where: { status: { in: ['SCHEDULED', 'ONGOING'] } },
          select: { id: true, description: true, status: true },
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    // 1. Cek status operasional
    if (['BORROWED', 'RENTED', 'MAINTENANCE'].includes(existing.status)) {
      return NextResponse.json(
        {
          error: `Aset tidak dapat dihapus karena status saat ini adalah "${existing.status}". Selesaikan peminjaman, penyewaan, atau perawatan terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    // 2. Cek transaksi aktif
    if (existing.loans.length > 0) {
      return NextResponse.json(
        {
          error: `Aset memiliki transaksi peminjaman aktif (#${existing.loans[0].ticketNumber} - Status: ${existing.loans[0].status}). Tidak dapat dihapus.`,
        },
        { status: 400 }
      );
    }

    if (existing.rentals.length > 0) {
      return NextResponse.json(
        {
          error: `Aset memiliki transaksi penyewaan aktif (#${existing.rentals[0].bookingNumber}). Tidak dapat dihapus.`,
        },
        { status: 400 }
      );
    }

    if (existing.maintenance.length > 0) {
      return NextResponse.json(
        {
          error: `Aset memiliki agenda pemeliharaan/perbaikan aktif (${existing.maintenance[0].description}). Tidak dapat dihapus.`,
        },
        { status: 400 }
      );
    }

    await prisma.asset.delete({
      where: { id: params.id },
    });

    if (existing) {
      await recordAuditLog({
        action: 'DELETE_ASSET',
        entity: 'Asset',
        entityId: params.id,
        userId: (session.user as any).id,
        details: `Menghapus aset ${existing.name} (${existing.code})`,
        oldData: existing,
        newData: null,
      });
    }

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Aset tidak dapat dihapus karena memiliki riwayat peminjaman, penyewaan, atau perawatan. Ubah statusnya menjadi "INACTIVE" atau "DISPOSED" saja.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
