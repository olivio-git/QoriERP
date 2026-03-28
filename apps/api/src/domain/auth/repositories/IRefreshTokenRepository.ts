export interface RefreshTokenData {
  id: string
  tokenHash: string
  usuarioId: string
  tenantId: string
  role: string
  expiresAt: Date
}

export interface StoredRefreshToken {
  id: string
  tokenHash: string
  usuarioId: string
  tenantId: string
  role: string
  expiresAt: Date
  isUsed: boolean
}

export interface IRefreshTokenRepository {
  save(data: RefreshTokenData): Promise<void>
  findByHashedToken(tokenHash: string): Promise<StoredRefreshToken | null>
  revoke(tokenHash: string): Promise<void>
}
