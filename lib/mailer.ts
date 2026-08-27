import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper: ambil template instansi dari DB
async function getTemplate() {
  try {
    const tpl = await prisma.documentTemplate.findUnique({ where: { id: 'default' } });
    return tpl;
  } catch {
    return null;
  }
}

export const sendEmailVoucher = async (data: {
  to?: string | null;
  bookingNumber: string;
  renterName: string;
  assetNames: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
}) => {
  if (!data.to) return { success: false, error: 'No email address' };

  try {
    const tpl = await getTemplate();
    const institutionName = tpl?.institutionName || 'SPASI — Sistem Pencatatan Aset & Sewa Instansi';
    const emailFooter = tpl?.emailSignature || `© ${new Date().getFullYear()} ${institutionName}. Semua hak cipta dilindungi.`;
    const logoUrl = tpl?.institutionLogoUrl;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${institutionName}" style="height:48px;object-fit:contain;margin-bottom:12px;" /><br>`
      : '';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        
        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #1d4ed8 100%); padding: 32px 28px; text-align: center;">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 22px; color: #fff; font-weight: 900; letter-spacing: 0.5px;">✅ Pembayaran Terverifikasi</h1>
          <p style="margin: 8px 0 0; font-size: 13px; color: rgba(255,255,255,0.85);">${institutionName}</p>
        </div>

        <!-- BODY -->
        <div style="padding: 32px 28px; background: #fff;">
          <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 6px;">Halo, ${data.renterName} 👋</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
            Pembayaran pesanan Anda telah berhasil <strong style="color: #10b981;">DIVERIFIKASI (LUNAS)</strong>. 
            Berikut adalah rincian e-Voucher Anda sebagai bukti resmi:
          </p>

          <!-- VOUCHER CARD -->
          <div style="background: #f8fafc; border: 1.5px dashed #94a3b8; padding: 22px; border-radius: 10px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; width: 45%;">Nomor Pesanan</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 900; text-align: right; font-family: monospace; font-size: 14px;">${data.bookingNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; border-top: 1px solid #e2e8f0;">Fasilitas / Item</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right; font-size: 13px; border-top: 1px solid #e2e8f0;">${data.assetNames}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; border-top: 1px solid #e2e8f0;">Periode Sewa</td>
                <td style="padding: 8px 0; color: #0f172a; text-align: right; font-size: 13px; border-top: 1px solid #e2e8f0;">${data.startDate} s/d ${data.endDate}</td>
              </tr>
              <tr>
                <td style="padding: 14px 0 0; color: #64748b; font-weight: 700; font-size: 13px; border-top: 2px solid #e2e8f0;">Total Pembayaran</td>
                <td style="padding: 14px 0 0; color: #10b981; font-weight: 900; text-align: right; font-size: 20px; border-top: 2px solid #e2e8f0;">
                  Rp ${data.totalAmount.toLocaleString('id-ID')}
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6; background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin: 0;">
            📌 Harap tunjukkan e-Voucher ini kepada petugas kami di lokasi sebagai bukti penyewaan yang sah. Simpan email ini sebagai referensi.
          </p>
        </div>

        <!-- FOOTER -->
        <div style="background: #f1f5f9; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11.5px; color: #64748b; margin: 0; line-height: 1.7;">${emailFooter}</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${institutionName}" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: `✅ [LUNAS] E-Voucher ${data.bookingNumber} — ${institutionName}`,
      html: htmlContent,
    });

    console.log('Email sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

export const sendEmailNotification = async (data: {
  to: string;
  subject: string;
  title: string;
  body: string;
  type?: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER';
}) => {
  try {
    const tpl = await getTemplate();
    const institutionName = tpl?.institutionName || 'SPASI — Sistem Pencatatan Aset & Sewa Instansi';
    const emailFooter = tpl?.emailSignature || `© ${new Date().getFullYear()} ${institutionName}. Semua hak cipta dilindungi.`;
    const logoUrl = tpl?.institutionLogoUrl;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${institutionName}" style="height:48px;object-fit:contain;margin-bottom:12px;" /><br>`
      : '';

    const colors = {
      INFO: '#3b82f6',
      WARNING: '#f59e0b',
      SUCCESS: '#10b981',
      DANGER: '#ef4444'
    };
    const headerColor = colors[data.type || 'INFO'];

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <!-- HEADER -->
        <div style="background: ${headerColor}; padding: 24px 28px; text-align: center; color: #ffffff;">
          ${logoHtml}
          <h1 style="margin: 0; font-size: 20px; color: #fff; font-weight: 800;">${data.title}</h1>
          <p style="margin: 6px 0 0; font-size: 12px; color: rgba(255,255,255,0.9);">${institutionName}</p>
        </div>

        <!-- BODY -->
        <div style="padding: 28px; background: #fff; color: #334155; font-size: 14px; line-height: 1.6;">
          ${data.body}
        </div>

        <!-- FOOTER -->
        <div style="background: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 11px; color: #64748b; margin: 0; line-height: 1.7;">${emailFooter}</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: `"${institutionName}" <${process.env.SMTP_USER}>`,
      to: data.to,
      subject: data.subject,
      html: htmlContent,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error };
  }
};
