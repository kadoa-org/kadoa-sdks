import { KadoaHttpException } from "../../runtime/exceptions";
import {
  type CreateSettingsRequest,
  type ListSettingsRequest,
  type NotificationSettings,
  type NotificationSettingsEventType,
  NotificationSettingsEventTypeEnum,
  type NotificationsApiInterface,
  type UpdateSettingsRequest,
} from "./notifications.acl";

export class NotificationSettingsService {
  private readonly api: NotificationsApiInterface;

  constructor(notificationsApi: NotificationsApiInterface) {
    this.api = notificationsApi;
  }

  async createSettings(
    requestData: CreateSettingsRequest,
  ): Promise<NotificationSettings> {
    const response = await this.api.v5NotificationsSettingsPost({
      v5NotificationsSettingsPostRequest: requestData,
    });
    const data = response.data.data?.settings;
    if (!data) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to create notification settings",
      });
    }
    return data as NotificationSettings;
  }

  async listSettings(
    filters: ListSettingsRequest,
  ): Promise<NotificationSettings[]> {
    const response = await this.api.v5NotificationsSettingsGet(filters);
    const data = response.data.data?.settings;
    if (!data) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to list notification settings",
      });
    }
    return data as NotificationSettings[];
  }

  async listAllEvents(): Promise<NotificationSettingsEventType[]> {
    return Object.values(NotificationSettingsEventTypeEnum);
  }

  async updateSettings(
    settingsId: string,
    data: UpdateSettingsRequest,
  ): Promise<NotificationSettings> {
    const response = await this.api.v5NotificationsSettingsSettingsIdPut({
      settingsId,
      v5NotificationsSettingsSettingsIdPutRequest: data,
    });
    const settings = response.data.data?.settings;
    if (!settings) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to update notification settings",
      });
    }
    return settings as NotificationSettings;
  }

  async deleteSettings(settingsId: string): Promise<void> {
    const response = await this.api.v5NotificationsSettingsSettingsIdDelete({
      settingsId,
    });

    if (response.status !== 200) {
      throw KadoaHttpException.wrap(response, {
        message: "Failed to delete notification settings",
      });
    }
  }
}
