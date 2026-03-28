import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginUserCommand } from '../LoginUser.command.js'
import type { ITenantRepository } from '../../../../domain/auth/repositories/ITenantRepository.js'
import type { IUsuarioRepository } from '../../../../domain/auth/repositories/IUsuarioRepository.js'
import type { IRefreshTokenRepository } from '../../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { IPasswordHasher } from '../../../../domain/auth/services/IPasswordHasher.js'
import type { ITokenService } from '../../../../domain/auth/services/ITokenService.js'
import { Tenant } from '../../../../domain/auth/entities/Tenant.entity.js'
import { Usuario } from '../../../../domain/auth/entities/Usuario.entity.js'
import { UnauthorizedError } from '../../../../shared/errors/AppError.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ACTIVE_TENANT = Tenant.create({
  id: 'tenant-uuid',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: true,
  createdAt: new Date('2025-01-01'),
})

const MOCK_INACTIVE_TENANT = Tenant.create({
  id: 'tenant-uuid',
  name: 'Acme Corp',
  slug: 'acme',
  isActive: false,
  createdAt: new Date('2025-01-01'),
})

const MOCK_ACTIVE_USER = Usuario.create({
  id: 'user-uuid',
  tenantId: 'tenant-uuid',
  username: 'admin',
  passwordHash: '$2b$12$hashedpassword',
  role: 'admin',
  isActive: true,
  createdAt: new Date('2025-01-01'),
})

const MOCK_INACTIVE_USER = Usuario.create({
  id: 'user-uuid',
  tenantId: 'tenant-uuid',
  username: 'admin',
  passwordHash: '$2b$12$hashedpassword',
  role: 'admin',
  isActive: false,
  createdAt: new Date('2025-01-01'),
})

const VALID_INPUT = {
  username: 'admin',
  password: 'password123',
  tenantSlug: 'acme',
}

const EXPECTED_ERROR_MESSAGE = 'Credenciales inválidas'

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeTenantRepo(overrides?: Partial<ITenantRepository>): ITenantRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(MOCK_ACTIVE_TENANT),
    findFirst: vi.fn().mockResolvedValue(MOCK_ACTIVE_TENANT),
    count: vi.fn().mockResolvedValue(1),
    createWithAdminAndConfig: vi.fn(),
    ...overrides,
  }
}

function makeUserRepo(overrides?: Partial<IUsuarioRepository>): IUsuarioRepository {
  return {
    findByUsername: vi.fn().mockResolvedValue(MOCK_ACTIVE_USER),
    create: vi.fn(),
    ...overrides,
  }
}

function makePasswordHasher(overrides?: Partial<IPasswordHasher>): IPasswordHasher {
  return {
    hash: vi.fn(),
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
    findByHashedToken: vi.fn(),
    revoke: vi.fn(),
    ...overrides,
  }
}

// ── Helper to build command with defaults ──────────────────────────────────────

