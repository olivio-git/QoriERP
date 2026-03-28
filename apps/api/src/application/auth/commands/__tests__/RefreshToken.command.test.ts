import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHash } from 'node:crypto'
import { RefreshTokenCommand } from '../RefreshToken.command.js'
import type { IRefreshTokenRepository, StoredRefreshToken } from '../../../../domain/auth/repositories/IRefreshTokenRepository.js'
import type { ITokenService } from '../../../../domain/auth/services/ITokenService.js'
import { UnauthorizedError } from '../../../../shared/errors/AppError.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const RAW_REFRESH_TOKEN = 'some-raw-refresh-token'

const STORED_VALID_TOKEN: StoredRefreshToken = {
  id: 'rt-uuid',
  tokenHash: sha256(RAW_REFRESH_TOKEN),
  usuarioId: 'user-uuid',
  tenantId: 'tenant-uuid',
  role: 'admin',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  isUsed: false,
}

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeRefreshTokenRepo(overrides?: Partial<IRefreshTokenRepository>): IRefreshTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByHashedToken: vi.fn().mockResolvedValue(STORED_VALID_TOKEN),
    revoke: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeTokenService(overrides?: Partial<ITokenService>): ITokenService {
  return {
    signTokenPair: vi.fn().mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }),
    verifyRefreshToken: vi.fn(),
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RefreshTokenCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  // ── Error cases ────────────────────────────────────────────────────────────

  it('throws UnauthorizedError when token hash is not found in DB', async () => {
    const command = new RefreshTokenCommand(
      makeRefreshTokenRepo({ findByHashedToken: vi.fn().mockResolvedValue(null) }),
      makeTokenService(),
    )

    await expect(command.execute({ refreshToken: RAW_REFRESH_TOKEN })).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when stored token is already used (isUsed: true)', async () => {
    const usedToken: StoredRefreshToken = { ...STORED_VALID_TOKEN, isUsed: true }

    const command = new RefreshTokenCommand(
      makeRefreshTokenRepo({ findByHashedToken: vi.fn().mockResolvedValue(usedToken) }),
      makeTokenService(),
    )

    await expect(command.execute({ refreshToken: RAW_REFRESH_TOKEN })).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when stored token is expired (expiresAt in the past)', async () => {
    const expiredToken: StoredRefreshToken = {
      ...STORED_VALID_TOKEN,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    }

    const command = new RefreshTokenCommand(
      makeRefreshTokenRepo({ findByHashedToken: vi.fn().mockResolvedValue(expiredToken) }),
      makeTokenService(),
    )

    await expect(command.execute({ refreshToken: RAW_REFRESH_TOKEN })).rejects.toThrow(UnauthorizedError)
  })

  it('throws UnauthorizedError when token expires exactly now (boundary: expiresAt === now)', async () => {
    // expiresAt <= new Date() is the guard. A past date triggers the error.
    // This test verifies the boundary condition.
    const expiredToken: StoredRefreshToken = {
      ...STORED_VALID_TOKEN,
      expiresAt: new Date(Date.now() - 1), // just expired
    }

    const command = new RefreshTokenCommand(
      makeRefreshTokenRepo({ findByHashedToken: vi.fn().mockResolvedValue(expiredToken) }),
      makeTokenService(),
    )

    await expect(command.execute({ refreshToken: RAW_REFRESH_TOKEN })).rejects.toThrow(UnauthorizedError)
  })

  // ── Call ordering: revoke BEFORE save ─────────────────────────────────────

  it('calls revoke() before save() — token rotation order matters', async () => {
    const callOrder: string[] = []

    const refreshTokenRepo = makeRefreshTokenRepo({
      revoke: vi.fn().mockImplementation(async () => {
        callOrder.push('revoke')
      }),
      save: vi.fn().mockImplementation(async () => {
        callOrder.push('save')
      }),
    })

    const command = new RefreshTokenCommand(refreshTokenRepo, makeTokenService())

    await command.execute({ refreshToken: RAW_REFRESH_TOKEN })

    expect(callOrder).toEqual(['revoke', 'save'])
    expect(callOrder.indexOf('revoke')).toBeLessThan(callOrder.indexOf('save'))
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('calls revoke with the incoming token hash', async () => {
    const refreshTokenRepo = makeRefreshTokenRepo()

    const command = new RefreshTokenCommand(refreshTokenRepo, makeTokenService())

    await command.execute({ refreshToken: RAW_REFRESH_TOKEN })

    expect(refreshTokenRepo.revoke).toHaveBeenCalledWith(sha256(RAW_REFRESH_TOKEN))
  })

  it('saves a new refresh token with the correct shape', async () => {
    const refreshTokenRepo = makeRefreshTokenRepo()

    const command = new RefreshTokenCommand(refreshTokenRepo, makeTokenService())

    await command.execute({ refreshToken: RAW_REFRESH_TOKEN })

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
    expect(savedData.usuarioId).toBe(STORED_VALID_TOKEN.usuarioId)
    expect(savedData.tenantId).toBe(STORED_VALID_TOKEN.tenantId)
    expect(savedData.role).toBe(STORED_VALID_TOKEN.role)
    expect(savedData.expiresAt).toBeInstanceOf(Date)
    // New token hash must be SHA-256, not the raw new token
    expect(savedData.tokenHash).toMatch(/^[a-f0-9]{64}$/)
    expect(savedData.tokenHash).not.toBe('new-refresh-token')
  })

  it('returns new { accessToken, refreshToken }', async () => {
    const command = new RefreshTokenCommand(makeRefreshTokenRepo(), makeTokenService())

    const result = await command.execute({ refreshToken: RAW_REFRESH_TOKEN })

    expect(result.accessToken).toBe('new-access-token')
    expect(result.refreshToken).toBe('new-refresh-token')
  })

  it('looks up token by SHA-256 hash of the raw input', async () => {
    const refreshTokenRepo = makeRefreshTokenRepo()

    const command = new RefreshTokenCommand(refreshTokenRepo, makeTokenService())

    await command.execute({ refreshToken: RAW_REFRESH_TOKEN })

    expect(refreshTokenRepo.findByHashedToken).toHaveBeenCalledWith(sha256(RAW_REFRESH_TOKEN))
  })
})
