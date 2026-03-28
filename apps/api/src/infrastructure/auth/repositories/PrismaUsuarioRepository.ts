import { Rol } from '@prisma/client'
import { Usuario } from '@domain/auth/entities/Usuario.entity.js'
import type { Role } from '@domain/auth/entities/Usuario.entity.js'
import type { IUsuarioRepository, CreateUsuarioData } from '@domain/auth/repositories/IUsuarioRepository.js'
import { prisma } from '@infrastructure/database/prisma/client.js'

type DbUsuario = {
  id: string
  tenantId: string
  username: string
  hashPassword: string
  rol: Rol
  activo: boolean
  createdAt: Date
}

function mapRolToRole(rol: Rol): Role {
  return rol === Rol.admin ? 'admin' : 'cashier'
}

function mapRoleToRol(role: Role): Rol {
  return role === 'admin' ? Rol.admin : Rol.cajero
}

function mapToEntity(row: DbUsuario): Usuario {
  return Usuario.create({
    id: row.id,
    tenantId: row.tenantId,
    username: row.username,
    passwordHash: row.hashPassword,
    role: mapRolToRole(row.rol),
    isActive: row.activo,
    createdAt: row.createdAt,
  })
}

export class PrismaUsuarioRepository implements IUsuarioRepository {
  async findByUsername(tenantId: string, username: string): Promise<Usuario | null> {
    const row = await prisma.usuario.findFirst({
      where: { tenantId, username, activo: true },
    })

    if (!row) return null

    return mapToEntity(row)
  }

  async create(data: CreateUsuarioData): Promise<Usuario> {
    const row = await prisma.usuario.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        nombre: data.username,
        username: data.username,
        hashPassword: data.passwordHash,
        rol: mapRoleToRol(data.role),
      },
    })

    return mapToEntity(row)
  }
}
