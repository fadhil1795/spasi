import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/checklist-templates/[id]
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const template = await prisma.checklistTemplate.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error getting checklist template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/checklist-templates/[id] - Update template and replace items
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const oldTemplate = await prisma.checklistTemplate.findUnique({
      where: { id: params.id },
      include: { items: true },
    });

    if (!oldTemplate) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, categoryId, isDefault, items } = body;

    // Delete existing items and recreate
    await prisma.checklistTemplateItem.deleteMany({
      where: { templateId: params.id },
    });

    const updatedTemplate = await prisma.checklistTemplate.update({
      where: { id: params.id },
      data: {
        title: title || oldTemplate.title,
        description: description !== undefined ? description : oldTemplate.description,
        categoryId: categoryId !== undefined ? (categoryId || null) : oldTemplate.categoryId,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : oldTemplate.isDefault,
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
      action: 'UPDATE_CHECKLIST_TEMPLATE',
      entity: 'ChecklistTemplate',
      entityId: params.id,
      details: `Memperbarui template checklist "${updatedTemplate.title}".`,
      oldData: oldTemplate,
      newData: updatedTemplate,
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating checklist template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/checklist-templates/[id]
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const oldTemplate = await prisma.checklistTemplate.findUnique({
      where: { id: params.id },
    });

    if (!oldTemplate) {
      return NextResponse.json({ error: 'Template tidak ditemukan' }, { status: 404 });
    }

    await prisma.checklistTemplate.delete({
      where: { id: params.id },
    });

    await createAuditLog({
      userId: (session.user as any).id,
      action: 'DELETE_CHECKLIST_TEMPLATE',
      entity: 'ChecklistTemplate',
      entityId: params.id,
      details: `Menghapus template checklist "${oldTemplate.title}".`,
      oldData: oldTemplate,
    });

    return NextResponse.json({ success: true, message: 'Template berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting checklist template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
