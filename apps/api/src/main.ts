import Fastify, { type FastifyError } from 'fastify'
import jwt from '@fastify/jwt'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { authRoutes } from '@infrastructure/http/routes/auth.routes.js'
import { infoRoutes } from '@infrastructure/http/routes/info.routes.js'
import { setupRoutes } from '@infrastructure/http/routes/setup.routes.js'
import { AppError } from '@shared/errors/AppError.js'

const app = Fastify({ logger: true })

// CORS
await app.register(cors, { origin: true })

// JWT plugin
await app.register(jwt, {
  secret: process.env['JWT_SECRET'] ?? (() => { throw new Error('JWT_SECRET is required') })(),
})

// Swagger
await app.register(swagger, {
  openapi: {
    info: {
      title: 'QoriERP API',
      description: 'API del sistema ERP multitenant QoriERP',
      version: '0.1.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
})

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
})

// Shared schemas
app.addSchema({
  $id: 'ErrorResponse',
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
})

app.addSchema({
  $id: 'ValidationErrorResponse',
  type: 'object',
  properties: {
    error: { type: 'string' },
    issues: { type: 'array', items: { type: 'object' } },
  },
})

// Routes
await app.register(infoRoutes, { prefix: '/api' })
await app.register(setupRoutes, { prefix: '/setup' })
await app.register(authRoutes, { prefix: '/auth' })

// Global error handler
app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error.validation) {
    return reply.status(422).send({ error: 'Validation error', issues: error.validation })
  }
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }
  app.log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
})

// Health check
app.get('/health', async () => ({ status: 'ok', project: 'QoriERP' }))

const start = async () => {
  await app.listen({
    port: parseInt(process.env['PORT'] ?? '3000', 10),
    host: '0.0.0.0',
  })
}

start().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
