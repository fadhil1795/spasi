import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// GET /api/admin/users - Mendapatkan daftar seluruh pengguna dengan filter & pagination
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status'); // 'active' | 'suspended'
    const category = searchParams.get('category'); // 'MAHASISWA' | 'INTERNAL' | 'EXTERNAL'

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { identityNo: { contains: search } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (status === 'active') {
      where.isSuspended = false;
    } else if (status === 'suspended') {
      where.isSuspended = true;
    }

    if (category && category !== 'ALL') {
      where.renterCategory = category;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        renterCategory: true,
        phone: true,
        identityNo: true,
        departmentId: true,
        address: true,
        gender: true,
        birthDate: true,
        birthPlace: true,
        residence: true,
        avatarUrl: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: { id: true, name: true, code: true }
        },
        _count: {
          select: {
            loans: true,
            violations: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/admin/users - Mendaftarkan pengguna baru secara langsung oleh admin
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentRole = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(currentRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, renterCategory, phone, identityNo, departmentId, address, gender } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nama, Email, dan Password wajib diisi' }, { status: 400 });
    }

    // Cek duplikasi email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar pada akun lain' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'BORROWER',
        renterCategory: renterCategory || 'MAHASISWA',
        phone: phone || null,
        identityNo: identityNo || null,
        departmentId: departmentId || null,
        address: address || null,
        gender: gender || null,
        isSuspended: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        renterCategory: true,
        phone: true,
        identityNo: true,
        departmentId: true,
        address: true,
        gender: true,
        isSuspended: true,
      }
    });

    await recordAuditLog({
      userId: (session.user as any).id,
      action: 'CREATE',
      entity: 'User',
      entityId: newUser.id,
      details: `Mendaftarkan akun user baru: ${newUser.name} (${newUser.email}) dengan role ${newUser.role}`,
      oldData: null,
      newData: newUser,
    });

    return NextResponse.json({ message: 'User berhasil dibuat', user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Gagal membuat pengguna baru' }, { status: 500 });
  }
}
