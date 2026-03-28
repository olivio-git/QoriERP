import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SetupTenantCommand } from '@application/auth/commands/SetupTenant.command.js'
import { BcryptPasswordHasher } from '@infrastructure/auth/services/BcryptPasswordHasher.js'
import { FastifyJwtTokenService } from '@infrastructure/auth/services/FastifyJwtTokenService.js'
import { PrismaTenantRepository } from '@infrastructure/auth/repositories/PrismaTenantRepository.js'
import { PrismaUsuarioRepository } from '@infrastructure/auth/repositories/PrismaUsuarioRepository.js'
import { PrismaRefreshTokenRepository } from '@infrastructure/auth/repositories/PrismaRefreshTokenRepository.js'
import { replyError } from '@shared/http/replyError.js'

const setupBodySchema = {
  type: 'object',
  required: ['businessName', 'adminUsername', 'adminPassword'],
  properties: {
    businessName: { type: 'string', minLength: 2, description: 'Nombre del negocio' },
    adminUsername: { type: 'string', minLength: 3, description: 'Username del administrador' },
    adminPassword: { type: 'string', minLength: 8, description: 'Contraseña del administrador' },
  },
} as const

const setupSchema = z.object({
  businessName: z.string().min(2),
  adminUsername: z.string().min(3),
  adminPassword: z.string().min(8),
})

export async function setupRoutes(app: FastifyInstance): Promise<void> {
  const passwordHasher = new BcryptPasswordHasher()
  const tokenService = new FastifyJwtTokenService(app)
  const tenantRepo = new PrismaTenantRepository()
  const userRepo = new PrismaUsuarioRepository()
  const refreshTokenRepo = new PrismaRefreshTokenRepository()

  const setupCommand = new SetupTenantCommand(
    tenantRepo,
    userRepo,
    passwordHasher,
    tokenService,
    refreshTokenRepo,
  )

  // POST /setup
  app.post('/', {
    schema: {
      tags: ['system'],
      summary: 'Primera instalación (self-hosted)',
      description: 'Configura el sistema en la primera instalación. Solo disponible en modo self-hosted y cuando no existe ningún tenant. Retorna 409 si el sistema ya fue configurado.',
      body: setupBodySchema,
      response: {
        201: {
          description: 'Sistema configurado exitosamente',
          type: 'object',
          properties: {
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
    const parsed = setupSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(422).send({
        error: 'Validation error',
        issues: parsed.error.issues,
      })
    }

    try {
      const result = await setupCommand.execute(parsed.data)
      return reply.status(201).send(result)
    } catch (error) {
      return replyError(reply, error)
    }
  })
}
