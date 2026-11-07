import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('departmentId');
    const year = searchParams.get('year');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (year) where.targetFiscalYear = parseInt(year);

    const requests = await prisma.procurementRequest.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedRequests = requests.map((req) => ({
      ...req,
      items: req.items.map((it: any) => {
        let unit = 'Unit';
        let specs = it.specs || '';
        if (specs && specs.startsWith('[Satuan: ')) {
          const match = specs.match(/^\[Satuan:\s*([^\]]+)\]\s*(.*)$/);
          if (match) {
            unit = match[1];
            specs = match[2];
          }
        }
        return {
          ...it,
          unit,
          specs,
        };
      }),
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching procurement requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      title,
      departmentId,
      targetFiscalYear = new Date().getFullYear(),
      vendorName,
      vendorContact,
      items, // Array<{ itemName, categoryId, brand, specs, quantity, unit, estimatedPrice }>
    } = body;

    if (!title || !departmentId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Judul usulan, departemen, dan minimal 1 item barang pengadaan wajib diisi' }, { status: 400 });
    }

    // Generate Request Number (PB-YYYY-XXXX)
    const currentYear = new Date().getFullYear();
    const count = await prisma.procurementRequest.count();
    const requestNumber = `PB-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const totalEstimatedBudget = items.reduce(
      (sum: number, it: any) => sum + (parseFloat(it.estimatedPrice || 0) * parseInt(it.quantity || 1)),
      0
    );

    const newRequest = await prisma.procurementRequest.create({
      data: {
        requestNumber,
        title: title.trim(),
        departmentId,
        requestedById: userId,
        targetFiscalYear: parseInt(targetFiscalYear),
        estimatedBudget: totalEstimatedBudget,
        status: 'SUBMITTED', // Langsung diajukan ke pimpinan / sarpras
        vendorName: vendorName || null,
        vendorContact: vendorContact || null,
        items: {
          create: items.map((it: any) => {
            const unitLabel = it.unit ? `[Satuan: ${it.unit}] ` : '';
            const combinedSpecs = it.specs ? `${unitLabel}${it.specs.trim()}` : (unitLabel ? unitLabel.trim() : null);
            return {
              itemName: it.itemName.trim(),
              categoryId: it.categoryId,
              brand: it.brand || null,
              specs: combinedSpecs,
              quantity: Math.max(1, parseInt(it.quantity || 1)),
              estimatedPrice: parseFloat(it.estimatedPrice || 0),
            };
          }),
        },
      },
      include: {
        department: true,
        requestedBy: true,
        items: true,
      },
    });

    // Format items response with parsed unit
    const formattedResult = {
      ...newRequest,
      items: newRequest.items.map((it: any) => {
        let unit = 'Unit';
        let specs = it.specs || '';
        if (specs && specs.startsWith('[Satuan: ')) {
          const match = specs.match(/^\[Satuan:\s*([^\]]+)\]\s*(.*)$/);
          if (match) {
            unit = match[1];
            specs = match[2];
          }
        }
        return {
          ...it,
          unit,
          specs,
        };
      }),
    };

    return NextResponse.json(formattedResult, { status: 201 });
  } catch (error: any) {
    console.error('Error creating procurement request:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
