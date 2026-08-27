import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/checklist-templates - List all checklist templates or filter by categoryId
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where: any = {};
    if (categoryId) {
      where.OR = [
        { categoryId },
        { isDefault: true },
      ];
    }

    const templates = await prisma.checklistTemplate.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/checklist-templates - Create new checklist template with items
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, categoryId, isDefault, items } = body;

    if (!title) {
      return NextResponse.json({ error: 'Judul template wajib diisi' }, { status: 400 });
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        title,
        description: description || null,
        categoryId: categoryId || null,
        isDefault: Boolean(isDefault),
        items: {
          create: (items || []).map((item: any, idx: number) => ({
            name: item.name,
            description: item.description || null,
            isRequired: item.isRequired !== undefined ? Boolean(item.isRequired) : true,
            sortOrder: item.sortOrder !== undefined ? parseInt(item.sortOrder) : idx,
          })),
        },
      },
      include: {
        category: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    await createAuditLog({
      userId: (session.user as any).id,
      action: 'CREATE_CHECKLIST_TEMPLATE',
      entity: 'ChecklistTemplate',
      entityId: template.id,
      details: `Membuat template checklist "${template.title}" dengan ${template.items.length} item.`,
      newData: template,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
