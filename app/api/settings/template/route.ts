import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_TEMPLATE = {
  id: 'default',
  institutionName: 'SPASI — Sistem Pencatatan Aset & Sewa Instansi',
  institutionSubtitle: null,
  institutionLogoUrl: null,
  signerName: 'Petugas Pengelola Aset',
  signerTitle: 'Petugas SPASI',
  signerNip: null,
  receiptFooterNote: null,
  emailSignature: null,
};

export async function GET() {
  try {
    let tpl = await prisma.documentTemplate.findUnique({ where: { id: 'default' } });
    if (!tpl) {
      tpl = await prisma.documentTemplate.create({ data: DEFAULT_TEMPLATE });
    }
    return NextResponse.json(tpl);
  } catch (error) {
    console.error('Error fetching document template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      institutionName, institutionSubtitle, institutionLogoUrl,
      signerName, signerTitle, signerNip,
      receiptFooterNote, emailSignature,
    } = body;

    const dataToSave = {
      institutionName: institutionName || DEFAULT_TEMPLATE.institutionName,
      institutionSubtitle: institutionSubtitle || null,
      institutionLogoUrl: institutionLogoUrl || null,
      signerName: signerName || DEFAULT_TEMPLATE.signerName,
      signerTitle: signerTitle || DEFAULT_TEMPLATE.signerTitle,
      signerNip: signerNip || null,
      receiptFooterNote: receiptFooterNote || null,
      emailSignature: emailSignature || null,
    };

    const tpl = await prisma.documentTemplate.upsert({
      where: { id: 'default' },
      update: dataToSave,
      create: { id: 'default', ...dataToSave },
    });

    return NextResponse.json(tpl);
  } catch (error: any) {
    console.error('Error updating document template:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
