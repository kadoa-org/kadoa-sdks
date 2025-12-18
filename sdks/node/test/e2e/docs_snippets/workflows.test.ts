/**
 * TS-WORKFLOWS: workflows/create.mdx snippets
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { KadoaClient } from "../../../src/kadoa-client";
import { deleteWorkflowByName } from "../../utils/cleanup-helpers";
import { getTestEnv } from "../../utils/env";
import { seedSchema } from "../../utils/seeder";
import { getSharedWorkflowFixture } from "../../utils/shared-fixtures";

describe("TS-WORKFLOWS: workflows/create.mdx snippets", () => {
  let client: KadoaClient;
  let workflowId: string;

  beforeAll(async () => {
    client = new KadoaClient({ apiKey: getTestEnv().KADOA_API_KEY });
    const fixture = await getSharedWorkflowFixture(client);
    workflowId = fixture.workflowId;
  }, 120000);

  afterAll(() => {
    client.dispose?.();
  });

  it("TS-WORKFLOWS-001: Authentication", async () => {
    // @docs-preamble TS-WORKFLOWS-001
    // import { KadoaClient } from '@kadoa/node-sdk';
    //
    // const client = new KadoaClient({
    //   apiKey: 'your-api-key'
    // });
    // @docs-preamble-end TS-WORKFLOWS-001
    // @docs-start TS-WORKFLOWS-001
    const status = await client.status();
    console.log(status);
    console.log(status.user);
    // @docs-end TS-WORKFLOWS-001
    expect(client).toBeDefined();
    expect(client.user).toBeDefined();
  });

  it(
    "TS-WORKFLOWS-002: Auto-detection extraction",
    async () => {
      const workflowName = "Auto Product Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-002
      // SDK: AI automatically detects and extracts data
      const result = await client.extraction.run({
        urls: ["https://sandbox.kadoa.com/ecommerce"],
        name: "Auto Product Extraction",
        limit: 10,
      });

      console.log(result.data);
      // @docs-end TS-WORKFLOWS-002

      expect(result).toBeDefined();
      if (result.workflowId) await client.workflow.delete(result.workflowId);
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-003: Custom schema extraction",
    async () => {
      const workflowName = "Structured Product Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-003
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Structured Product Extraction",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "iPhone 15 Pro",
              })
              .field("price", "Price in USD", "MONEY")
              .field("inStock", "Availability", "BOOLEAN")
              .field("rating", "Rating 1-5", "NUMBER")
              .field("releaseDate", "Launch date", "DATE"),
        })
        .create();

      const result = await workflow.run({ limit: 10 });

      // Use destructuring for cleaner access
      const { data } = await result.fetchData({});
      console.log(data);
      // @docs-end TS-WORKFLOWS-003

      expect(workflow.workflowId).toBeDefined();
      expect(data).toBeDefined();

      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 300000 },
  );

  // Raw content extraction workflows take >5min - run manually
  it.skip(
    "TS-WORKFLOWS-004: Raw content extraction",
    async () => {
      // @docs-start TS-WORKFLOWS-004
      // Extract as Markdown
      const extraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/news"],
          name: "Article Content",
          extraction: (builder) => builder.raw("MARKDOWN"),
        })
        .create();

      const run = await extraction.run({ limit: 10 });
      const data = await run.fetchData({});
      console.log(data);
      // @docs-end TS-WORKFLOWS-004

      expect(extraction.workflowId).toBeDefined();
      expect(data).toBeDefined();
    },
    { timeout: 300000 },
  );

  it(
    "TS-WORKFLOWS-005: Classification extraction",
    async () => {
      const workflowName = "Article Classifier";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-005
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/news"],
          name: "Article Classifier",
          extraction: (builder) =>
            builder
              .entity("Article")
              .field("title", "Headline", "STRING", {
                example: "Tech Company Announces New Product",
              })
              .field("content", "Article text", "STRING", {
                example: "The article discusses the latest innovations...",
              })
              .classify("sentiment", "Content tone", [
                { title: "Positive", definition: "Optimistic tone" },
                { title: "Negative", definition: "Critical tone" },
                { title: "Neutral", definition: "Balanced tone" },
              ])
              .classify("category", "Article topic", [
                { title: "Technology", definition: "Tech news" },
                { title: "Business", definition: "Business news" },
                { title: "Politics", definition: "Political news" },
              ]),
        })
        .create();
      //Note: 'limit' here is limiting number of extracted records not fetched
      const result = await workflow.run({ limit: 10, variables: {} });
      console.log(result.jobId);
      const data = result.fetchData({ limit: 10 });
      console.log(data);
      // @docs-end TS-WORKFLOWS-005

      expect(workflow.workflowId).toBeDefined();
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-006: Single page extraction",
    async () => {
      const workflowName = "Job Posting Monitor";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-006
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/careers-simple"],
          name: "Job Posting Monitor",
          navigationMode: "single-page",
          extraction: (builder) =>
            builder
              .entity("Job Posting")
              .field("jobTitle", "Job title", "STRING", {
                example: "Senior Software Engineer",
              })
              .field("department", "Department or team", "STRING", {
                example: "Engineering",
              })
              .field("location", "Job location", "STRING", {
                example: "San Francisco, CA",
              }),
        })
        .setInterval({ interval: "DAILY" })
        .create();

      console.log("Workflow created:", workflow.workflowId);
      const result = await workflow.run({ limit: 10, variables: {} });
      console.log(result.jobId);
      // @docs-end TS-WORKFLOWS-006

      expect(workflow.workflowId).toBeDefined();
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 120000 },
  );

  // paginated-page navigation takes >5min - run manually
  it(
    "TS-WORKFLOWS-007: List navigation",
    async () => {
      const workflowName = "Product Catalog Monitor";
      await deleteWorkflowByName(workflowName, client);

      // Setup: create schema
      const { schemaId } = await seedSchema(
        {
          name: "Test Schema - TS-SCHEMAS-005",
          entity: "Product",
          fields: [
            {
              name: "title",
              description: "Product name",
              fieldType: "SCHEMA",
              dataType: "STRING",
              example: "Sample Product",
            },
          ],
        },
        client,
      );

      // @docs-start TS-WORKFLOWS-007
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Catalog Monitor",
          navigationMode: "paginated-page",
          extraction: () => ({ schemaId }),
        })
        .setInterval({ interval: "HOURLY" })
        .create();

      // Run the workflow
      const result = await workflow.run({ limit: 10 });
      const response = await result.fetchData({});
      console.log("Extracted items:", response.data);
      // @docs-end TS-WORKFLOWS-007

      expect(workflow.workflowId).toBeDefined();
      expect(response.data).toBeDefined();

      // Cleanup: workflow first (schema can't be deleted while in use)
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 300000 },
  );

  it.skip(
    "TS-WORKFLOWS-008: List + details navigation",
    async () => {
      // @docs-start TS-WORKFLOWS-008
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Details Extractor",
          navigationMode: "page-and-detail",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "Wireless Headphones",
              })
              .field("price", "Product price", "MONEY")
              .field("description", "Full description", "STRING", {
                example: "Premium noise-cancelling headphones...",
              })
              .field("specifications", "Technical specs", "STRING", {
                example: "Battery life: 30 hours, Bluetooth 5.0...",
              }),
        })
        .create();

      const result = await workflow.run({ limit: 10 });
      const productDetails = await result.fetchData({});
      console.log(productDetails.data);
      // @docs-end TS-WORKFLOWS-008

      expect(workflow.workflowId).toBeDefined();
      expect(productDetails.data).toBeDefined();
    },
    { timeout: 300000 },
  );

  it.skip(
    "TS-WORKFLOWS-009: All pages crawler",
    async () => {
      // @docs-start TS-WORKFLOWS-009
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Product Catalog Crawler",
          navigationMode: "all-pages",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "Sennheiser HD 6XX",
              })
              .field("price", "Product price", "MONEY")
              .field("reviews", "Number of reviews", "STRING", {
                example: "155 reviews",
              }),
        })
        .create();

      const result = await workflow.run({ limit: 10 });
      const response = await result.fetchData({});
      console.log(response.data);
      // @docs-end TS-WORKFLOWS-009

      expect(workflow.workflowId).toBeDefined();
      expect(response.data).toBeDefined();
    },
    { timeout: 300000 },
  );

  // agentic-navigation takes too long, unskip for manual testing
  it.skip(
    "TS-WORKFLOWS-010: AI navigation with existing schema",
    async () => {
      // Setup: create schema first
      const schema = await client.schema.createSchema({
        name: "Test Schema - TS-WORKFLOWS-010",
        entity: "Job Posting",
        fields: [
          {
            name: "jobTitle",
            description: "Job title",
            fieldType: "SCHEMA",
            dataType: "STRING",
            example: "Senior Software Engineer",
          },
          {
            name: "requirements",
            description: "Job requirements",
            fieldType: "SCHEMA",
            dataType: "STRING",
            example: "5+ years experience in software development",
          },
          {
            name: "benefits",
            description: "Benefits offered",
            fieldType: "SCHEMA",
            dataType: "STRING",
            example: "Health insurance, 401k, remote work",
          },
        ],
      });

      // @docs-start TS-WORKFLOWS-010
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/careers-directory"],
          name: "AI Job Scraper",
          navigationMode: "agentic-navigation",
          extraction: () => ({
            schemaId: schema.id,
          }),
          userPrompt: `Navigate to the careers section, find all
                       engineering job postings, and extract the job details
                       including requirements and benefits. Make sure to
                       click 'Load More' if present.`,
        })
        .create();

      console.log(`Workflow ${workflow.workflowId} started`);
      // Note: AI Navigation flows typically take ~1 hour to complete.
      // We recommend using webhooks to receive notifications when finished.
      workflow.run().then((w) => {
        console.log(`Workflow finished. RunId: ${w}`);
      });
      // @docs-end TS-WORKFLOWS-010
    },
    { timeout: 120000 },
  );

  // agentic-navigation takes too long, unskip for manual testing
  it.skip(
    "TS-WORKFLOWS-011: AI navigation with custom schema",
    async () => {
      // @docs-start TS-WORKFLOWS-011
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/careers-directory"],
          name: "AI Job Scraper with Schema",
          navigationMode: "agentic-navigation",
          extraction: (builder) =>
            builder
              .entity("Job Posting")
              .field("jobTitle", "Job title", "STRING", {
                example: "Product Manager",
              })
              .field("description", "Job description", "STRING", {
                example: "Lead product strategy and roadmap...",
              })
              .field("requirements", "Job requirements", "STRING", {
                example: "5+ years experience in product management",
              })
              .field("benefits", "Benefits offered", "STRING", {
                example: "Health insurance, 401k, remote work",
              }),
          userPrompt: `Navigate to the careers section and extract job details.`,
        })
        .create();

      console.log(`Workflow ${workflow.workflowId} started`);
      // Note: AI Navigation flows typically take ~1 hour to complete.
      // We recommend using webhooks to receive notifications when finished.
      workflow.run().then((w) => {
        console.log(`Workflow finished. RunId: ${w}`);
      });

      // @docs-end TS-WORKFLOWS-011

      expect(workflow.workflowId).toBeDefined();
    },
    { timeout: 120000 },
  );

  // agentic-navigation takes too long, unskip for manual testing
  it.skip(
    "TS-WORKFLOWS-012: AI navigation with auto-detected schema",
    async () => {
      // @docs-start TS-WORKFLOWS-012
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/news"],
          name: "AI Blog Scraper",
          navigationMode: "agentic-navigation",
          userPrompt: `Find all blog posts from 2024. For each post,
            extract the title, author, publication date, and content.`,
        })
        .create();

      console.log(`Workflow ${workflow.workflowId} started`);
      // Note: AI Navigation flows typically take ~1 hour to complete.
      // We recommend using webhooks to receive notifications when finished.
      workflow.run().then((w) => {
        console.log(`Workflow finished. RunId: ${w}`);
      });
      // @docs-end TS-WORKFLOWS-012

      expect(workflow.workflowId).toBeDefined();
    },
    { timeout: 120000 },
  );

  // agentic-navigation takes too long, unskip for manual testing
  it.skip(
    "TS-WORKFLOWS-013: Using variables in AI navigation",
    async () => {
      // @docs-start TS-WORKFLOWS-013
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce"],
          name: "Dynamic Product Search",
          navigationMode: "agentic-navigation",
          userPrompt: `Navigate to search and loop through
            '@productTypes', press search, and extract
            product details for all results.`,
        })
        .create();

      console.log(`Workflow ${workflow.workflowId} started`);
      // Note: AI Navigation flows typically take ~1 hour to complete.
      // We recommend using webhooks to receive notifications when finished.
      workflow.run().then((w) => {
        console.log(`Workflow finished. RunId: ${w}`);
      });
      // @docs-end TS-WORKFLOWS-013

      expect(workflow.workflowId).toBeDefined();
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-014: Scheduling options",
    async () => {
      const workflowName = "Scheduled Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-014
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce/pagination"],
          name: "Scheduled Extraction",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", { example: "Sample" }),
        })
        .setInterval({
          schedules: ["0 9 * * MON-FRI", "0 18 * * MON-FRI"],
        })
        .create();

      // Workflow runs automatically on schedule
      console.log("Scheduled workflow:", workflow.workflowId);
      // @docs-end TS-WORKFLOWS-014

      expect(workflow.workflowId).toBeDefined();
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-015: Manual execution and status",
    async () => {
      if (!workflowId) throw new Error("Fixture workflow not created");

      // @docs-start TS-WORKFLOWS-015
      const workflow = await client.workflow.get(workflowId);
      console.log(`Current workflows state: ${workflow.displayState}`);

      const result = await client.workflow.runWorkflow(workflowId, {
        limit: 10,
      });
      console.log(`Workflow scheduled with runId: ${result.jobId}`);
      // @docs-end TS-WORKFLOWS-015

      expect(workflow).toBeDefined();
      expect(workflow.state).toBeDefined();
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-016: Pagination handling",
    async () => {
      const workflowName = "Paginated Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-016
      const extraction = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/ecommerce/pagination"],
          name: "Paginated Extraction",
          navigationMode: "paginated-page",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Product name", "STRING", {
                example: "Sennheiser HD 6XX",
              })
              .field("price", "Product price", "MONEY"),
        })
        .create();

      const result = await extraction.run({ limit: 10 });

      // Fetch a single page with pagination info
      const page = await result.fetchData({ page: 1, limit: 5 });
      console.log("Page data:", page.data);
      console.log("Pagination:", page.pagination);

      // Or get all data at once
      const allData = await result.fetchAllData({});
      console.log("All data:", allData);
      // @docs-end TS-WORKFLOWS-016

      expect(extraction.workflowId).toBeDefined();
      expect(page.data).toBeDefined();
      expect(allData).toBeDefined();

      if (extraction.workflowId)
        await client.workflow.delete(extraction.workflowId);
    },
    { timeout: 300000 },
  );

  it(
    "TS-WORKFLOWS-017: Proxy locations",
    async () => {
      const workflowName = "Geo-located Extraction";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-017
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/magic"],
          name: "Geo-located Extraction",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Title", "STRING", { example: "example" }),
        })
        .setLocation({
          type: "manual",
          isoCode: "US",
        })
        .create();
      // @docs-end TS-WORKFLOWS-017

      expect(workflow.workflowId).toBeDefined();
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 120000 },
  );

  it(
    "TS-WORKFLOWS-018: Preview mode bypass",
    async () => {
      const workflowName = "Direct Activation";
      await deleteWorkflowByName(workflowName, client);

      // @docs-start TS-WORKFLOWS-018
      const workflow = await client
        .extract({
          urls: ["https://sandbox.kadoa.com/magic"],
          name: "Direct Activation",
          extraction: (builder) =>
            builder
              .entity("Product")
              .field("title", "Title", "STRING", { example: "example" }),
        })
        .bypassPreview() // Skip review step
        .create();

      // Workflow is immediately active
      // @docs-end TS-WORKFLOWS-018

      expect(workflow.workflowId).toBeDefined();
      if (workflow.workflowId)
        await client.workflow.delete(workflow.workflowId);
    },
    { timeout: 120000 },
  );
});
