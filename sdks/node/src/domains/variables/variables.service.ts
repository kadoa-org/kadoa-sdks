import type { KadoaClient } from "../../kadoa-client";
import { KadoaSdkException } from "../../runtime/exceptions";
import {
  ERROR_MESSAGES,
  KadoaErrorCode,
} from "../../runtime/exceptions/base.exception";
import { logger } from "../../runtime/logger";
import type {
  CreateVariableRequest,
  UpdateVariableRequest,
  Variable,
} from "./variables.acl";

const debug = logger.variables;

/**
 * Service for managing variables.
 * Variables are key-value pairs that can be referenced in workflow prompts
 * using @variableKey syntax.
 */
export class VariablesService {
  constructor(private readonly client: KadoaClient) {}

  private get variablesApi() {
    return this.client.apis.variables;
  }

  /**
   * List all variables in the current team scope.
   */
  async list(): Promise<Variable[]> {
    const response = await this.variablesApi.v4VariablesGet();
    return response.data.variables ?? [];
  }

  /**
   * Get a variable by ID.
   */
  async get(variableId: string): Promise<Variable> {
    debug("Fetching variable with ID: %s", variableId);

    const response = await this.variablesApi.v4VariablesVariableIdGet({
      variableId,
    });

    const variable = response.data.variable;

    if (!variable) {
      throw new KadoaSdkException(
        `${ERROR_MESSAGES.VARIABLE_NOT_FOUND}: ${variableId}`,
        {
          code: KadoaErrorCode.NOT_FOUND,
          details: { variableId },
        },
      );
    }

    return variable;
  }

  /**
   * Create a new variable.
   */
  async create(body: CreateVariableRequest): Promise<Variable> {
    debug("Creating variable with key: %s", body.key);

    const response = await this.variablesApi.v4VariablesPost({
      createVariableBody: body,
    });

    const variable = response.data.variable;

    if (!variable) {
      throw new KadoaSdkException(ERROR_MESSAGES.VARIABLE_CREATE_FAILED, {
        code: KadoaErrorCode.INTERNAL_ERROR,
      });
    }

    return variable;
  }

  /**
   * Update an existing variable.
   */
  async update(
    variableId: string,
    body: UpdateVariableRequest,
  ): Promise<Variable> {
    debug("Updating variable with ID: %s", variableId);

    const response = await this.variablesApi.v4VariablesVariableIdPatch({
      variableId,
      updateVariableBody: body,
    });

    const variable = response.data.variable;

    if (!variable) {
      throw new KadoaSdkException(
        `${ERROR_MESSAGES.VARIABLE_UPDATE_FAILED}: ${variableId}`,
        {
          code: KadoaErrorCode.INTERNAL_ERROR,
          details: { variableId },
        },
      );
    }

    return variable;
  }

  /**
   * Delete a variable by ID.
   */
  async delete(variableId: string): Promise<void> {
    debug("Deleting variable with ID: %s", variableId);

    await this.variablesApi.v4VariablesVariableIdDelete({
      variableId,
    });
  }
}
