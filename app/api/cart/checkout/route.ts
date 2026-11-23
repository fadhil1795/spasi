import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateInvoiceNumber() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${random}`;
}

function generateBookingNumber(prefix: string) {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${yyyy}${mm}${dd}-${random}`;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Silakan login untuk melakukan checkout' }, { status: 401 });
    }
    const body = await req.json();
    const { cartItems, renterData, payMethod, totalAmount, depositAmount } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Keranjang kosong' }, { status: 400 });
    }

    // Upsert Renter
    let renter;
    if (session?.user?.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (existingUser) {
        renter = await prisma.renter.findFirst({ where: { email: existingUser.email } });
      }
    }

    if (!renter) {
      renter = await prisma.renter.create({
        data: {
          name: renterData.name,
          phone: renterData.phone,
          email: renterData.email || session?.user?.email || null,
          idCardNo: renterData.idCardNo || null,
        }
      });
    }

    const invoiceNumber = generateInvoiceNumber();

    const masterInvoice = await prisma.masterInvoice.create({
      data: {
        invoiceNumber,
        renterId: renter.id,
        totalAmount,
        depositAmount,
        payMethod,
        payStatus: 'UNPAID',
      }
    });

    for (const item of cartItems) {
      if (item.itemType === 'ASSET') {
        const startDate = new Date(`${item.bookingDate}T${item.startTime}`);
        const endDate = new Date(`${item.bookingDate}T${item.endTime}`);
        const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        await prisma.rental.create({
          data: {
            bookingNumber: generateBookingNumber('RNT'),
            assetId: item.assetId!,
            renterId: renter.id,
            quantity: 1,
            startDate,
            endDate,
            totalDays,
            ratePerDay: item.priceRate,
            totalAmount: item.roomSubtotal,
            depositAmount: item.depositAmount,
            payStatus: 'UNPAID',
            payMethod,
            rentalType: 'DAILY',
            masterInvoiceId: masterInvoice.id,
          }
        });
      } else {
        // Assume ROOM
        const startTime = new Date(`${item.bookingDate}T${item.startTime}`);
        const endTime = new Date(`${item.bookingDate}T${item.endTime}`);
        
        const booking = await prisma.roomBooking.create({
          data: {
            bookingNumber: generateBookingNumber('BK'),
            locationId: item.roomId,
            renterId: renter.id,
            startTime,
            endTime,
            durationHours: item.durationHours,
            roomRate: item.priceRate,
            roomSubtotal: item.roomSubtotal,
            addonSubtotal: item.addOns?.reduce((sum: number, a: any) => sum + (a.rate * a.quantity), 0) || 0,
            totalAmount: item.roomSubtotal + (item.addOns?.reduce((sum: number, a: any) => sum + (a.rate * a.quantity), 0) || 0),
            depositAmount: item.depositAmount,
            payStatus: 'UNPAID',
            payMethod,
            paymentScheme: 'FULL',
            rentalType: item.rentalType || 'HOURLY',
            masterInvoiceId: masterInvoice.id,
          }
        });

        // Add add-ons for Room if any
        if (item.addOns && item.addOns.length > 0) {
          for (const addon of item.addOns) {
            const assetObj = await prisma.asset.findUnique({ where: { id: addon.assetId } });
            const rate = parseFloat(addon.ratePerSession || addon.rate || addon.priceRate || 0);
            const qty = parseInt(addon.quantity || 1);
            await prisma.bookingAddonAsset.create({
              data: {
                bookingId: booking.id,
                assetId: addon.assetId,
                assetName: assetObj?.name || addon.assetName || 'Addon Aset',
                quantity: qty,
                ratePerSession: rate,
                subtotal: rate * qty,
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, masterInvoiceId: masterInvoice.id });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