function makeCommand(overrides?: {
  tenantRepo?: ITenantRepository
  userRepo?: IUsuarioRepository
  passwordHasher?: IPasswordHasher
  tokenService?: ITokenService
  refreshTokenRepo?: IRefreshTokenRepository
}): LoginUserCommand {
  return new LoginUserCommand(
    overrides?.tenantRepo ?? makeTenantRepo(),
    overrides?.userRepo ?? makeUserRepo(),
    overrides?.passwordHasher ?? makePasswordHasher(),
    overrides?.tokenService ?? makeTokenService(),
    overrides?.refreshTokenRepo ?? makeRefreshTokenRepo(),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginUserCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ── Security: all auth failures use the SAME message ──────────────────────

  describe('error message uniformity (prevents user enumeration)', () => {
    it('returns the same error message when tenant is not found', async () => {
      const command = makeCommand({
        tenantRepo: makeTenantRepo({ findBySlug: vi.fn().mockResolvedValue(null) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toMatchObject({
        message: EXPECTED_ERROR_MESSAGE,
      })
    })

    it('returns the same error message when tenant is inactive', async () => {
      const command = makeCommand({
        tenantRepo: makeTenantRepo({ findBySlug: vi.fn().mockResolvedValue(MOCK_INACTIVE_TENANT) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toMatchObject({
        message: EXPECTED_ERROR_MESSAGE,
      })
    })

    it('returns the same error message when user is not found', async () => {
      const command = makeCommand({
        userRepo: makeUserRepo({ findByUsername: vi.fn().mockResolvedValue(null) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toMatchObject({
        message: EXPECTED_ERROR_MESSAGE,
      })
    })

    it('returns the same error message when user is inactive', async () => {
      const command = makeCommand({
        userRepo: makeUserRepo({ findByUsername: vi.fn().mockResolvedValue(MOCK_INACTIVE_USER) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toMatchObject({
        message: EXPECTED_ERROR_MESSAGE,
      })
    })

    it('returns the same error message when password is wrong', async () => {
      const command = makeCommand({
        passwordHasher: makePasswordHasher({ compare: vi.fn().mockResolvedValue(false) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toMatchObject({
        message: EXPECTED_ERROR_MESSAGE,
      })
    })
  })

  // ── Error types ────────────────────────────────────────────────────────────

  describe('error type', () => {
    it('throws UnauthorizedError when tenant not found', async () => {
      const command = makeCommand({
        tenantRepo: makeTenantRepo({ findBySlug: vi.fn().mockResolvedValue(null) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError when tenant is inactive', async () => {
      const command = makeCommand({
        tenantRepo: makeTenantRepo({ findBySlug: vi.fn().mockResolvedValue(MOCK_INACTIVE_TENANT) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError when user not found', async () => {
      const command = makeCommand({
        userRepo: makeUserRepo({ findByUsername: vi.fn().mockResolvedValue(null) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError when user is inactive', async () => {
      const command = makeCommand({
        userRepo: makeUserRepo({ findByUsername: vi.fn().mockResolvedValue(MOCK_INACTIVE_USER) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
    })

    it('throws UnauthorizedError when password is wrong', async () => {
      const command = makeCommand({
        passwordHasher: makePasswordHasher({ compare: vi.fn().mockResolvedValue(false) }),
      })
      await expect(command.execute(VALID_INPUT)).rejects.toThrow(UnauthorizedError)
    })
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('happy path', () => {
    it('calls refreshTokenRepo.save once with correct shape', async () => {
      const refreshTokenRepo = makeRefreshTokenRepo()

      const command = makeCommand({ refreshTokenRepo })

      await command.execute(VALID_INPUT)

      expect(refreshTokenRepo.save).toHaveBeenCalledTimes(1)

      const savedData = (refreshTokenRepo.save as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
        id: string
        tokenHash: string
        usuarioId: string
        tenantId: string
        role: string
        expiresAt: Date
      }

      expect(typeof savedData.id).toBe('string')
      expect(savedData.usuarioId).toBe(MOCK_ACTIVE_USER.id)
      expect(savedData.tenantId).toBe(MOCK_ACTIVE_TENANT.id)
      expect(savedData.role).toBe(MOCK_ACTIVE_USER.role)
      expect(savedData.expiresAt).toBeInstanceOf(Date)
      // tokenHash must be SHA-256 hex, not the raw refresh token
      expect(savedData.tokenHash).toMatch(/^[a-f0-9]{64}$/)
      expect(savedData.tokenHash).not.toBe('refresh-token-value')
    })

    it('returns { accessToken, refreshToken }', async () => {
      const command = makeCommand()

      const result = await command.execute(VALID_INPUT)

      expect(result.accessToken).toBe('access-token-value')
      expect(result.refreshToken).toBe('refresh-token-value')
    })

    it('passes the correct payload to tokenService.signTokenPair', async () => {
      const tokenService = makeTokenService()
      const command = makeCommand({ tokenService })

      await command.execute(VALID_INPUT)

      expect(tokenService.signTokenPair).toHaveBeenCalledWith({
        sub: MOCK_ACTIVE_USER.id,
        tenantId: MOCK_ACTIVE_TENANT.id,
        role: MOCK_ACTIVE_USER.role,
      })
    })
  })
})
