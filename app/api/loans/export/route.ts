import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return '""';
  const stringVal = String(field);
  if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') || stringVal.includes('\r')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return `"${stringVal}"`;
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const myLoans = searchParams.get('my') === 'true';

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;

    const whereClause: any = {};
    if (status && status !== 'ALL') whereClause.status = status;
    if (myLoans || userRole === 'BORROWER') {
      whereClause.userId = userId;
    }

    const loans = await prisma.loan.findMany({
      where: whereClause,
      include: {
        asset: { select: { name: true, code: true } },
        user: { select: { name: true, email: true, phone: true, identityNo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Nomor Tiket',
      'Nama Peminjam',
      'NIM/NIP/Identitas',
      'Email',
      'Telepon',
      'Kode Aset',
      'Nama Aset',
      'Jumlah Unit',
      'Tanggal Pinjam',
      'Tanggal Kembali',
      'Waktu Pengambilan',
      'Waktu Pengembalian',
      'Status Peminjaman',
      'Kondisi Kembali',
      'Denda (Rp)',
      'Status Denda',
      'Keperluan',
    ];

    const rows = loans.map((l) => {
      const fmtDate = (d: Date | null) => (d ? new Date(d).toISOString().split('T')[0] : '-');
      const fmtDateTime = (d: Date | null) =>
        d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '-';

      return [
        l.ticketNumber,
        l.user?.name || '-',
        l.user?.identityNo || '-',
        l.user?.email || '-',
        l.user?.phone || '-',
        l.asset?.code || '-',
        l.asset?.name || '-',
        l.quantity || 1,
        fmtDate(l.startDate),
        fmtDate(l.endDate),
        fmtDateTime(l.checkInTime),
        fmtDateTime(l.checkOutTime),
        l.status,
        l.condition || '-',
        l.penaltyFee || 0,
        l.penaltyStatus || '-',
        l.purpose || '-',
      ]
        .map(escapeCsvField)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvField).join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rekap-peminjaman-spasi-${timestamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting loans:', error);
    return NextResponse.json({ error: 'Gagal mengekspor data peminjaman' }, { status: 500 });
  }
}

