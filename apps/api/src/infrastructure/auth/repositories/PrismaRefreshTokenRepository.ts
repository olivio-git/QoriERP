import type {
  IRefreshTokenRepository,
  RefreshTokenData,
  StoredRefreshToken,
} from '@domain/auth/repositories/IRefreshTokenRepository.js'
import { prisma } from '@infrastructure/database/prisma/client.js'

type DbRefreshToken = {
  id: string
  tokenHash: string
  usuarioId: string
  tenantId: string
  role: string
  expiresAt: Date
  isUsed: boolean
}

function mapToStored(row: DbRefreshToken): StoredRefreshToken {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    usuarioId: row.usuarioId,
    tenantId: row.tenantId,
    role: row.role,
    expiresAt: row.expiresAt,
    isUsed: row.isUsed,
  }
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  async save(data: RefreshTokenData): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        id: data.id,
        tokenHash: data.tokenHash,
        usuarioId: data.usuarioId,
        tenantId: data.tenantId,
        role: data.role,
        expiresAt: data.expiresAt,
      },
    })
  }

  async findByHashedToken(tokenHash: string): Promise<StoredRefreshToken | null> {
    const row = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    })

    if (!row) return null

    return mapToStored(row)
  }

  async revoke(tokenHash: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { tokenHash },
      data: { isUsed: true },
    })
  }
}
