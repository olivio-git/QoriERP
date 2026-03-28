import { Rol, TipoNegocio } from '@prisma/client'
import { Tenant } from '@domain/auth/entities/Tenant.entity.js'
import type { ITenantRepository, CreateTenantData } from '@domain/auth/repositories/ITenantRepository.js'
import { prisma } from '@infrastructure/database/prisma/client.js'

type DbTenant = {
  id: string
  nombre: string
  slug: string
  activo: boolean
  createdAt: Date
}

function mapToEntity(row: DbTenant): Tenant {
  return Tenant.create({
    id: row.id,
    name: row.nombre,
    slug: row.slug,
    isActive: row.activo,
    createdAt: row.createdAt,
  })
}

export class PrismaTenantRepository implements ITenantRepository {
  async findBySlug(slug: string): Promise<Tenant | null> {
    const row = await prisma.tenant.findUnique({
      where: { slug },
    })

    if (!row) return null

    return mapToEntity(row)
  }

  async findFirst(): Promise<Tenant | null> {
    const row = await prisma.tenant.findFirst()
    if (!row) return null
    return mapToEntity(row)
  }

  async count(): Promise<number> {
    return prisma.tenant.count()
  }

  async createWithAdminAndConfig(data: CreateTenantData): Promise<Tenant> {
    const tenant = await prisma.$transaction(async (tx) => {
      // 1. Create tenant (no RLS — platform table)
      const createdTenant = await tx.tenant.create({
        data: {
          id: data.tenant.id,
          nombre: data.tenant.name,
          slug: data.tenant.slug,
        },
      })

      // 2. Set tenant context so RLS allows inserts into tenant-scoped tables
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.tenant_id', $1, true)`,
        createdTenant.id,
      )

      // 3. Create admin user (RLS-protected table — requires app.tenant_id to match row tenantId)
      await tx.usuario.create({
        data: {
          id: data.admin.id,
          tenantId: createdTenant.id,
          nombre: data.admin.username,
          username: data.admin.username,
          hashPassword: data.admin.passwordHash,
          rol: Rol.admin,
        },
      })

      // 4. Create default tenant configuration (RLS-protected table)
      await tx.configuracion.create({
        data: {
          id: data.config.id,
          tenantId: createdTenant.id,
          tipoNegocio: TipoNegocio.otro,
        },
      })

      return createdTenant
    })

    return mapToEntity(tenant)
  }
}
