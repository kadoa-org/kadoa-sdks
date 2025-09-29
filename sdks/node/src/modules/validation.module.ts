import type { ValidationRulesService } from "../internal/domains/validation/validation-rules.service";
import type {
	BulkApproveRulesResponseData,
	BulkApproveRulesOptions,
	BulkDeleteRulesResponseData,
	BulkDeleteRulesOptions,
	DeleteAllRulesOptions,
	CreateRuleOptions,
	GenerateRuleOptions,
	GenerateRulesOptions,
	ListRulesOptions,
	RulesListResponse,
	DeleteAllRulesResponseData,
	Rule,
} from "../internal/domains/validation/validation-rules.service";
import type {
	AnomaliesByRuleResponse,
	AnomalyRulePageResponse,
	DataValidationReport,
	ScheduleValidationResponse,
	ToggleResponse,
	ValidationCoreService,
	ValidationListResponse,
	WaitUntilCompletedOptions,
} from "../internal/domains/validation/validation-core.service";

export class ValidationModule {
	constructor(
		private readonly coreService: ValidationCoreService,
		private readonly rulesService: ValidationRulesService,
	) {}

	listRules(options?: ListRulesOptions): Promise<RulesListResponse> {
		return this.rulesService.listRules(options);
	}
	getRuleByName(name: string): Promise<Rule | undefined> {
		return this.rulesService.getRuleByName(name);
	}

	createRule(data: CreateRuleOptions): Promise<Rule> {
		return this.rulesService.createRule(data);
	}

	generateRule(data: GenerateRuleOptions): Promise<Rule> {
		return this.rulesService.generateRule(data);
	}

	generateRules(data: GenerateRulesOptions): Promise<Rule[]> {
		return this.rulesService.generateRules(data);
	}

	bulkApproveRules(
		data: BulkApproveRulesOptions,
	): Promise<BulkApproveRulesResponseData> {
		return this.rulesService.bulkApproveRules(data);
	}

	bulkDeleteRules(
		data: BulkDeleteRulesOptions,
	): Promise<BulkDeleteRulesResponseData> {
		return this.rulesService.bulkDeleteRules(data);
	}

	deleteAllRules(
		data: DeleteAllRulesOptions,
	): Promise<DeleteAllRulesResponseData> {
		return this.rulesService.deleteAllRules(data);
	}

	listWorkflowValidations(
		workflowId: string,
		jobId: string,
	): Promise<ValidationListResponse> {
		return this.coreService.listWorkflowValidations({ workflowId, jobId });
	}

	scheduleValidation(
		workflowId: string,
		jobId: string,
	): Promise<ScheduleValidationResponse> {
		return this.coreService.scheduleValidation(workflowId, jobId);
	}

	waitUntilCompleted(
		validationId: string,
		options?: WaitUntilCompletedOptions,
	): Promise<DataValidationReport> {
		return this.coreService.waitUntilCompleted(validationId, options);
	}

	getValidationDetails(validationId: string): Promise<DataValidationReport> {
		return this.coreService.getValidationDetails(validationId);
	}

	getLatestValidation(
		workflowId: string,
		jobId?: string,
	): Promise<DataValidationReport> {
		return this.coreService.getLatestValidation(workflowId, jobId);
	}

	getValidationAnomalies(
		validationId: string,
	): Promise<AnomaliesByRuleResponse> {
		return this.coreService.getValidationAnomalies(validationId);
	}

	getValidationAnomaliesByRule(
		validationId: string,
		ruleName: string,
	): Promise<AnomalyRulePageResponse> {
		return this.coreService.getValidationAnomaliesByRule(
			validationId,
			ruleName,
		);
	}

	toggleValidationEnabled(workflowId: string): Promise<ToggleResponse> {
		return this.coreService.toggleValidationEnabled(workflowId);
	}
}
