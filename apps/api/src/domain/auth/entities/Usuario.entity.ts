// Domain entity — no ORM annotations, no external dependencies

const ROLE = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
} as const

export type Role = (typeof ROLE)[keyof typeof ROLE]

export interface UsuarioProps {
  id: string
  tenantId: string
  username: string
  passwordHash: string
  role: Role
  isActive: boolean
  createdAt: Date
}

export class Usuario {
  readonly id: string
  readonly tenantId: string
  readonly username: string
  readonly passwordHash: string
  readonly role: Role
  readonly isActive: boolean
  readonly createdAt: Date

  private constructor(props: UsuarioProps) {
    this.id = props.id
    this.tenantId = props.tenantId
    this.username = props.username
    this.passwordHash = props.passwordHash
    this.role = props.role
    this.isActive = props.isActive
    this.createdAt = props.createdAt
  }

  static create(props: UsuarioProps): Usuario {
    return new Usuario(props)
  }
}
