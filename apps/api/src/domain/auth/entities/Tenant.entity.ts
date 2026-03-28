// Domain entity — no ORM annotations, no external dependencies

export interface TenantProps {
  id: string
  name: string
  slug: string
  isActive: boolean
  createdAt: Date
}

export class Tenant {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly isActive: boolean
  readonly createdAt: Date

  private constructor(props: TenantProps) {
    this.id = props.id
    this.name = props.name
    this.slug = props.slug
    this.isActive = props.isActive
    this.createdAt = props.createdAt
  }

  static create(props: TenantProps): Tenant {
    return new Tenant(props)
  }
}
