import { randomUUID, createHash } from 'node:crypto'
import type { ITenantRepository } from '../../../domain/auth/repositories/ITenantRepository.js'
import type { IUsuarioRepository } from '../../../domain/auth/repositories/IUsuarioRepository.js'
import type { IRefreshTokenRepository } from '../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { IPasswordHasher } from '../../../domain/auth/services/IPasswordHasher.js'
import type { ITokenService, TokenPair } from '../../../domain/auth/services/ITokenService.js'
import { UnauthorizedError, ValidationError } from '../../../shared/errors/AppError.js'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const AUTH_ERROR_MESSAGE = 'Credenciales inválidas'

export interface LoginUserInput {
  username: string
  password: string
  tenantSlug?: string
}

export interface LoginUserOutput {
  accessToken: string
  refreshToken: string
}

export class LoginUserCommand {
  constructor(
    private readonly tenantRepo: ITenantRepository,
    private readonly userRepo: IUsuarioRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(input: LoginUserInput): Promise<LoginUserOutput> {
    const isSelfHosted = process.env['DEPLOYMENT_MODE'] === 'self-hosted'

    let tenant
    if (isSelfHosted && !input.tenantSlug) {
      tenant = await this.tenantRepo.findFirst()
    } else if (input.tenantSlug) {
      tenant = await this.tenantRepo.findBySlug(input.tenantSlug)
    } else {
      throw new ValidationError('tenantSlug is required in SaaS mode')
    }

    if (tenant === null || !tenant.isActive) {
      throw new UnauthorizedError(AUTH_ERROR_MESSAGE)
    }

    const user = await this.userRepo.findByUsername(tenant.id, input.username)
    if (user === null || !user.isActive) {
      throw new UnauthorizedError(AUTH_ERROR_MESSAGE)
    }

    const passwordValid = await this.passwordHasher.compare(input.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedError(AUTH_ERROR_MESSAGE)
    }

    const tokenPair: TokenPair = await this.tokenService.signTokenPair({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
    })

    const tokenHash = hashToken(tokenPair.refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

    await this.refreshTokenRepo.save({
      id: randomUUID(),
      tokenHash,
      usuarioId: user.id,
      tenantId: tenant.id,
      role: user.role,
      expiresAt,
    })

    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
