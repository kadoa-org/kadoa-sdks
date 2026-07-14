/**
 * TS-TEMPLATES: templates/overview.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { getTestEnv } from "../../utils/env";
import { seedWorkflow } from "../../utils/seeder";

describe("TS-TEMPLATES: templates/overview.mdx snippets", () => {
  let client: KadoaClient;
  const templateIds = new Set<string>();
  const workflowIds = new Set<string>();

  beforeAll(() => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
  });

  afterAll(async () => {
    try {
      const results = await Promise.allSettled([
        ...[...templateIds].map((templateId) =>
          client.template.delete(templateId),
        ),
        ...[...workflowIds].map((workflowId) =>
          client.workflow.delete(workflowId),
        ),
      ]);
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (failures.length > 0) {
        throw new AggregateError(
          failures.map((failure) => failure.reason),
          "Failed to delete one or more template fixtures",
        );
      }
    } finally {
      client?.dispose?.();
    }
  });

  test("TS-TEMPLATES-001: create a template", async () => {
    // @docs-preamble TS-TEMPLATES-001
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-TEMPLATES-001

    // @docs-start TS-TEMPLATES-001
    const template = await client.template.create({
      name: "Job Listing",
      description: "Extracts job postings with title, company, and location",
    });

    console.log("Template created:", template.id);
    // @docs-end TS-TEMPLATES-001

    templateIds.add(template.id);
    expect(template.id).toBeDefined();
  });

  test("TS-TEMPLATES-002: list templates", async () => {
    // @docs-preamble TS-TEMPLATES-002
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // @docs-preamble-end TS-TEMPLATES-002

    // @docs-start TS-TEMPLATES-002
    const templates = await client.template.list();

    for (const template of templates) {
      console.log(`${template.id}: ${template.name}`);
    }
    // @docs-end TS-TEMPLATES-002

    expect(Array.isArray(templates)).toBe(true);
  });

  test("TS-TEMPLATES-003: get a template", async () => {
    const created = await client.template.create({
      name: `docs-template-get-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-003
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-003

    // @docs-start TS-TEMPLATES-003
    const template = await client.template.get(templateId);

    console.log(template.name);
    console.log(template.description);
    console.log(template.versions);
    // @docs-end TS-TEMPLATES-003

    expect(template.id).toBe(templateId);
  });

  test("TS-TEMPLATES-004: update a template", async () => {
    const created = await client.template.create({
      name: `docs-template-update-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-004
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-004

    // @docs-start TS-TEMPLATES-004
    const updated = await client.template.update(templateId, {
      name: "Updated Job Listing",
      description: "Now includes salary range",
    });

    console.log("Template updated:", updated.id);
    // @docs-end TS-TEMPLATES-004

    expect(updated.id).toBe(templateId);
  });

  test("TS-TEMPLATES-005: delete a template", async () => {
    const created = await client.template.create({
      name: `docs-template-delete-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-005
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-005

    // @docs-start TS-TEMPLATES-005
    await client.template.delete(templateId);
    // @docs-end TS-TEMPLATES-005

    await expect(client.template.get(templateId)).rejects.toThrow();
    templateIds.delete(templateId);
  });

  test("TS-TEMPLATES-006: publish a template version", async () => {
    const created = await client.template.create({
      name: `docs-template-version-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-006
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-006

    // @docs-start TS-TEMPLATES-006
    const version = await client.template.createVersion(templateId, {
      prompt: "Extract job listings including salary information",
      schemaEntity: "JobListing",
      schemaFields: [
        {
          name: "title",
          description: "Job title",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Software Engineer",
        },
        {
          name: "company",
          description: "Company name",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "Example Company",
        },
        {
          name: "salary",
          description: "Salary range",
          fieldType: "SCHEMA",
          dataType: "STRING",
          example: "$100,000-$120,000",
        },
      ],
    });

    console.log("Published version:", version.version);
    // @docs-end TS-TEMPLATES-006

    expect(version.version).toBeDefined();
  });

  test("TS-TEMPLATES-009: list linked workflows", async () => {
    const created = await client.template.create({
      name: `docs-template-workflows-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-009
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-009

    // @docs-start TS-TEMPLATES-009
    const workflows = await client.template.getLinkedWorkflows(templateId);

    for (const workflow of workflows) {
      console.log(
        `${workflow.workflowId}: ${workflow.workflowName} (version ${workflow.templateVersion})`,
      );
    }
    // @docs-end TS-TEMPLATES-009

    expect(Array.isArray(workflows)).toBe(true);
  });

  test("TS-TEMPLATES-011: create a template from a workflow", async () => {
    const { workflowId } = await seedWorkflow(
      { name: `docs-template-from-workflow-${Date.now()}` },
      client,
    );
    workflowIds.add(workflowId);

    // @docs-preamble TS-TEMPLATES-011
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // @docs-preamble-end TS-TEMPLATES-011

    // @docs-start TS-TEMPLATES-011
    const newTemplate = await client.template.createFromWorkflow({
      workflowId,
      name: "Product Scraper",
      description: "Created from existing product extraction workflow",
    });

    console.log("Template created:", newTemplate.templateId);
    console.log("Version:", newTemplate.version);
    // @docs-end TS-TEMPLATES-011

    templateIds.add(newTemplate.templateId);
    expect(newTemplate.templateId).toBeDefined();
  });

  test("TS-TEMPLATES-012: add a version from a workflow", async () => {
    const { workflowId } = await seedWorkflow(
      { name: `docs-template-add-version-${Date.now()}` },
      client,
    );
    workflowIds.add(workflowId);
    const created = await client.template.create({
      name: `docs-template-existing-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-012
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const workflowId = "YOUR_WORKFLOW_ID";
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-012

    // @docs-start TS-TEMPLATES-012
    const newVersion = await client.template.createFromWorkflow({
      workflowId,
      templateId,
    });

    console.log("New version added:", newVersion.version);
    // @docs-end TS-TEMPLATES-012

    expect(newVersion.version).toBeDefined();
  });

  test("TS-TEMPLATES-013: list template schemas", async () => {
    const created = await client.template.create({
      name: `docs-template-schemas-${Date.now()}`,
    });
    templateIds.add(created.id);
    const templateId = created.id;

    // @docs-preamble TS-TEMPLATES-013
    // import { KadoaClient } from "@kadoa/node-sdk";
    //
    // const client = new KadoaClient({ apiKey: "YOUR_API_KEY" });
    // const templateId = "YOUR_TEMPLATE_ID";
    // @docs-preamble-end TS-TEMPLATES-013

    // @docs-start TS-TEMPLATES-013
    const schemas = await client.template.listSchemas(templateId);

    for (const schema of schemas) {
      console.log(
        `${schema.schemaId}: ${schema.schemaName} (${schema.entity})`,
      );
    }
    // @docs-end TS-TEMPLATES-013

    expect(Array.isArray(schemas)).toBe(true);
  });
});
