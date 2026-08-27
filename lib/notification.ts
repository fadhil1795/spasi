import { prisma } from '@/lib/prisma';
import { sendEmailNotification } from '@/lib/mailer';
import { sendWaNotification } from '@/lib/whatsapp';

interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER';
  email?: string | null;
  phone?: string | null;
  sendEmail?: boolean;
  sendWhatsApp?: boolean;
}

export async function sendSystemNotification({
  userId,
  title,
  message,
  type,
  email,
  phone,
  sendEmail = true,
  sendWhatsApp = true,
}: NotificationPayload) {
  try {
    // 1. Save In-App Notification
    const inApp = await prisma.inAppNotification.create({
      data: {
        userId,
        title,
        message,
        type,
        isRead: false,
      },
    });

    // 2. Send Email
    if (sendEmail && email) {
      // Run asynchronously without blocking
      sendEmailNotification({
        to: email,
        subject: `🔔 [SPASI] ${title}`,
        title: title,
        body: `<p>${message.replace(/\n/g, '<br>')}</p>`,
        type: type,
      }).catch((e) => console.error('Failed to send notification email:', e));
    }

    // 3. Send WhatsApp
    if (sendWhatsApp && phone) {
      const waMsg = `🔔 *[NOTIFIKASI SPASI]*\n\n*${title}*\n\n${message}\n\n_© SPASI - Sistem Manajemen Aset & Sewa_`;
      sendWaNotification(phone, waMsg).catch((e) =>
        console.error('Failed to send notification WhatsApp:', e)
      );
    }

    return inApp;
  } catch (error) {
    console.error('Error sending system notification:', error);
    return null;
  }
}
