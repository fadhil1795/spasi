import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET /api/user/profile - Get current user profile
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        phone: true,
        identityNo: true,
        avatarUrl: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        residence: true,
        department: { select: { id: true, name: true, code: true } },
        violations: { orderBy: { createdAt: 'desc' } },
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    // Determine if the user has a password set (useful for Google OAuth users)
    const hasPassword = Boolean(user.password && user.password.length > 0);
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ ...userWithoutPassword, hasPassword });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/user/profile - Update current user profile & change password
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, phone, identityNo, avatarUrl, address, gender, birthDate, birthPlace, residence,
      oldPassword, newPassword
    } = body;

    const dataToUpdate: any = {};

    if (name) dataToUpdate.name = name;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (identityNo !== undefined) dataToUpdate.identityNo = identityNo;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;
    if (address !== undefined) dataToUpdate.address = address;
    if (gender !== undefined) dataToUpdate.gender = gender;
    if (birthDate !== undefined) dataToUpdate.birthDate = birthDate ? new Date(birthDate) : null;
    if (birthPlace !== undefined) dataToUpdate.birthPlace = birthPlace;
    if (residence !== undefined) dataToUpdate.residence = residence;

    // Password change logic
    if (newPassword) {
      // If user currently has no password (e.g. registered via Google), allow setting it without oldPassword
      const userHasPassword = Boolean(currentUser.password && currentUser.password.length > 0);
      
      if (userHasPassword) {
        if (!oldPassword) {
          return NextResponse.json({ error: 'Password lama wajib diisi' }, { status: 400 });
        }
        const isPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
        if (!isPasswordValid) {
          return NextResponse.json({ error: 'Password lama tidak sesuai' }, { status: 400 });
        }
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }
      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        identityNo: true,
        avatarUrl: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        residence: true,
        createdAt: true,
      },
    });

    // Sinkronisasi tabel Renter agar histori riwayat booking lama tidak hilang
    if ((phone !== undefined && phone !== currentUser.phone) || (dataToUpdate.email && dataToUpdate.email !== currentUser.email)) {
      // Cari penyewa (renter) lama berdasarkan email atau phone lama
      const oldPhone = currentUser.phone;
      const oldEmail = currentUser.email;
      
      const renter = await prisma.renter.findFirst({
        where: {
          OR: [
            oldEmail ? { email: oldEmail } : {},
            oldPhone ? { phone: oldPhone } : {},
          ].filter(cond => Object.keys(cond).length > 0),
        },
      });

      if (renter) {
        // Update data penyewa ke nomor/email terbaru
        await prisma.renter.update({
          where: { id: renter.id },
          data: {
            phone: updatedUser.phone || renter.phone,
            email: updatedUser.email || renter.email,
            name: updatedUser.name || renter.name,
            idCardNo: updatedUser.identityNo || renter.idCardNo,
          },
        });
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
