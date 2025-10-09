import { KadoaHttpException } from "../../runtime/exceptions";
import {
  type NotificationsApiInterface,
  type NotificationsApiV5NotificationsSettingsGetRequest,
  type V5NotificationsSettingsGet200ResponseDataSettingsInner,
  V5NotificationsSettingsGetEventTypeEnum,
  type V5NotificationsSettingsPostRequest,
} from "../../../generated";

export type NotificationSettings =
  V5NotificationsSettingsGet200ResponseDataSettingsInner;

export type NotificationSettingsEventType =
  V5NotificationsSettingsGetEventTypeEnum;

export class NotificationSettingsService {
  private readonly api: NotificationsApiInterface;

  constructor(notificationsApi: NotificationsApiInterface) {
    this.api = notificationsApi;
  }

  async createSettings(
    requestData: V5NotificationsSettingsPostRequest,
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
    filters: NotificationsApiV5NotificationsSettingsGetRequest,
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
    return Object.values(V5NotificationsSettingsGetEventTypeEnum);
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
