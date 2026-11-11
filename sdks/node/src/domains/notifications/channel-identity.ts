export interface NotificationDeliveryConfig {
  recipients?: string[];
  webhookUrl?: string;
  slackChannelId?: string;
  [key: string]: unknown;
}

export interface ComparableNotificationChannel {
  /** Optional in the SDK response; a channel without one cannot be referenced, so it is never reused. */
  id?: string;
  name?: string;
  channelType?: string;
  /** Typed as a bare object by the SDK; read through NotificationDeliveryConfig. */
  config?: object | null;
  createdAt?: string | Date;
}

/** The destination a channel delivers to, or null when there is nothing to compare. */
export function notificationChannelDestination(
  channelType: string | undefined,
  rawConfig: object | null | undefined,
): string | null {
  if (channelType === "WEBSOCKET") return "websocket";

  const config = (rawConfig ?? {}) as NotificationDeliveryConfig;
  const normalized = { ...config };
  if (channelType === "EMAIL") {
    if (
      !Array.isArray(config.recipients) ||
      config.recipients.length === 0 ||
      config.recipients.some((r) => typeof r !== "string")
    )
      return null;
    normalized.recipients = [
      ...new Set(config.recipients.map((r) => r.trim().toLowerCase())),
    ].sort();
  } else if (channelType === "WEBHOOK") {
    if (typeof config.webhookUrl !== "string") return null;
    normalized.httpMethod = String(config.httpMethod ?? "POST").toUpperCase();
    normalized.auth = config.auth ?? null;
  } else if (channelType === "SLACK") {
    if (config.slackChannelId) delete normalized.slackChannelName;
    else if (!config.webhookUrl) return null;
  } else return null;
  return `${channelType.toLowerCase()}:${stableJson(normalized)}`;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`)
    .join(",")}}`;
}

/**
 * The existing channel of this type that already delivers to the same destination, or null.
 */
export function findReusableNotificationChannel<
  T extends ComparableNotificationChannel,
>(
  channels: readonly T[],
  channelType: string,
  config: object | null | undefined,
  preferredIds: readonly string[] = [],
): T | null {
  const wanted = notificationChannelDestination(channelType, config);
  if (wanted === null) return null;

  return (
    [...channels]
      .sort(
        (a, b) =>
          Number(preferredIds.includes(b.id ?? "")) -
            Number(preferredIds.includes(a.id ?? "")) ||
          String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? "")) ||
          String(a.id ?? "").localeCompare(String(b.id ?? "")),
      )
      .find(
        (channel) =>
          Boolean(channel.id) &&
          channel.channelType === channelType &&
          notificationChannelDestination(
            channel.channelType,
            channel.config,
          ) === wanted,
      ) ?? null
  );
}
