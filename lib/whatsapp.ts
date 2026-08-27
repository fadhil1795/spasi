import { prisma } from '@/lib/prisma';

export const sendWaMessage = async (
  to: string,
  message: string,
  customConfig?: {
    provider?: string;
    apiKey?: string;
    apiUrl?: string;
    instanceName?: string;
    payloadTemplate?: string;
    headers?: string;
  }
) => {
  // Clean phone number: remove non-digits, replace leading '0' with '62'
  let phone = to.replace(/\D/g, '');
  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  }

  // 1. Resolve configuration (Dynamic precedence: customConfig -> database -> env)
  let provider = '';
  let apiKey = '';
  let apiUrl = '';
  let instanceName = '';
  let payloadTemplate = '';
  let headersStr = '';

  if (customConfig) {
    provider = (customConfig.provider || 'EVOLUTION').toUpperCase();
    apiKey = customConfig.apiKey || '';
    apiUrl = customConfig.apiUrl || '';
    instanceName = customConfig.instanceName || '';
    payloadTemplate = customConfig.payloadTemplate || '';
    headersStr = customConfig.headers || '';
  } else {
    // Attempt database load
    try {
      const dbConfig = await prisma.whatsAppSetting.findUnique({
        where: { id: 'default' },
      });
      if (dbConfig) {
        provider = (dbConfig.provider || 'EVOLUTION').toUpperCase();
        apiKey = dbConfig.apiKey || '';
        apiUrl = dbConfig.apiUrl || '';
        instanceName = dbConfig.instanceName || '';
        payloadTemplate = dbConfig.payloadTemplate || '';
        headersStr = dbConfig.headers || '';
      }
    } catch (e) {
      console.warn('Gagal memuat konfigurasi WhatsApp dari database, fallback ke env:', e);
    }

    // Fallback to env variables if still empty/missing
    if (!provider) {
      provider = (process.env.WHATSAPP_GATEWAY_PROVIDER || 'EVOLUTION').toUpperCase();
    }
    if (!apiKey) {
      apiKey = process.env.WHATSAPP_API_KEY || process.env.EVOLUTION_API_KEY || '';
    }
    if (!apiUrl) {
      apiUrl = process.env.WHATSAPP_API_URL || process.env.EVOLUTION_API_URL || '';
    }
    if (!instanceName) {
      instanceName = process.env.WHATSAPP_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE_NAME || '';
    }
    if (!payloadTemplate) {
      payloadTemplate = process.env.WHATSAPP_GENERIC_PAYLOAD_TEMPLATE || '';
    }
    if (!headersStr) {
      headersStr = process.env.WHATSAPP_GENERIC_HEADERS || '';
    }
  }

  if (provider === 'FONNTE') {
    if (!apiKey) {
      console.warn('WhatsApp Fonnte API Key belum dikonfigurasi (WHATSAPP_API_KEY atau EVOLUTION_API_KEY)');
      return { success: false, error: 'Fonnte API key missing' };
    }
    try {
      const url = apiUrl || 'https://api.fonnte.com/send';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey, // Fonnte uses Authorization header directly
        },
        body: JSON.stringify({
          target: phone,
          message: message,
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log('WhatsApp message sent via Fonnte to:', phone);
        return { success: true, result };
      } else {
        console.error('Failed to send WhatsApp via Fonnte:', result);
        return { success: false, error: result };
      }
    } catch (error) {
      console.error('Error sending WhatsApp via Fonnte:', error);
      return { success: false, error };
    }
  }

  if (provider === 'GENERIC') {
    if (!apiUrl) {
      console.warn('WhatsApp Generic API URL belum dikonfigurasi (WHATSAPP_API_URL atau EVOLUTION_API_URL)');
      return { success: false, error: 'Generic API URL missing' };
    }
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
      }

      // Check for custom headers template
      if (headersStr) {
        try {
          const customHeaders = JSON.parse(headersStr);
          Object.assign(headers, customHeaders);
        } catch (e) {
          console.error('Gagal memproses WHATSAPP_GENERIC_HEADERS:', e);
        }
      }

      // Check for custom payload template
      let body: any;

      if (payloadTemplate) {
        // Safe string escape for message injection inside JSON
        const escapedMessage = JSON.stringify(message).slice(1, -1);
        const populatedStr = payloadTemplate
          .replace(/\{\{phone\}\}/g, phone)
          .replace(/\{\{message\}\}/g, escapedMessage);
        try {
          body = JSON.parse(populatedStr);
        } catch (e) {
          console.error('Gagal memproses WHATSAPP_GENERIC_PAYLOAD_TEMPLATE, fallback ke default format:', e);
          body = { to: phone, message: message };
        }
      } else {
        body = { to: phone, message: message };
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log('WhatsApp message sent via Generic HTTP to:', phone);
        return { success: true, result };
      } else {
        console.error('Failed to send WhatsApp via Generic HTTP:', result);
        return { success: false, error: result };
      }
    } catch (error) {
      console.error('Error sending WhatsApp via Generic HTTP:', error);
      return { success: false, error };
    }
  }

  // Default to EVOLUTION API
  if (!apiUrl || !apiKey || !instanceName) {
    console.warn('WhatsApp API Evolution belum dikonfigurasi lengkap');
    return { success: false, error: 'Evolution API config missing' };
  }

  try {
    const res = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
        options: {
          delay: 1200,
          presence: 'composing',
        },
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('WhatsApp message sent via Evolution to:', phone);
      return { success: true, result };
    } else {
      console.error('Failed to send WhatsApp via Evolution:', result);
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('Error sending WhatsApp via Evolution:', error);
    return { success: false, error };
  }
};

export const sendWaVoucher = async (data: {
  to: string;
  bookingNumber: string;
  renterName: string;
  assetNames: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
}) => {
  const message = `✅ *BUKTI PEMESANAN (E-VOUCHER) SPASI*\n\nHalo, *${data.renterName}*\nPembayaran pesanan Anda telah berhasil *DIVERIFIKASI (LUNAS)*.\n\n*Rincian Pesanan:*\n🧾 No. Pesanan: ${data.bookingNumber}\n🏢 Fasilitas: ${data.assetNames}\n📅 Tanggal Sewa: ${data.startDate} s/d ${data.endDate}\n💰 Total: Rp ${data.totalAmount.toLocaleString('id-ID')}\n\nHarap tunjukkan pesan ini kepada petugas di lokasi sebagai bukti penyewaan yang sah.\n\n_© SPASI - Sistem Manajemen Sarpras_`;
  return sendWaMessage(data.to, message);
};

export const sendWaNotification = async (to: string, message: string) => {
  return sendWaMessage(to, message);
};
