export interface SecurityEvent {
  type:
    | "logout"
    | "auth_change"
    | "data_clear"
    | "subscription_cleanup"
    | "request_abort";
  timestamp: Date;
  details: Record<string, any>;
}

const securityEvents: SecurityEvent[] = [];

const MAX_EVENTS = 1000;

export function logSecurityEvent(
  event: Omit<SecurityEvent, "timestamp">
): void {
  const fullEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  securityEvents.push(fullEvent);

  if (securityEvents.length > MAX_EVENTS) {
    securityEvents.shift();
  }

  console.log(`[Security Event] ${fullEvent.type}:`, {
    timestamp: fullEvent.timestamp.toISOString(),
    ...fullEvent.details,
  });
}

export function getSecurityEvents(): SecurityEvent[] {
  return [...securityEvents];
}

export function clearSecurityEvents(): void {
  securityEvents.length = 0;
}

export function getSecurityEventsByType(
  type: SecurityEvent["type"]
): SecurityEvent[] {
  return securityEvents.filter((event) => event.type === type);
}

export function getSecurityEventsInRange(
  startTime: Date,
  endTime: Date = new Date()
): SecurityEvent[] {
  return securityEvents.filter(
    (event) => event.timestamp >= startTime && event.timestamp <= endTime
  );
}
