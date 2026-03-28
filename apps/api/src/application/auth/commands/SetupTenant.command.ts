import { randomUUID, createHash } from 'node:crypto'
import type { ITenantRepository } from '../../../domain/auth/repositories/ITenantRepository.js'
import type { IUsuarioRepository } from '../../../domain/auth/repositories/IUsuarioRepository.js'
import type { IRefreshTokenRepository } from '../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { IPasswordHasher } from '../../../domain/auth/services/IPasswordHasher.js'
import type { ITokenService, TokenPair } from '../../../domain/auth/services/ITokenService.js'
import { ConflictError, ForbiddenError } from '../../../shared/errors/AppError.js'

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export interface SetupTenantInput {
  businessName: string
  adminUsername: string
  adminPassword: string
}

export interface SetupTenantOutput {
  accessToken: string
  refreshToken: string
}

export class SetupTenantCommand {
  constructor(
    private readonly tenantRepo: ITenantRepository,
    private readonly userRepo: IUsuarioRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
  ) {}

  async execute(input: SetupTenantInput): Promise<SetupTenantOutput> {
    if (process.env['DEPLOYMENT_MODE'] !== 'self-hosted') {
      throw new ForbiddenError('Setup endpoint only available in self-hosted mode')
    }

    const tenantCount = await this.tenantRepo.count()
    if (tenantCount >= 1) {
      throw new ConflictError('Setup already completed — system is already configured')
    }

    const slug = slugify(input.businessName)
    const passwordHash = await this.passwordHasher.hash(input.adminPassword)

    const tenantId = randomUUID()
    const adminId = randomUUID()
    const configId = randomUUID()

    const tenant = await this.tenantRepo.createWithAdminAndConfig({
      tenant: {
        id: tenantId,
        name: input.businessName,
        slug,
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
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }
  }
}
