import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/maintenance/schedules/[id] - Memperbarui jadwal servis berkala
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { intervalDays, lastMaintenance, nextDueDate, isActive } = body;

    const existing = await prisma.maintenanceSchedule.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Jadwal maintenance tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id: params.id },
      data: {
        intervalDays: intervalDays !== undefined ? parseInt(intervalDays) : existing.intervalDays,
        lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : existing.lastMaintenance,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : existing.nextDueDate,
        isActive: isActive !== undefined ? isActive : existing.isActive
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/maintenance/schedules/[id] - Menghapus jadwal servis berkala
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.maintenanceSchedule.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, message: 'Jadwal maintenance berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
