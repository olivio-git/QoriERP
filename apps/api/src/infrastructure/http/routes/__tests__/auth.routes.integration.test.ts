/**
 * Integration tests for auth HTTP routes.
 *
 * Strategy: We build a real Fastify app (same wiring as main.ts) but mock the
 * Prisma client so no real database is needed. This lets us test the full
 * HTTP → validation → command → response stack without DB infrastructure.
 *
 * To run against a REAL database instead, set DATABASE_URL to a test Postgres
 * instance and comment out the vi.mock block below. The test DB must have the
 * schema applied (`prisma migrate deploy`) and ALLOW_REGISTRATION=true.
 *
 * Example:
 *   DATABASE_URL=postgresql://qorierp:qorierp@localhost:5432/qorierp_test \
 *   ALLOW_REGISTRATION=true \
 *   vitest run
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { AppError } from '../../../../shared/errors/AppError.js'

// ── Prisma mock ───────────────────────────────────────────────────────────────
// We mock the singleton prisma client used by all Prisma*Repository classes.
// Each test can override the mock implementation as needed.

const mockPrisma = {
  tenant: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn().mockResolvedValue(1),
    create: vi.fn(),
  },
  usuario: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}

// The mock path must match the module ID resolved by vite-tsconfig-paths.
// Both the alias form and the relative form work; we use the alias since all
// repositories import from '@infrastructure/database/prisma/client.js'.
vi.mock('../../../../infrastructure/database/prisma/client.js', () => ({
  prisma: mockPrisma,
}))

// ── App factory ───────────────────────────────────────────────────────────────

async function buildTestApp(): Promise<FastifyInstance> {
  // Dynamic import AFTER vi.mock has replaced the prisma module
  const { authRoutes } = await import('../auth.routes.js')

  const app = Fastify({ logger: false })

  await app.register(jwt, { secret: 'test-secret-key-for-integration' })

  app.addSchema({
    $id: 'ErrorResponse',
    type: 'object',
    properties: { error: { type: 'string' } },
  })
  app.addSchema({
    $id: 'ValidationErrorResponse',
    type: 'object',
    properties: {
      error: { type: 'string' },
      issues: { type: 'array', items: { type: 'object' } },
    },
  })

  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(422).send({ error: 'Validation error', issues: error.validation })
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message })
    }
    return reply.status(500).send({ error: 'Internal server error' })
  })

  await app.register(authRoutes, { prefix: '/auth' })

  return app
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.resetAllMocks()
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('returns 422 when required fields are missing', async () => {
    process.env['ALLOW_REGISTRATION'] = 'true'

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {},
    })

    expect(response.statusCode).toBe(422)
    const body = response.json<{ error: string }>()
    expect(body.error).toBe('Validation error')
  })

  it('returns 422 when slug contains uppercase letters', async () => {
    process.env['ALLOW_REGISTRATION'] = 'true'

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantName: 'Acme Corp',
        slug: 'UPPERCASE-NOT-ALLOWED',
        adminUsername: 'admin',
        adminPassword: 'password123',
      },
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 422 when adminPassword is shorter than 8 characters', async () => {
    process.env['ALLOW_REGISTRATION'] = 'true'

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantName: 'Acme Corp',
        slug: 'acme',
        adminUsername: 'admin',
        adminPassword: 'short',
      },
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 403 when ALLOW_REGISTRATION is not set to "true"', async () => {
    delete process.env['ALLOW_REGISTRATION']

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantName: 'Acme Corp',
        slug: 'acme',
        adminUsername: 'admin',
        adminPassword: 'password123',
      },
    })

    expect(response.statusCode).toBe(403)
    const body = response.json<{ error: string }>()
    expect(body.error).toBe('Registration is disabled')
  })

  it('returns 403 when ALLOW_REGISTRATION is explicitly "false"', async () => {
    process.env['ALLOW_REGISTRATION'] = 'false'

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantName: 'Acme Corp',
        slug: 'acme',
        adminUsername: 'admin',
        adminPassword: 'password123',
      },
    })

    expect(response.statusCode).toBe(403)
  })

  it(
    'returns 201 with accessToken and refreshToken when ALLOW_REGISTRATION=true and slug is free',
    { timeout: 10_000 },
    async () => {
      process.env['ALLOW_REGISTRATION'] = 'true'

      // Mock: slug not taken
      mockPrisma.tenant.findUnique.mockResolvedValue(null)

      // Mock: $transaction creates tenant and returns it
      const createdTenant = {
        id: 'tenant-uuid',
        nombre: 'Acme Corp',
        slug: 'acme',
        activo: true,
        createdAt: new Date(),
      }
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          const txMock = {
            ...mockPrisma,
            tenant: {
              ...mockPrisma.tenant,
              create: vi.fn().mockResolvedValue(createdTenant),
            },
            usuario: {
              create: vi.fn().mockResolvedValue({}),
            },
            configuracion: {
              create: vi.fn().mockResolvedValue({}),
            },
            $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
          }
          return fn(txMock as unknown as typeof mockPrisma)
        },
      )

      // Mock: refreshToken.create succeeds
      mockPrisma.refreshToken.create.mockResolvedValue({})

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          tenantName: 'Acme Corp',
          slug: 'acme',
          adminUsername: 'admin',
          adminPassword: 'password123',
        },
      })

      expect(response.statusCode).toBe(201)

      const body = response.json<{
        tenantId: string
        tenantSlug: string
        accessToken: string
        refreshToken: string
      }>()

      expect(body.tenantId).toBe('tenant-uuid')
      expect(body.tenantSlug).toBe('acme')
      expect(typeof body.accessToken).toBe('string')
      expect(body.accessToken.length).toBeGreaterThan(0)
      expect(typeof body.refreshToken).toBe('string')
      expect(body.refreshToken.length).toBeGreaterThan(0)
    },
  )

  it('returns 409 when the slug is already taken', async () => {
    process.env['ALLOW_REGISTRATION'] = 'true'

    // Mock: slug already in use
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'existing-tenant',
      nombre: 'Existing Corp',
      slug: 'acme',
      activo: true,
      createdAt: new Date(),
    })

    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        tenantName: 'Acme Corp',
        slug: 'acme',
        adminUsername: 'admin',
        adminPassword: 'password123',
      },
    })

    expect(response.statusCode).toBe(409)
    const body = response.json<{ error: string }>()
    expect(body.error).toContain('acme')
  })
})

describe('POST /auth/login', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.resetAllMocks()
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('returns 422 when required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: {},
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 401 when tenant is not found', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'admin', password: 'password123', tenantSlug: 'unknown' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ error: string }>()
    expect(body.error).toBe('Credenciales inválidas')
  })

  it('returns 401 with same message when user is not found (no enumeration)', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant-uuid',
      nombre: 'Acme',
      slug: 'acme',
      activo: true,
      createdAt: new Date(),
    })
    mockPrisma.usuario.findFirst.mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { username: 'nonexistent', password: 'password123', tenantSlug: 'acme' },
    })

    expect(response.statusCode).toBe(401)
    const body = response.json<{ error: string }>()
    expect(body.error).toBe('Credenciales inválidas')
  })
})

describe('POST /auth/refresh', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.resetAllMocks()
    app = await buildTestApp()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('returns 422 when refreshToken field is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: {},
    })

    expect(response.statusCode).toBe(422)
  })

  it('returns 401 when refresh token is not found in DB', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'invalid-token' },
    })

    expect(response.statusCode).toBe(401)
  })
})
