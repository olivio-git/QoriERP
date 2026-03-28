import type { FastifyRequest, FastifyReply } from 'fastify'
import { UnauthorizedError } from '@shared/errors/AppError.js'
import type { JwtPayload } from '@shared/types/jwt.js'

export type { JwtPayload }

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify()
    request.user = request.user as JwtPayload
  } catch {
    throw new UnauthorizedError('Token inválido o expirado')
  }
}
