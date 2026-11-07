import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
      include: {
        department: true,
        requestedBy: true,
        items: {
          include: { category: true },
        },
      },
    });

    if (!procurement) {
      return NextResponse.json({ error: 'Usulan pengadaan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(procurement);
  } catch (error) {
    console.error('Error fetching procurement detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { status, rejectionReason, vendorName, vendorContact, realizedBudget, invoiceDocUrl, bastDocUrl } = body;

    const existing = await prisma.procurementRequest.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Usulan pengadaan tidak ditemukan' }, { status: 404 });
    }

    const updated = await prisma.procurementRequest.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(rejectionReason !== undefined && { rejectionReason }),
        ...(vendorName !== undefined && { vendorName }),
        ...(vendorContact !== undefined && { vendorContact }),
        ...(realizedBudget !== undefined && { realizedBudget: parseFloat(realizedBudget) }),
        ...(invoiceDocUrl !== undefined && { invoiceDocUrl }),
        ...(bastDocUrl !== undefined && { bastDocUrl }),
      },
      include: {
        department: true,
        requestedBy: true,
        items: { include: { category: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating procurement request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
