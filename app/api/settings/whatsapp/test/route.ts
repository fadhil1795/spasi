import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { sendWaMessage } from '@/lib/whatsapp';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { phone, provider, apiUrl, apiKey, instanceName, payloadTemplate, headers } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Nomor telepon tujuan wajib diisi' }, { status: 400 });
    }

    const testMsg = `🔔 *[TES KONEKSI SPASI]*\n\nHalo!\nIni adalah pesan uji coba pengiriman dari Sistem Manajemen SPASI.\nKoneksi WhatsApp Gateway Anda dengan provider *${provider}* berhasil terhubung!\n\n_Tanggal: ${new Date().toLocaleString('id-ID')}_`;

    const res = await sendWaMessage(phone, testMsg, {
      provider,
      apiUrl,
      apiKey,
      instanceName,
      payloadTemplate,
      headers,
    });

    if (res.success) {
      return NextResponse.json({ success: true, result: res.result });
    } else {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error testing WhatsApp connection:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
