import { randomUUID, createHash } from 'node:crypto'
import type { IRefreshTokenRepository } from '../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { ITokenService, TokenPair } from '../../../domain/auth/services/ITokenService.js'
import type { JwtPayload } from '../../../shared/types/jwt.js'
import { UnauthorizedError } from '../../../shared/errors/AppError.js'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface RefreshTokenInput {
  refreshToken: string
}

export interface RefreshTokenOutput {
  accessToken: string
  refreshToken: string
}

export class RefreshTokenCommand {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    const incomingHash = hashToken(input.refreshToken)

    const stored = await this.refreshTokenRepo.findByHashedToken(incomingHash)
    if (stored === null) {
      throw new UnauthorizedError()
    }

    if (stored.isUsed || stored.expiresAt <= new Date()) {
      throw new UnauthorizedError()
    }

    // Revoke old token before issuing new pair (rotation)
    await this.refreshTokenRepo.revoke(incomingHash)

    const payload: JwtPayload = {
      sub: stored.usuarioId,
      tenantId: stored.tenantId,
      role: stored.role as JwtPayload['role'],
    }

    const tokenPair: TokenPair = await this.tokenService.signTokenPair(payload)

    const newTokenHash = hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    await this.refreshTokenRepo.save({
      id: randomUUID(),
      tokenHash: newTokenHash,
      usuarioId: stored.usuarioId,
      tenantId: stored.tenantId,
      role: stored.role,
      expiresAt,
    })

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
