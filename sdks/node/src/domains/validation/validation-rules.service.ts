import type { KadoaClient } from "../../kadoa-client";
import { KadoaHttpException } from "../../runtime/exceptions";
import { logger } from "../../runtime/logger";
import {
  type BulkApproveRulesRequest,
  type BulkApproveRulesResponseData,
  type BulkDeleteRulesRequest,
  type BulkDeleteRulesResponseData,
  type CreateRuleRequest,
  DataValidationApi,
  type DeleteAllRulesRequest,
  type DeleteAllRulesResponseData,
  type DeleteRuleRequest,
  type DisableRuleRequest,
  type GenerateRuleRequest,
  type GenerateRulesRequest,
  type ListRulesRequest,
  type ListRulesResponse,
  type Rule,
  type RuleDeleteResponse,
  type UpdateRuleRequest,
} from "./validation.acl";

const _debug = logger.validation;

/**
 * Service for managing data validation rules
 */
export class ValidationRulesService {
  private readonly validationApi: DataValidationApi;

  constructor(client: KadoaClient) {
    this.validationApi = new DataValidationApi(
      client.configuration,
      client.baseUrl,
      client.axiosInstance,
    );
  }

  async listRules(options?: ListRulesRequest): Promise<ListRulesResponse> {
    const response = await this.validationApi.v4DataValidationRulesGet(options);
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: "Failed to list validation rules",
      });
    }
    return response.data;
  }

  async getRuleById(ruleId: string): Promise<Rule | undefined> {
    const response = await this.validationApi.v4DataValidationRulesRuleIdGet({
      ruleId,
    });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: "Failed to get validation rule by id",
      });
    }
    return response.data.data;
  }

  async getRuleByName(name: string): Promise<Rule | undefined> {
    const response = await this.validationApi.v4DataValidationRulesGet();
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: "Failed to get validation rule by name",
      });
    }
    //todo: solve pagination or add a search parameter at API
    return response.data.data?.find((rule) => rule.name === name);
  }

  async createRule(data: CreateRuleRequest): Promise<Rule> {
    const response = await this.validationApi.v4DataValidationRulesPost({
      createRule: data,
    });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: response.data.message || "Failed to create validation rule",
      });
    }
    return response.data.data;
  }

  async updateRule(
    ruleId: string,
    updateData: UpdateRuleRequest,
  ): Promise<Rule> {
    const response = await this.validationApi.v4DataValidationRulesRuleIdPut({
      ruleId,
      updateRule: updateData,
    });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: response.data.message || "Failed to update validation rule",
      });
    }
    return response.data.data;
  }

  async deleteRule(data: DeleteRuleRequest): Promise<RuleDeleteResponse> {
    const response = await this.validationApi.v4DataValidationRulesRuleIdDelete({
      ruleId: data.ruleId,
      ...(data.workflowId != null && {
        deleteRuleWithReason: {
          workflowId: data.workflowId,
          ...(data.reason != null && { reason: data.reason }),
        },
      }),
    });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data, {
        message: response.data.message || "Failed to delete validation rule",
      });
    }
    return response.data;
  }

  async disableRule(data: DisableRuleRequest): Promise<Rule> {
    const response =
      await this.validationApi.v4DataValidationRulesRuleIdDisablePost(data);
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: response.data.message || "Failed to disable validation rule",
      });
    }
    return response.data.data;
  }

  async generateRule(data: GenerateRuleRequest): Promise<Rule> {
    const response =
      await this.validationApi.v4DataValidationRulesActionsGeneratePost({
        generateRule: data,
      });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: response.data.message || "Failed to generate validation rule",
      });
    }
    return response.data.data;
  }

  async generateRules(data: GenerateRulesRequest): Promise<Rule[]> {
    const response =
      await this.validationApi.v4DataValidationRulesActionsGenerateRulesPost({
        generateRules: data,
      });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message: response.data.message || "Failed to generate validation rules",
      });
    }
    return response.data.data;
  }

  async bulkApproveRules(
    data: BulkApproveRulesRequest,
  ): Promise<BulkApproveRulesResponseData> {
    const response =
      await this.validationApi.v4DataValidationRulesActionsBulkApprovePost({
        bulkApproveRules: data,
      });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message:
          response.data.message || "Failed to bulk approve validation rules",
      });
    }
    return response.data.data;
  }

  async bulkDeleteRules(
    data: BulkDeleteRulesRequest,
  ): Promise<BulkDeleteRulesResponseData> {
    const response =
      await this.validationApi.v4DataValidationRulesActionsBulkDeletePost({
        bulkDeleteRules: data,
      });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message:
          response.data.message || "Failed to bulk delete validation rules",
      });
    }
    return response.data.data;
  }

  async deleteAllRules(
    data: DeleteAllRulesRequest,
  ): Promise<DeleteAllRulesResponseData> {
    const response =
      await this.validationApi.v4DataValidationRulesActionsDeleteAllDelete({
        deleteRuleWithReason: data,
      });
    if (response.status !== 200 || response.data.error) {
      throw KadoaHttpException.wrap(response.data.data, {
        message:
          response.data.message || "Failed to delete all validation rules",
      });
    }
    return response.data.data;
  }
}
