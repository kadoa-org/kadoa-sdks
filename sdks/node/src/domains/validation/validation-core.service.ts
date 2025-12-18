import type { AxiosResponse } from "axios";
import type { KadoaClient } from "../../kadoa-client";
import {
  KadoaHttpException,
  KadoaSdkException,
} from "../../runtime/exceptions";
import { type PollingOptions, pollUntil } from "../../runtime/utils";
import {
  type GetAnomaliesByRuleResponse,
  type GetAnomalyRulePageResponse,
  type GetValidationResponse,
  type ListValidationsResponse,
  type ListWorkflowValidationsRequest,
  type ScheduleValidationResponse,
  type ToggleValidationResponse,
} from "./validation.acl";

export class ValidationCoreService {
  constructor(private readonly client: KadoaClient) {}

  private get validationApi() {
    return this.client.apis.validation;
  }

  async listWorkflowValidations(
    filters: ListWorkflowValidationsRequest,
  ): Promise<ListValidationsResponse> {
    const response =
      await this.validationApi.v4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsGet(
        filters,
      );

    if (response.status !== 200) {
      throw KadoaHttpException.wrap(response.data, {
        message: "Failed to list workflow validations",
      });
    }

    return response.data;
  }

  async getValidationDetails(
    validationId: string,
  ): Promise<GetValidationResponse> {
    const response =
      await this.validationApi.v4DataValidationValidationsValidationIdGet({
        validationId,
      });

    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data, {
        message: "Failed to get validation details",
      });
    }

    return response.data;
  }

  async scheduleValidation(
    workflowId: string,
    jobId: string,
  ): Promise<ScheduleValidationResponse> {
    const response =
      await this.validationApi.v4DataValidationWorkflowsWorkflowIdJobsJobIdValidatePost(
        {
          workflowId,
          jobId,
        },
      );

    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data, {
        message: response.data.message || "Failed to schedule validation",
      });
    }

    return response.data;
  }

  async toggleValidationEnabled(
    workflowId: string,
  ): Promise<ToggleValidationResponse> {
    const response =
      await this.validationApi.v4DataValidationWorkflowsWorkflowIdValidationTogglePut(
        {
          workflowId,
        },
      );

    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data, {
        message: response.data.message || "Failed to toggle validation",
      });
    }

    return response.data;
  }

  async getLatestValidation(
    workflowId: string,
    jobId?: string,
  ): Promise<GetValidationResponse> {
    let response: AxiosResponse<GetValidationResponse>;
    if (jobId) {
      response =
        await this.validationApi.v4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsLatestGet(
          {
            workflowId,
            jobId,
          },
        );
    } else {
      response =
        await this.validationApi.v4DataValidationWorkflowsWorkflowIdValidationsLatestGet(
          {
            workflowId,
          },
        );
    }

    if (response.status !== 200 || response.data?.error) {
      throw KadoaHttpException.wrap(response.data, {
        message: "Failed to get latest validation",
      });
    }

    return response.data;
  }

  async getValidationAnomalies(
    validationId: string,
  ): Promise<GetAnomaliesByRuleResponse> {
    const response =
      await this.validationApi.v4DataValidationValidationsValidationIdAnomaliesGet(
        {
          validationId,
        },
      );

    if (response.status !== 200) {
      throw KadoaHttpException.wrap(response.data, {
        message: "Failed to get validation anomalies",
      });
    }

    return response.data;
  }

  async getValidationAnomaliesByRule(
    validationId: string,
    ruleName: string,
  ): Promise<GetAnomalyRulePageResponse> {
    const response =
      await this.validationApi.v4DataValidationValidationsValidationIdAnomaliesRulesRuleNameGet(
        {
          validationId,
          ruleName,
        },
      );
    if (response.status !== 200) {
      throw KadoaHttpException.wrap(response.data, {
        message: "Failed to get validation anomalies by rule",
      });
    }

    return response.data;
  }

  async waitUntilCompleted(
    validationId: string,
    options?: PollingOptions,
  ): Promise<GetValidationResponse> {
    // Initial delay to allow validation record creation after scheduling
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = await pollUntil(
      async () => {
        const current = await this.getValidationDetails(validationId);

        // Check if validation has an error
        if (current.error) {
          throw new KadoaSdkException(`Validation failed: ${current.error}`, {
            code: "VALIDATION_ERROR",
            details: { validationId, error: current.error },
          });
        }

        return current;
      },
      (result) => result.completedAt != null,
      options,
    );

    return result.result;
  }
}
