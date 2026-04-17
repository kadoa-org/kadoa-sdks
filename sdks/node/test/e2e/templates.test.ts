import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { KadoaClient } from "../../src/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";
import { getTestEnv } from "../utils/env";

describe("Templates", () => {
  const env = getTestEnv();
  let client: KadoaClient;

  beforeAll(() => {
    client = new KadoaClient({
      apiKey: env.KADOA_API_KEY,
      timeout: 30000,
    });
  });

  afterAll(() => {
    client?.dispose();
  });

  describe("CRUD Operations", () => {
    test(
      "should create and get a template",
      async () => {
        const template = await client.template.create({
          name: `test-create-get-${Date.now()}`,
          description: "SDK e2e test",
        });

        try {
          expect(template).toBeDefined();
          expect(template.id).toBeDefined();
          expect(template.name).toContain("test-create-get-");

          const fetched = await client.template.get(template.id);
          expect(fetched.id).toBe(template.id);
          expect(fetched.name).toBe(template.name);
        } finally {
          await client.template.delete(template.id);
        }
      },
      { timeout: 60000 },
    );

    test(
      "should list templates",
      async () => {
        const template = await client.template.create({
          name: `test-list-${Date.now()}`,
        });

        try {
          const templates = await client.template.list();
          expect(Array.isArray(templates)).toBe(true);

          const found = templates.find((t) => t.id === template.id);
          expect(found).toBeDefined();
        } finally {
          await client.template.delete(template.id);
        }
      },
      { timeout: 60000 },
    );

    test(
      "should update a template",
      async () => {
        const template = await client.template.create({
          name: `test-update-${Date.now()}`,
        });

        try {
          const updated = await client.template.update(template.id, {
            name: "Updated Template Name",
            description: "Updated description",
          });
          expect(updated).toBeDefined();

          const fetched = await client.template.get(template.id);
          expect(fetched.name).toBe("Updated Template Name");
          expect(fetched.description).toBe("Updated description");
        } finally {
          await client.template.delete(template.id);
        }
      },
      { timeout: 60000 },
    );
  });

  describe("Template Associations", () => {
    test(
      "should list schemas for a template",
      async () => {
        const template = await client.template.create({
          name: `test-schemas-${Date.now()}`,
        });

        try {
          const schemas = await client.template.listSchemas(template.id);
          expect(Array.isArray(schemas)).toBe(true);
        } finally {
          await client.template.delete(template.id);
        }
      },
      { timeout: 60000 },
    );

  });

  describe("Destructive Operations", () => {
    test(
      "should delete template",
      async () => {
        const template = await client.template.create({
          name: `test-delete-${Date.now()}`,
        });

        await client.template.delete(template.id);

        expect(
          client.template.get(template.id),
        ).rejects.toThrow(KadoaHttpException);
      },
      { timeout: 60000 },
    );

    test(
      "should handle delete non-existent template",
      async () => {
        expect(
          client.template.delete("5f9f1b9b9c9d1b9b9c9d1b9b"),
        ).rejects.toThrow(KadoaHttpException);
      },
      { timeout: 60000 },
    );
  });
});
