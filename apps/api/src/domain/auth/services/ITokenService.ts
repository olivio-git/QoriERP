import type { JwtPayload } from '@shared/types/jwt.js'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface ITokenService {
  signTokenPair(payload: JwtPayload): Promise<TokenPair>
  verifyRefreshToken(token: string): Promise<{ userId: string }>
}
