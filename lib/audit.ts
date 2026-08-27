import { prisma } from '@/lib/prisma';

export async function createAuditLog(data: {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        details: data.details || null,
        oldData: data.oldData ? JSON.stringify(data.oldData) : null,
        newData: data.newData ? JSON.stringify(data.newData) : null,
        ipAddress: data.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}
