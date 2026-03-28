import type { Tenant } from '../entities/Tenant.entity.js'

export interface CreateTenantAdminData {
  id: string
  username: string
  passwordHash: string
  email?: string
}

export interface CreateTenantConfigData {
  id: string
}

export interface CreateTenantEntityData {
  id: string
  name: string
  slug: string
}

export interface CreateTenantData {
  tenant: CreateTenantEntityData
  admin: CreateTenantAdminData
  config: CreateTenantConfigData
}

export interface ITenantRepository {
  findBySlug(slug: string): Promise<Tenant | null>
  findFirst(): Promise<Tenant | null>
  count(): Promise<number>
  createWithAdminAndConfig(data: CreateTenantData): Promise<Tenant>
}
