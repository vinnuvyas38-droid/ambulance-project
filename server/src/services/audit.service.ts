import { v4 as uuidv4 } from 'uuid';
import { AuditLog } from '@green-corridor/shared';
import { store } from '../lib/store';
import { logger } from '../lib/logger';

export class AuditService {
  /**
   * Appends an immutable audit log entry
   */
  static log(
    action: string,
    entity: string,
    details: Record<string, unknown> = {},
    actorType: 'user' | 'system' | 'ai' = 'system',
    actorId?: string,
    entityId?: string
  ): AuditLog {
    const entry: AuditLog = {
      id: uuidv4(),
      actor_id: actorId || null,
      actor_type: actorType,
      action,
      entity,
      entity_id: entityId || null,
      details,
      created_at: new Date().toISOString(),
    };

    store.audit_logs.unshift(entry);
    if (store.audit_logs.length > 500) {
      store.audit_logs.pop();
    }

    logger.info({ action, entity, actorType, entityId }, 'Audit log recorded');
    return entry;
  }

  static getLogs(page = 1, pageSize = 20, entityFilter?: string): { logs: AuditLog[]; total: number } {
    let filtered = store.audit_logs;
    if (entityFilter) {
      filtered = filtered.filter((l) => l.entity === entityFilter || l.action.includes(entityFilter));
    }
    const start = (page - 1) * pageSize;
    return {
      logs: filtered.slice(start, start + pageSize),
      total: filtered.length,
    };
  }
}
