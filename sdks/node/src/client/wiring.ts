import type { AxiosInstance } from "axios";
import axios, { AxiosError } from "axios";
import { v4 } from "uuid";
import { type CrawlerDomain, createCrawlerDomain } from "../domains/crawler";
import { DataFetcherService } from "../domains/extraction/services/data-fetcher.service";
import { EntityResolverService } from "../domains/extraction/services/entity-resolver.service";
import { ExtractionService } from "../domains/extraction/services/extraction.service";
import { ExtractionBuilderService } from "../domains/extraction/services/extraction-builder.service";
import type {
  NotificationOptions,
  NotificationSettingsEventType,
  SetupWorkflowNotificationSettingsRequest,
  SetupWorkspaceNotificationSettingsRequest,
} from "../domains/notifications";
import { NotificationSetupService } from "../domains/notifications";
import { NotificationChannelsService } from "../domains/notifications/notification-channels.service";
import { NotificationSettingsService } from "../domains/notifications/notification-settings.service";
import { SchemasService } from "../domains/schemas/schemas.service";
import { UserService } from "../domains/user/user.service";
import {
  createValidationDomain,
  type ValidationDomain,
} from "../domains/validation/validation.facade";
import { ValidationCoreService } from "../domains/validation/validation-core.service";
import { ValidationRulesService } from "../domains/validation/validation-rules.service";
import { WorkflowsCoreService } from "../domains/workflows/workflows-core.service";
import { KadoaHttpException } from "../runtime/exceptions";
import { SDK_LANGUAGE, SDK_NAME, SDK_VERSION } from "../version";
import type { NotificationsApi } from "./apis.acl";
import type { KadoaClient } from "./kadoa-client";
import type {
  NotificationDomain,
  TestNotificationRequest,
  TestNotificationResult,
} from "./types";

export function createSdkHeaders(): Record<string, string> {
  return {
    "User-Agent": `${SDK_NAME}/${SDK_VERSION}`,
    "X-SDK-Version": SDK_VERSION,
    "X-SDK-Language": SDK_LANGUAGE,
  };
}

export function createAxiosInstance(params: {
  timeout: number;
  headers: Record<string, string>;
}): AxiosInstance {
  const axiosInstance = axios.create({
    timeout: params.timeout,
    headers: params.headers,
  });

  axiosInstance.interceptors.request.use((config) => {
    config.headers["x-request-id"] = v4();
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          throw KadoaHttpException.wrap(error, { message: "Unauthorized" });
        }
      }

      throw KadoaHttpException.wrap(error);
    },
  );

  return axiosInstance;
}

export function createClientDomains(params: { client: KadoaClient }): {
  extractionBuilderService: ExtractionBuilderService;
  extraction: ExtractionService;
  workflow: WorkflowsCoreService;
  notification: NotificationDomain;
  schema: SchemasService;
  user: UserService;
  validation: ValidationDomain;
  crawler: CrawlerDomain;
} {
  const { client } = params;

  const userService = new UserService(client);
  const dataFetcherService = new DataFetcherService(client.apis.workflows);
  const channelsService = new NotificationChannelsService(
    client.apis.notifications,
    userService,
  );
  const settingsService = new NotificationSettingsService(
    client.apis.notifications,
  );
  const entityResolverService = new EntityResolverService(client);
  const workflowsCoreService = new WorkflowsCoreService(client.apis.workflows);
  const schemasService = new SchemasService(client);
  const channelSetupService = new NotificationSetupService(
    channelsService,
    settingsService,
  );
  const coreService = new ValidationCoreService(client);
  const rulesService = new ValidationRulesService(client);

  const extractionService = new ExtractionService(
    workflowsCoreService,
    dataFetcherService,
    entityResolverService,
    channelSetupService,
    channelsService,
    settingsService,
  );

  const extractionBuilderService = new ExtractionBuilderService(
    workflowsCoreService,
    entityResolverService,
    dataFetcherService,
    channelSetupService,
  );

  const notification = createNotificationDomain({
    notificationsApi: client.apis.notifications,
    channelsService,
    settingsService,
    channelSetupService,
  });

  const validation = createValidationDomain(coreService, rulesService);
  const crawler = createCrawlerDomain(client);

  return {
    extractionBuilderService,
    extraction: extractionService,
    workflow: workflowsCoreService,
    notification,
    schema: schemasService,
    user: userService,
    validation,
    crawler,
  };
}

function createNotificationDomain(params: {
  notificationsApi: NotificationsApi;
  channelsService: NotificationChannelsService;
  settingsService: NotificationSettingsService;
  channelSetupService: NotificationSetupService;
}): NotificationDomain {
  const {
    notificationsApi,
    channelsService,
    settingsService,
    channelSetupService,
  } = params;

  return {
    channels: channelsService,
    settings: settingsService,
    setup: channelSetupService,
    configure: (options: NotificationOptions) =>
      channelSetupService.setup(options),
    setupForWorkflow: (request: SetupWorkflowNotificationSettingsRequest) =>
      channelSetupService.setupForWorkflow(request),
    setupForWorkspace: (request: SetupWorkspaceNotificationSettingsRequest) =>
      channelSetupService.setupForWorkspace(request),
    testNotification: async (
      request: TestNotificationRequest,
    ): Promise<TestNotificationResult> => {
      const response = await notificationsApi.v5NotificationsTestPost({
        v5NotificationsTestPostRequest: {
          eventType: request.eventType,
          ...(request.workflowId != null && {
            workflowId: request.workflowId,
          }),
        },
      });
      const data = response.data.data;
      if (!data?.eventId || !data?.eventType) {
        throw KadoaHttpException.wrap(response, {
          message: "Failed to test notification",
        });
      }
      return {
        eventId: data.eventId,
        eventType: data.eventType as NotificationSettingsEventType,
        ...(data.workflowId != null && { workflowId: data.workflowId }),
      };
    },
  };
}
