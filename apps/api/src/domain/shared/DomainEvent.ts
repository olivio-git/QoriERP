export abstract class DomainEvent {
  public readonly occurredAt: Date
  public readonly tenantId: string

  constructor(tenantId: string) {
    this.occurredAt = new Date()
    this.tenantId = tenantId
  }

  abstract get eventName(): string
}
