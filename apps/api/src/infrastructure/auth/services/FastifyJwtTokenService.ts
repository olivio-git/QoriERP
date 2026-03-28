import '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import type { ITokenService, TokenPair } from '@domain/auth/services/ITokenService.js'
import type { JwtPayload } from '@shared/types/jwt.js'

export class FastifyJwtTokenService implements ITokenService {
  constructor(private readonly app: FastifyInstance) {}

  async signTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const accessTtl = process.env.JWT_ACCESS_TTL ?? '15m'
    const refreshTtl = process.env.JWT_REFRESH_TTL ?? '7d'

    const accessToken = await this.app.jwt.sign(payload, { expiresIn: accessTtl })
    const refreshToken = await this.app.jwt.sign(
      { sub: payload.sub, tenantId: payload.tenantId },
      { expiresIn: refreshTtl },
    )

    return { accessToken, refreshToken }
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string }> {
    const decoded = await this.app.jwt.verify<{ sub: string }>(token)
    return { userId: decoded.sub }
  }
}
