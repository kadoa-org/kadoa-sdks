import { DataValidationApi } from "../../../generated";
import type {
	RulesListResponse,
	DataValidationApiV4DataValidationRulesGetRequest,
	Rule,
	DataValidationApiV4DataValidationRulesPostRequest,
	DataValidationApiV4DataValidationRulesActionsGeneratePostRequest,
	DataValidationApiV4DataValidationRulesActionsGenerateRulesPostRequest,
	BulkApproveRulesResponse,
	BulkDeleteRulesResponse,
	DataValidationApiV4DataValidationRulesActionsBulkDeletePostRequest,
	DataValidationApiV4DataValidationRulesActionsBulkApprovePostRequest,
	DataValidationApiV4DataValidationRulesRuleIdPutRequest,
	DeleteAllRulesResponse,
	DataValidationApiV4DataValidationRulesActionsDeleteAllDeleteRequest,
	DataValidationApiV4DataValidationRulesRuleIdDisablePostRequest,
} from "../../../generated";
import type { KadoaClient } from "../../../kadoa-client";
import { KadoaHttpException } from "../../runtime/exceptions";
import { logger } from "../../runtime/logger";

const debug = logger.validation;

type ListRulesOptions = DataValidationApiV4DataValidationRulesGetRequest;
type CreateRuleOptions =
	DataValidationApiV4DataValidationRulesPostRequest["createRule"];
type GenerateRuleOptions =
	DataValidationApiV4DataValidationRulesActionsGeneratePostRequest["generateRule"];
type GenerateRulesOptions =
	DataValidationApiV4DataValidationRulesActionsGenerateRulesPostRequest["generateRules"];
type UpdateRuleOptions =
	DataValidationApiV4DataValidationRulesRuleIdPutRequest["updateRule"];
type DisableRuleOptions =
	DataValidationApiV4DataValidationRulesRuleIdDisablePostRequest;

type BulkApproveRulesOptions =
	DataValidationApiV4DataValidationRulesActionsBulkApprovePostRequest["bulkApproveRules"];
type BulkDeleteRulesOptions =
	DataValidationApiV4DataValidationRulesActionsBulkDeletePostRequest["bulkDeleteRules"];
type DeleteAllRulesOptions =
	DataValidationApiV4DataValidationRulesActionsDeleteAllDeleteRequest["deleteRuleWithReason"];

type BulkApproveRulesResponseData = BulkApproveRulesResponse["data"];
type BulkDeleteRulesResponseData = BulkDeleteRulesResponse["data"];
type DeleteAllRulesResponseData = DeleteAllRulesResponse["data"];

export type {
	Rule,
	CreateRuleOptions,
	ListRulesOptions,
	RulesListResponse,
	GenerateRuleOptions,
	GenerateRulesOptions,
	UpdateRuleOptions,
	BulkApproveRulesOptions,
	BulkDeleteRulesOptions,
	BulkApproveRulesResponseData,
	BulkDeleteRulesResponseData,
	DeleteAllRulesResponseData,
	DeleteAllRulesOptions,
};

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

	async listRules(options?: ListRulesOptions): Promise<RulesListResponse> {
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

	async createRule(data: CreateRuleOptions): Promise<Rule> {
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
		updateData: UpdateRuleOptions,
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

	async disableRule(data: DisableRuleOptions): Promise<Rule> {
		const response =
			await this.validationApi.v4DataValidationRulesRuleIdDisablePost(data);
		if (response.status !== 200 || response.data.error) {
			throw KadoaHttpException.wrap(response.data.data, {
				message: response.data.message || "Failed to disable validation rule",
			});
		}
		return response.data.data;
	}

	async generateRule(data: GenerateRuleOptions): Promise<Rule> {
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

	async generateRules(data: GenerateRulesOptions): Promise<Rule[]> {
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
		data: BulkApproveRulesOptions,
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
		data: BulkDeleteRulesOptions,
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
		data: DeleteAllRulesOptions,
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
