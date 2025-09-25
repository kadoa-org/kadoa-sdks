import type { AxiosResponse } from "axios";
import {
	DataValidationApi,
	type DataValidationApiV4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsGetRequest,
	type ValidationListResponse,
	type DataValidationReport,
	type V4DataValidationWorkflowsWorkflowIdValidationTogglePut200Response,
	type ScheduleValidationResponse,
	type AnomaliesByRuleResponse,
	type AnomalyRulePageResponse,
} from "../../../generated";
import type { KadoaClient } from "../../../kadoa-client";
import {
	KadoaHttpException,
	KadoaSdkException,
} from "../../runtime/exceptions";
import { pollUntil, type PollingOptions } from "../../runtime/utils";

type ToggleResponse =
	V4DataValidationWorkflowsWorkflowIdValidationTogglePut200Response;

type ListWorkflowValidationsOptions =
	DataValidationApiV4DataValidationWorkflowsWorkflowIdJobsJobIdValidationsGetRequest;

type WaitUntilCompletedOptions = PollingOptions;

export type {
	ToggleResponse,
	ListWorkflowValidationsOptions,
	ValidationListResponse,
	DataValidationReport,
	ScheduleValidationResponse,
	AnomaliesByRuleResponse,
	AnomalyRulePageResponse,
	WaitUntilCompletedOptions,
};

export class ValidationCoreService {
	private readonly validationApi: DataValidationApi;

	constructor(client: KadoaClient) {
		this.validationApi = new DataValidationApi(
			client.configuration,
			client.baseUrl,
			client.axiosInstance,
		);
	}

	async listWorkflowValidations(
		filters: ListWorkflowValidationsOptions,
	): Promise<ValidationListResponse> {
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
	): Promise<DataValidationReport> {
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

	async toggleValidationEnabled(workflowId: string): Promise<ToggleResponse> {
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
	): Promise<DataValidationReport> {
		let response: AxiosResponse<DataValidationReport>;
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

		if (response.status !== 200 || response.data.error) {
			throw KadoaHttpException.wrap(response.data, {
				message: "Failed to get latest validation",
			});
		}

		return response.data;
	}

	async getValidationAnomalies(
		validationId: string,
	): Promise<AnomaliesByRuleResponse> {
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
	): Promise<AnomalyRulePageResponse> {
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
		options?: WaitUntilCompletedOptions,
	): Promise<DataValidationReport> {
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
