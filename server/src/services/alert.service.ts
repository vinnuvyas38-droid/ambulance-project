import { v4 as uuidv4 } from 'uuid';
import { Alert } from '@green-corridor/shared';
import { store } from '../lib/store';
import { logger } from '../lib/logger';

export class AlertService {
  static create(
    severity: 'info' | 'warning' | 'critical',
    message: string,
    junctionId?: string,
    missionId?: string
  ): Alert {
    const alert: Alert = {
      id: uuidv4(),
      severity,
      message,
      junction_id: junctionId || null,
      mission_id: missionId || null,
      acknowledged: false,
      created_at: new Date().toISOString(),
    };

    store.alerts.set(alert.id, alert);
    logger.warn({ severity, message, junctionId, missionId }, 'System alert raised');
    return alert;
  }

  static getAlerts(): Alert[] {
    return Array.from(store.alerts.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  static acknowledge(alertId: string): boolean {
    const alert = store.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
}
