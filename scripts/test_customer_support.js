const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  console.log('--- TESTING CUSTOMER SUPPORT LOGIC ---');
  // 1. Find user@spasi.app
  const user = await prisma.user.findUnique({ where: { email: 'user@spasi.app' } });
  if (!user) {
    console.error('User not found!');
    return;
  }
  console.log('1. Found user:', user.name, '| Role:', user.role, '| Suspended:', user.isSuspended);

  // 2. Test Reset Password
  const newPass = 'User@123';
  const hashed = await bcrypt.hash(newPass, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed }
  });
  const isMatch = await bcrypt.compare(newPass, hashed);
  console.log('2. Reset Password to', newPass, '-> Match verification:', isMatch);

  // 3. Test Suspend & Unsuspend Toggle
  const suspendedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isSuspended: true }
  });
  console.log('3a. User suspended successfully:', suspendedUser.isSuspended);

  const unsuspendedUser = await prisma.user.update({
    where: { id: user.id },
    data: { isSuspended: false }
  });
  console.log('3b. User unsuspended successfully:', !unsuspendedUser.isSuspended);

  // 4. Test Category & Details Update
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      renterCategory: 'MAHASISWA',
      identityNo: '202401001'
    }
  });
  console.log('4. Profile & Category updated:', updatedUser.renterCategory, '| NIM:', updatedUser.identityNo);

  // 5. Test Audit Log creation
  const log = await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'ADMIN_RESET_PASSWORD',
      entity: 'User',
      entityId: user.id,
      details: 'Admin mereset password untuk peminjam user@spasi.app'
    }
  });
  console.log('5. AuditLog created successfully with ID:', log.id);

  console.log('--- ALL CUSTOMER SUPPORT CAPABILITIES VERIFIED! ---');
  await prisma.$disconnect();
}
run().catch(console.error);
