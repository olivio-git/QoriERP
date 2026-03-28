import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@infrastructure/database/prisma/client.js'

/**
 * Extrae el tenant_id del JWT y lo inyecta en la sesión de PostgreSQL
 * para que RLS filtre automáticamente en todas las queries.
 */
export async function tenantMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const tenantId = request.user.tenantId
  await prisma.$executeRawUnsafe(
    `SELECT set_config('app.tenant_id', $1, true)`,
    tenantId
  )
}
