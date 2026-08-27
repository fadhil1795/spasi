import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Semua kolom wajib diisi' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'Email sudah terdaftar, silakan login.' },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'BORROWER', // Default role untuk registrasi publik
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      { message: 'Registrasi berhasil', user: userWithoutPassword },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan pada server saat registrasi' },
      { status: 500 }
    );
  }
}
