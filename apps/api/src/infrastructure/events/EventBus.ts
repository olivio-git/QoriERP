import type { DomainEvent } from '@domain/shared/DomainEvent.js'

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void>

class EventBus {
  private handlers: Map<string, EventHandler<DomainEvent>[]> = new Map()

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>) {
    const existing = this.handlers.get(eventName) ?? []
    this.handlers.set(eventName, [...existing, handler as EventHandler<DomainEvent>])
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? []
    await Promise.all(handlers.map(h => h(event)))
  }
}

export const eventBus = new EventBus()
