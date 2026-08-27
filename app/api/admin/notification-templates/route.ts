import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_TEMPLATES = [
  { eventType: 'BOOKING_CONFIRM',  label: 'Konfirmasi Booking',        templateWa: 'Halo {{name}}, booking {{item}} Anda pada {{date}} telah dikonfirmasi. No. Booking: {{txNumber}}.' },
  { eventType: 'PENALTY_NOTICE',   label: 'Notifikasi Denda',           templateWa: 'Halo {{name}}, Anda memiliki denda sebesar Rp {{amount}} dari transaksi {{txNumber}}.' },
  { eventType: 'APPROVAL_RESULT',  label: 'Hasil Persetujuan',          templateWa: 'Halo {{name}}, pengajuan {{txNumber}} telah {{status}} oleh {{approver}}.' },
  { eventType: 'RETURN_REMINDER',  label: 'Pengingat Pengembalian',     templateWa: 'Halo {{name}}, jangan lupa mengembalikan {{item}} pada {{date}}.' },
  { eventType: 'BLACKLIST_NOTICE', label: 'Notifikasi Penangguhan',     templateWa: 'Halo {{name}}, akun Anda telah ditangguhkan. Alasan: {{reason}}.' },
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  for (const t of DEFAULT_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { eventType: t.eventType },
      update: {},
      create: { eventType: t.eventType, label: t.label, templateWa: t.templateWa },
    });
  }

  const templates = await prisma.notificationTemplate.findMany({ orderBy: { eventType: 'asc' } });
  return NextResponse.json(templates);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { eventType, channelWa, channelEmail, channelInApp, templateWa, templateEmail, isActive } = await request.json();
    if (!eventType) return NextResponse.json({ error: 'eventType wajib' }, { status: 400 });
    const updated = await prisma.notificationTemplate.update({ where: { eventType }, data: { channelWa, channelEmail, channelInApp, templateWa, templateEmail, isActive } });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
