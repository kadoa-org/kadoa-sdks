import type { KadoaClient } from "../../client/kadoa-client";
import type { DataQualityRules } from "./data-quality.acl";

/**
 * Per-field data quality rules of a workflow.
 * Wraps `/v4/workflows/{workflowId}/schema-validation-rules`.
 * Rule edits take effect on the next workflow run.
 */
export class DataQualityService {
  constructor(private readonly client: KadoaClient) {}

  private get api() {
    return this.client.apis.dataQuality;
  }

  /**
   * Get the rules of a workflow, keyed by schema field name.
   * Returns `null` when the workflow has no rules.
   */
  async getRules(workflowId: string): Promise<DataQualityRules | null> {
    const response =
      await this.api.v4WorkflowsWorkflowIdSchemaValidationRulesGet({
        workflowId,
      });
    return response.data.rules;
  }

  /**
   * Replace the rules of the listed fields and leave every other field
   * untouched. Returns the merged ruleset.
   * To remove a field's rules, call {@link deleteFieldRules}.
   */
  async upsertRules(
    workflowId: string,
    rules: DataQualityRules,
  ): Promise<DataQualityRules> {
    const response =
      await this.api.v4WorkflowsWorkflowIdSchemaValidationRulesPut({
        workflowId,
        requestBody: rules,
      });
    return response.data.rules;
  }

  /**
   * Remove all rules of a single schema field. Returns the remaining ruleset.
   */
  async deleteFieldRules(
    workflowId: string,
    fieldName: string,
  ): Promise<DataQualityRules> {
    const response =
      await this.api.v4WorkflowsWorkflowIdSchemaValidationRulesFieldNameDelete({
        workflowId,
        fieldName,
      });
    return response.data.rules;
  }
}
