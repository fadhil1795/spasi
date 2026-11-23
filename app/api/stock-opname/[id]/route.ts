import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const opnameSession = await prisma.stockOpnameSession.findUnique({
      where: { id: params.id },
      include: {
        location: {
          include: {
            department: true,
          },
        },
        auditor: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            asset: {
              select: {
                id: true,
                code: true,
                name: true,
                brand: true,
                serialNumber: true,
                images: true,
                category: {
                  select: {
                    name: true,
                    parent: { select: { name: true } },
                  },
                },
                location: { select: { name: true, building: true, room: true } },
              },
            },
          },
          orderBy: [
            { scanStatus: 'asc' }, // MATCH, MISSING, WRONG_LOCATION
            { scannedAt: 'desc' },
          ],
        },
      },
    });

    if (!opnameSession) {
      return NextResponse.json({ error: 'Sesi Stock Opname tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(opnameSession);
  } catch (error) {
    console.error('Error fetching stock opname session detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { status, notes } = body;

    const opname = await prisma.stockOpnameSession.findUnique({
      where: { id: params.id },
    });

    if (!opname) {
      return NextResponse.json({ error: 'Sesi Stock Opname tidak ditemukan' }, { status: 404 });
    }

    const updatedData: any = {};
    if (status) {
      updatedData.status = status;
      if (status === 'COMPLETED') {
        updatedData.completedDate = new Date();
      }
    }
    if (notes !== undefined) updatedData.notes = notes;

    const updated = await prisma.stockOpnameSession.update({
      where: { id: params.id },
      data: updatedData,
      include: {
        location: true,
        auditor: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating stock opname session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
