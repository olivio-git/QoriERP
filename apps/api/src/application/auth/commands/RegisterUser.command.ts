import { randomUUID, createHash } from 'node:crypto'
import type { Tenant } from '../../../domain/auth/entities/Tenant.entity.js'
import type { ITenantRepository } from '../../../domain/auth/repositories/ITenantRepository.js'
import type { IUsuarioRepository } from '../../../domain/auth/repositories/IUsuarioRepository.js'
import type { IRefreshTokenRepository } from '../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { IPasswordHasher } from '../../../domain/auth/services/IPasswordHasher.js'
import type { ITokenService, TokenPair } from '../../../domain/auth/services/ITokenService.js'
import { ForbiddenError, ConflictError } from '../../../shared/errors/AppError.js'

export interface RegisterUserInput {
  tenantName: string
  slug: string
  adminUsername: string
  adminPassword: string
}

export interface RegisterUserOutput {
  tenant: Tenant
  accessToken: string
  refreshToken: string
}

export class RegisterUserCommand {
  constructor(
    private readonly tenantRepo: ITenantRepository,
    private readonly userRepo: IUsuarioRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    if (process.env['ALLOW_REGISTRATION'] !== 'true') {
      throw new ForbiddenError('Registration is disabled')
    }

    const existing = await this.tenantRepo.findBySlug(input.slug)
    if (existing !== null) {
      throw new ConflictError(`Tenant with slug '${input.slug}' already exists`)
    }

    const passwordHash = await this.passwordHasher.hash(input.adminPassword)

    const tenantId = randomUUID()
    const adminId = randomUUID()
    const configId = randomUUID()

    const tenant = await this.tenantRepo.createWithAdminAndConfig({
      tenant: {
        id: tenantId,
        name: input.tenantName,
        slug: input.slug,
      },
      admin: {
        id: adminId,
        username: input.adminUsername,
        passwordHash,
      },
      config: {
        id: configId,
      },
    })

    const tokenPair: TokenPair = await this.tokenService.signTokenPair({
      sub: adminId,
      tenantId: tenant.id,
      role: 'admin',
    })

    const refreshTtlDays = parseInt(process.env['JWT_REFRESH_TTL_DAYS'] ?? '7', 10)
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000)
    await this.refreshTokenRepo.save({
      id: randomUUID(),
      tokenHash: createHash('sha256').update(tokenPair.refreshToken).digest('hex'),
      usuarioId: adminId,
      tenantId: tenant.id,
      role: 'admin',
      expiresAt,
    })

    return {
      tenant,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
