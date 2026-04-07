import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import {
  ERROR_MESSAGES,
  KadoaErrorCode,
} from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import type {
  ApplyTemplateUpdateRequest,
  ApplyTemplateUpdateResult,
  CreateTemplateRequest,
  CreateTemplateVersionRequest,
  LinkWorkflowsRequest,
  LinkWorkflowsResult,
  SaveFromWorkflowRequest,
  SaveFromWorkflowResult,
  Template,
  TemplateDetail,
  TemplateListItem,
  TemplateSchema,
  TemplateVersion,
  TemplateWorkflow,
  UnlinkWorkflowsRequest,
  UnlinkWorkflowsResult,
  UpdateTemplateRequest,
} from "./templates.acl";

const debug = logger.templates;

/**
 * Service for managing templates.
 * Templates define reusable configurations (prompt, schema, validation,
 * notifications) that can be linked to multiple workflows and versioned.
 */
export class TemplatesService {
  constructor(private readonly client: KadoaClient) {}

  private get templatesApi() {
    return this.client.apis.templates;
  }

  /**
   * List all active templates for the current team.
   */
  async list(): Promise<TemplateListItem[]> {
    debug("Listing all templates");

    const response = await this.templatesApi.v4TemplatesGet();
    return response.data.data ?? [];
  }

  /**
   * Get a template by ID, including all published versions.
   */
  async get(templateId: string): Promise<TemplateDetail> {
    debug("Fetching template with ID: %s", templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdGet({
      templateId,
    });

    const template = response.data.data;

    if (!template) {
      throw new KadoaSdkException(
        `${ERROR_MESSAGES.TEMPLATE_NOT_FOUND}: ${templateId}`,
        {
          code: KadoaErrorCode.NOT_FOUND,
          details: { templateId },
        },
      );
    }

    return template;
  }

  /**
   * Create a new template.
   */
  async create(body: CreateTemplateRequest): Promise<Template> {
    debug("Creating template with name: %s", body.name);

    const response = await this.templatesApi.v4TemplatesPost({
      createTemplateBody: body,
    });

    const template = response.data.data;

    if (!template) {
      throw new KadoaSdkException(ERROR_MESSAGES.TEMPLATE_CREATE_FAILED, {
        code: KadoaErrorCode.INTERNAL_ERROR,
      });
    }

    return template;
  }

  /**
   * Update a template's name or description.
   */
  async update(
    templateId: string,
    body: UpdateTemplateRequest,
  ): Promise<Template> {
    debug("Updating template with ID: %s", templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdPut({
      templateId,
      updateTemplateBody: body,
    });

    const template = response.data.data;

    if (!template) {
      throw new KadoaSdkException(
        `${ERROR_MESSAGES.TEMPLATE_UPDATE_FAILED}: ${templateId}`,
        {
          code: KadoaErrorCode.INTERNAL_ERROR,
          details: { templateId },
        },
      );
    }

    return template;
  }

  /**
   * Delete (archive) a template. Existing workflows are unaffected.
   */
  async delete(templateId: string): Promise<void> {
    debug("Deleting template with ID: %s", templateId);

    await this.templatesApi.v4TemplatesTemplateIdDelete({
      templateId,
    });
  }

  /**
   * Publish a new version of a template.
   */
  async createVersion(
    templateId: string,
    body: CreateTemplateVersionRequest,
  ): Promise<TemplateVersion> {
    debug("Creating version for template: %s", templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdVersionsPost({
      templateId,
      createTemplateVersionBody: body,
    });

    const version = response.data.data;

    if (!version) {
      throw new KadoaSdkException(
        `${ERROR_MESSAGES.TEMPLATE_VERSION_CREATE_FAILED}: ${templateId}`,
        {
          code: KadoaErrorCode.INTERNAL_ERROR,
          details: { templateId },
        },
      );
    }

    return version;
  }

  /**
   * List schemas associated with a template.
   */
  async listSchemas(templateId: string): Promise<TemplateSchema[]> {
    debug("Listing schemas for template: %s", templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdSchemasGet({
      templateId,
    });

    return response.data.data ?? [];
  }

  /**
   * List workflows linked to a template.
   */
  async listWorkflows(templateId: string): Promise<TemplateWorkflow[]> {
    debug("Listing workflows for template: %s", templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdWorkflowsGet({
      templateId,
    });

    return response.data.data ?? [];
  }

  /**
   * Link workflows to a template.
   */
  async linkWorkflows(
    templateId: string,
    body: LinkWorkflowsRequest,
  ): Promise<LinkWorkflowsResult> {
    debug("Linking %d workflows to template: %s", body.workflowIds.length, templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdLinkPost({
      templateId,
      linkWorkflowsBody: body,
    });

    return response.data;
  }

  /**
   * Unlink workflows from a template.
   */
  async unlinkWorkflows(
    templateId: string,
    body: UnlinkWorkflowsRequest,
  ): Promise<UnlinkWorkflowsResult> {
    debug("Unlinking %d workflows from template: %s", body.workflowIds.length, templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdUnlinkPost({
      templateId,
      unlinkWorkflowsBody: body,
    });

    return response.data;
  }

  /**
   * Apply a template version update to specific workflows.
   */
  async applyUpdate(
    templateId: string,
    body: ApplyTemplateUpdateRequest,
  ): Promise<ApplyTemplateUpdateResult> {
    debug("Applying version %d to %d workflows for template: %s", body.targetVersion, body.workflowIds.length, templateId);

    const response = await this.templatesApi.v4TemplatesTemplateIdApplyPost({
      templateId,
      applyTemplateUpdateBody: body,
    });

    return response.data;
  }

  /**
   * Save a workflow's configuration as a new template or new version of an existing template.
   */
  async createFromWorkflow(body: SaveFromWorkflowRequest): Promise<SaveFromWorkflowResult> {
    debug("Creating template from workflow: %s", body.workflowId);

    const response = await this.templatesApi.v4TemplatesFromWorkflowPost({
      saveFromWorkflowBody: body,
    });

    const result = response.data.data;

    if (!result) {
      throw new KadoaSdkException(
        ERROR_MESSAGES.TEMPLATE_FROM_WORKFLOW_FAILED,
        {
          code: KadoaErrorCode.INTERNAL_ERROR,
          details: { workflowId: body.workflowId },
        },
      );
    }

    return result;
  }
}
