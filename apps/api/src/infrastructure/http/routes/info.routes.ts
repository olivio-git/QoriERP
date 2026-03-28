import type { FastifyInstance } from 'fastify'
import { PrismaTenantRepository } from '@infrastructure/auth/repositories/PrismaTenantRepository.js'

export async function infoRoutes(app: FastifyInstance): Promise<void> {
  const tenantRepo = new PrismaTenantRepository()

  app.get('/info', {
    schema: {
      tags: ['system'],
      summary: 'Información del sistema',
      description: 'Devuelve el modo de despliegue y si se requiere configuración inicial. Llamado por el cliente al arrancar.',
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            mode: { type: 'string', enum: ['saas', 'self-hosted'] },
            setupRequired: { type: 'boolean' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const mode = process.env['DEPLOYMENT_MODE'] === 'self-hosted' ? 'self-hosted' : 'saas'
    const version = process.env['APP_VERSION'] ?? '0.1.0'

    let setupRequired = false
    if (mode === 'self-hosted') {
      const count = await tenantRepo.count()
      setupRequired = count === 0
    }

    return reply.send({ version, mode, setupRequired })
  })
}
