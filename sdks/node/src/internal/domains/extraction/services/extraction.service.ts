import { merge } from "es-toolkit";
import type {
	MonitoringConfig,
	V4WorkflowsWorkflowIdGet200Response,
} from "../../../../generated";
import { KadoaSdkException } from "../../../runtime/exceptions";
import { ERROR_MESSAGES } from "../../../runtime/exceptions/base.exception";
import type { PageInfo } from "../../../runtime/pagination";
import type { WorkflowsCoreService } from "../../workflows/workflows-core.service";
import type {
	NavigationMode,
	LocationConfig,
	WorkflowInterval,
} from "../extraction.types";
import type { DataFetcherService } from "./data-fetcher.service";
import type {
	EntityResolverService,
	EntityConfig,
} from "./entity-resolver.service";
import type {
	NotificationSetupService,
	NotificationOptions,
} from "../../notifications/notification-setup.service";
import { logger } from "../../../runtime/logger";

const debug = logger.extraction;

export interface ExtractionOptionsInternal {
	urls: string[];
	prompt?: string;
	mode: "run" | "submit";
	navigationMode: NavigationMode;
	name: string;
	description?: string;
	location: LocationConfig;
	bypassPreview?: boolean;
	pollingInterval: number;
	maxWaitTime: number;
	entity: EntityConfig;
	interval?: WorkflowInterval;
	monitoring?: MonitoringConfig;
	tags?: string[];
	notifications?: NotificationOptions;
	autoStart?: boolean;
}

export type ExtractionOptions = {
	urls: string[];
} & Partial<Omit<ExtractionOptionsInternal, "urls">>;

export interface ExtractionResult {
	workflowId: string;
	workflow?: V4WorkflowsWorkflowIdGet200Response;
	data?: Array<object>;
	pagination?: PageInfo;
}

export interface SubmitExtractionResult {
	workflowId: string;
	needsNotificationSetup?: boolean;
}

// Use TERMINAL_RUN_STATES from WorkflowsCoreService for consistency
const SUCCESSFUL_RUN_STATES = new Set(["FINISHED", "SUCCESS"]);

export const DEFAULT_OPTIONS: Omit<
	ExtractionOptionsInternal,
	"urls" | "entity" | "fields" | "description"
> = {
	mode: "run",
	pollingInterval: 5000,
	maxWaitTime: 300000,
	navigationMode: "single-page",
	location: { type: "auto" },
	name: "Untitled Workflow",
	bypassPreview: true,
	autoStart: true,
} as const;
/**
 * Service for managing extraction workflows and data fetching
 */
export class ExtractionService {
	constructor(
		private readonly workflowsCoreService: WorkflowsCoreService,
		private readonly dataFetcherService: DataFetcherService,
		private readonly entityResolverService: EntityResolverService,
		private readonly notificationSetupService: NotificationSetupService,
	) {}

	/**
	 * execute extraction workflow
	 */
	async executeExtraction(
		options: ExtractionOptions,
	): Promise<ExtractionResult | SubmitExtractionResult> {
		this.validateOptions(options);

		const config: Omit<ExtractionOptionsInternal, "entity" | "fields"> = merge(
			DEFAULT_OPTIONS,
			options,
		);

		let workflowId: string;

		const resolvedEntity = await this.entityResolverService.resolveEntity(
			options.entity || "ai-detection",
			{
				link: config.urls[0],
				location: config.location,
				navigationMode: config.navigationMode,
			},
		);

		const hasNotifications = !!config.notifications;

		const result = await this.workflowsCoreService.create({
			...config,
			entity: resolvedEntity.entity,
			fields: resolvedEntity.fields,
		});
		workflowId = result.id;

		if (hasNotifications) {
			//note: for now we rely on the fact that notifcations will be setup faster than first event is emitted
			// in few days, we should be able to create workflow without starting it immediately so we will be 100%
			//  sure that notifications are setup before first event is emitted
			const result = await this.notificationSetupService.setup({
				workflowId,
				events: config.notifications?.events,
				channels: config.notifications?.channels,
			});
			debug(
				"Notifications setup: %O",
				result.map((r) => ({ id: r.id, eventType: r.eventType })),
			);
		}

		if (config.mode === "submit") {
			return {
				workflowId,
			};
		}

		const workflow = await this.workflowsCoreService.wait(workflowId, {
			pollIntervalMs: config.pollingInterval,
			timeoutMs: config.maxWaitTime,
		});

		let data: Array<object> | undefined;
		let pagination: PageInfo | undefined;
		const isSuccess = this.isExtractionSuccessful(workflow.runState);

		if (isSuccess) {
			const dataPage = await this.dataFetcherService.fetchData({ workflowId });
			data = dataPage.data;
			pagination = dataPage.pagination;
		} else {
			throw new KadoaSdkException(
				`${ERROR_MESSAGES.WORKFLOW_UNEXPECTED_STATUS}: ${workflow.runState}`,
				{
					code: "INTERNAL_ERROR",
					details: {
						workflowId,
						runState: workflow.runState,
						state: workflow.state,
					},
				},
			);
		}

		return {
			workflowId,
			workflow,
			data,
			pagination,
		};
	}

	/**
	 * Validates extraction options
	 */
	private validateOptions(options: ExtractionOptions): void {
		if (!options.urls || options.urls.length === 0) {
			throw new KadoaSdkException(ERROR_MESSAGES.NO_URLS, {
				code: "VALIDATION_ERROR",
			});
		}
	}

	/**
	 * Resume a workflow after notification setup
	 */
	async resumeWorkflow(workflowId: string): Promise<ExtractionResult> {
		await this.workflowsCoreService.resume(workflowId);

		const workflow = await this.workflowsCoreService.wait(workflowId, {
			pollIntervalMs: DEFAULT_OPTIONS.pollingInterval,
			timeoutMs: DEFAULT_OPTIONS.maxWaitTime,
		});

		let data: Array<object> | undefined;
		let pagination: PageInfo | undefined;
		const isSuccess = this.isExtractionSuccessful(workflow.runState);

		if (isSuccess) {
			const dataPage = await this.dataFetcherService.fetchData({ workflowId });
			data = dataPage.data;
			pagination = dataPage.pagination;
		} else {
			throw new KadoaSdkException(
				`${ERROR_MESSAGES.WORKFLOW_UNEXPECTED_STATUS}: ${workflow.runState}`,
				{
					code: "INTERNAL_ERROR",
					details: {
						workflowId,
						runState: workflow.runState,
						state: workflow.state,
					},
				},
			);
		}

		return {
			workflowId,
			workflow,
			data,
			pagination,
		};
	}

	/**
	 * Checks if extraction was successful
	 */
	private isExtractionSuccessful(runState: string | undefined): boolean {
		return runState ? SUCCESSFUL_RUN_STATES.has(runState.toUpperCase()) : false;
	}
}
