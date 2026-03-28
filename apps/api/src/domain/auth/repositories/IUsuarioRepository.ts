import type { Usuario, Role } from '../entities/Usuario.entity.js'

export interface CreateUsuarioData {
  id: string
  tenantId: string
  username: string
  passwordHash: string
  role: Role
}

export interface IUsuarioRepository {
  findByUsername(tenantId: string, username: string): Promise<Usuario | null>
  create(data: CreateUsuarioData): Promise<Usuario>
}
