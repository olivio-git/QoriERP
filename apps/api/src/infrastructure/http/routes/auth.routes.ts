import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const registerBodySchema = {
  type: 'object',
  required: ['tenantName', 'slug', 'adminUsername', 'adminPassword'],
  properties: {
    tenantName: { type: 'string', minLength: 2, description: 'Nombre del tenant' },
    slug: { type: 'string', minLength: 2, maxLength: 50, pattern: '^[a-z0-9-]+$', description: 'Slug único del tenant (minúsculas, guiones)' },
    adminUsername: { type: 'string', minLength: 3, description: 'Username del administrador' },
    adminPassword: { type: 'string', minLength: 8, description: 'Contraseña del administrador' },
  },
} as const

const loginBodySchema = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: { type: 'string', description: 'Nombre de usuario' },
    password: { type: 'string', description: 'Contraseña' },
    tenantSlug: { type: 'string', description: 'Slug del tenant (requerido en modo SaaS, omitir en self-hosted)' },
  },
} as const

const refreshBodySchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string', description: 'Refresh token vigente' },
  },
} as const

const tokenPairResponse = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
  },
} as const
import { RegisterUserCommand } from '@application/auth/commands/RegisterUser.command.js'
import { LoginUserCommand } from '@application/auth/commands/LoginUser.command.js'
import { RefreshTokenCommand } from '@application/auth/commands/RefreshToken.command.js'
import { BcryptPasswordHasher } from '@infrastructure/auth/services/BcryptPasswordHasher.js'
import { FastifyJwtTokenService } from '@infrastructure/auth/services/FastifyJwtTokenService.js'
import { PrismaTenantRepository } from '@infrastructure/auth/repositories/PrismaTenantRepository.js'
import { PrismaUsuarioRepository } from '@infrastructure/auth/repositories/PrismaUsuarioRepository.js'
import { PrismaRefreshTokenRepository } from '@infrastructure/auth/repositories/PrismaRefreshTokenRepository.js'
import { replyError } from '@shared/http/replyError.js'

const registerSchema = z.object({
  tenantName: z.string().min(2),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  adminUsername: z.string().min(3),
  adminPassword: z.string().min(8),
})

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  tenantSlug: z.string().optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const passwordHasher = new BcryptPasswordHasher()
  const tokenService = new FastifyJwtTokenService(app)
  const tenantRepo = new PrismaTenantRepository()
  const userRepo = new PrismaUsuarioRepository()
  const refreshTokenRepo = new PrismaRefreshTokenRepository()

  const registerCommand = new RegisterUserCommand(
    tenantRepo,
    userRepo,
    passwordHasher,
    tokenService,
    refreshTokenRepo,
  )
  const loginCommand = new LoginUserCommand(
    tenantRepo,
    userRepo,
    passwordHasher,
    tokenService,
    refreshTokenRepo,
  )
  const refreshCommand = new RefreshTokenCommand(refreshTokenRepo, tokenService)

  // POST /auth/register
  app.post('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Registrar nuevo tenant',
      description: 'Crea un tenant nuevo con su primer usuario administrador. Solo disponible si ALLOW_REGISTRATION=true.',
      body: registerBodySchema,
      response: {
        201: {
          description: 'Tenant creado exitosamente',
          type: 'object',
          properties: {
            tenantId: { type: 'string', format: 'uuid' },
            tenantSlug: { type: 'string' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
        403: { $ref: 'ErrorResponse#' },
        409: { $ref: 'ErrorResponse#' },
        422: { $ref: 'ValidationErrorResponse#' },
      },
    },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation error',
        issues: parsed.error.issues,
      })
    }

    try {
      const result = await registerCommand.execute(parsed.data)
      return reply.status(201).send({
        tenantId: result.tenant.id,
        tenantSlug: result.tenant.slug,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error) {
      return replyError(reply, error);
    }
  })

  // POST /auth/login
  app.post('/login', {
    schema: {
      tags: ['auth'],
      summary: 'Login de usuario',
      description: 'Autentica un usuario contra un tenant específico. Retorna access token (15m) y refresh token (7d).',
      body: loginBodySchema,
      response: {
        200: { description: 'Login exitoso', ...tokenPairResponse },
        401: { $ref: 'ErrorResponse#' },
        422: { $ref: 'ValidationErrorResponse#' },
      },
    },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation error',
        issues: parsed.error.issues,
      })
    }

    try {
      const result = await loginCommand.execute(parsed.data)
      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error) {
      return replyError(reply, error);

    }
  })

  // POST /auth/refresh
  app.post('/refresh', {
    schema: {
      tags: ['auth'],
      summary: 'Renovar tokens',
      description: 'Rota el refresh token y emite un nuevo par de tokens. El token enviado queda invalidado.',
      body: refreshBodySchema,
      response: {
        200: { description: 'Tokens renovados', ...tokenPairResponse },
        401: { $ref: 'ErrorResponse#' },
        422: { $ref: 'ValidationErrorResponse#' },
      },
    },
  }, async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation error',
        issues: parsed.error.issues,
      })
    }

    try {
      const result = await refreshCommand.execute(parsed.data)
      return reply.status(200).send({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    } catch (error) {
      return replyError(reply, error);
    }
  })
}
