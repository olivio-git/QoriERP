import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterUserCommand } from '../RegisterUser.command.js'
import type { ITenantRepository } from '../../../../domain/auth/repositories/ITenantRepository.js'
import type { IUsuarioRepository } from '../../../../domain/auth/repositories/IUsuarioRepository.js'
import type { IRefreshTokenRepository } from '../../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { IPasswordHasher } from '../../../../domain/auth/services/IPasswordHasher.js'
import type { ITokenService } from '../../../../domain/auth/services/ITokenService.js'
import { Tenant } from '../../../../domain/auth/entities/Tenant.entity.js'
import { ForbiddenError, ConflictError } from '../../../../shared/errors/AppError.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TENANT = Tenant.create({
  id: 'tenant-uuid',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  createdAt: new Date('2025-01-01'),
})

const VALID_INPUT = {
  tenantName: 'Acme Corp',
  slug: 'acme',
  adminUsername: 'admin',
  adminPassword: 'password123',
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeTenantRepo(overrides?: Partial<ITenantRepository>): ITenantRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    createWithAdminAndConfig: vi.fn().mockResolvedValue(MOCK_TENANT),
    ...overrides,
  }
}

function makeUserRepo(overrides?: Partial<IUsuarioRepository>): IUsuarioRepository {
  return {
    findByUsername: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makePasswordHasher(overrides?: Partial<IPasswordHasher>): IPasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function makeTokenService(overrides?: Partial<ITokenService>): ITokenService {
  return {
    signTokenPair: vi.fn().mockResolvedValue({
      accessToken: 'access-token-value',
      refreshToken: 'refresh-token-value',
    }),
    verifyRefreshToken: vi.fn(),
    ...overrides,
  }
}

function makeRefreshTokenRepo(overrides?: Partial<IRefreshTokenRepository>): IRefreshTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByHashedToken: vi.fn().mockResolvedValue(null),
    revoke: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RegisterUserCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('when ALLOW_REGISTRATION is not "true"', () => {
    it('throws ForbiddenError', async () => {
      delete process.env['ALLOW_REGISTRATION']

      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        makeRefreshTokenRepo(),
      )

      await expect(command.execute(VALID_INPUT)).rejects.toThrow(ForbiddenError)
    })

    it('throws ForbiddenError even when ALLOW_REGISTRATION is "false"', async () => {
      process.env['ALLOW_REGISTRATION'] = 'false'

      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        makeRefreshTokenRepo(),
      )

      await expect(command.execute(VALID_INPUT)).rejects.toThrow(ForbiddenError)
    })
  })

  describe('when ALLOW_REGISTRATION is "true"', () => {
    beforeEach(() => {
      process.env['ALLOW_REGISTRATION'] = 'true'
    })

    it('throws ConflictError when slug is already taken', async () => {
      const tenantRepo = makeTenantRepo({
        findBySlug: vi.fn().mockResolvedValue(MOCK_TENANT),
      })

      const command = new RegisterUserCommand(
        tenantRepo,
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        makeRefreshTokenRepo(),
      )

      await expect(command.execute(VALID_INPUT)).rejects.toThrow(ConflictError)
      expect(tenantRepo.findBySlug).toHaveBeenCalledWith(VALID_INPUT.slug)
    })

    it('calls createWithAdminAndConfig exactly once on the happy path', async () => {
      const tenantRepo = makeTenantRepo()
      const tokenService = makeTokenService()
      const refreshTokenRepo = makeRefreshTokenRepo()

      const command = new RegisterUserCommand(
        tenantRepo,
        makeUserRepo(),
        makePasswordHasher(),
        tokenService,
        refreshTokenRepo,
      )

      await command.execute(VALID_INPUT)

      expect(tenantRepo.createWithAdminAndConfig).toHaveBeenCalledTimes(1)
    })

    it('calls tokenService.signTokenPair once on the happy path', async () => {
      const tokenService = makeTokenService()

      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        tokenService,
        makeRefreshTokenRepo(),
      )

      await command.execute(VALID_INPUT)

      expect(tokenService.signTokenPair).toHaveBeenCalledTimes(1)
    })

    it('saves the refresh token on the happy path', async () => {
      const refreshTokenRepo = makeRefreshTokenRepo()

      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        refreshTokenRepo,
      )

      await command.execute(VALID_INPUT)

      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)
    })

    it('returns { tenant, accessToken, refreshToken } on the happy path', async () => {
      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        makeRefreshTokenRepo(),
      )

      const result = await command.execute(VALID_INPUT)

      expect(result.tenant).toBe(MOCK_TENANT)
      expect(result.accessToken).toBe('access-token-value')
      expect(result.refreshToken).toBe('refresh-token-value')
    })

    it('stores the SHA-256 hash of the refresh token — never the raw token', async () => {
      const refreshTokenRepo = makeRefreshTokenRepo()

      const command = new RegisterUserCommand(
        makeTenantRepo(),
        makeUserRepo(),
        makePasswordHasher(),
        makeTokenService(),
        refreshTokenRepo,
      )

      await command.execute(VALID_INPUT)

      const savedData = (refreshTokenRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        tokenHash: string
      }

      // The raw refresh token value must NOT be stored as-is
      expect(savedData.tokenHash).not.toBe('refresh-token-value')
      // Must be a 64-char hex string (SHA-256)
      expect(savedData.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
