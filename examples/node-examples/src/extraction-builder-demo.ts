import { KadoaClient } from "@kadoa/node-sdk";

const API_KEY =
  process.env.KADOA_API_KEY || "39113751-1e7a-4cb2-9516-1e25d0085aa5";

async function main() {
  const client = new KadoaClient({
    apiKey: API_KEY,
    timeout: 300000,
  });

  console.log("\n=== Extraction Builder Demo ===\n");

  // 1. Auto-detection (simplest)
  console.log("1. Auto-detection (no extraction parameter):");
  const autoExtraction = await client
    .extract({
      urls: ["https://sandbox.kadoa.com/ecommerce"],
      name: "Auto Detection Demo",
    })
    .bypassPreview()
    .setInterval({ interval: "ONLY_ONCE" })
    .create();
  console.log(`✓ Created workflow: ${autoExtraction.workflowId}`);

  // 2. Raw extraction (markdown)
  console.log("\n2. Raw extraction (markdown and url):");
  const rawExtraction = await client
    .extract({
      urls: ["https://sandbox.kadoa.com/ecommerce"],
      name: "Raw Markdown Demo",
      extraction: (builder) => builder.raw("MARKDOWN").raw("PAGE_URL"),
    })
    .bypassPreview()
    .setInterval({ interval: "ONLY_ONCE" })
    .create();
  console.log(`✓ Created workflow: ${rawExtraction.workflowId}`);

  // 3. Custom schema with fields
  console.log("\n3. Custom schema with structured fields:");
  const schemaExtraction = await client
    .extract({
      urls: ["https://sandbox.kadoa.com/ecommerce"],
      name: "Custom Schema Demo",
      extraction: (builder) =>
        builder
          .entity("Product")
          .field("title", "Product name", "STRING", {
            example: "Example Product",
          })
          .field("price", "Product price", "MONEY"),
    })
    .bypassPreview()
    .setInterval({ interval: "ONLY_ONCE" })
    .create();
  console.log(`✓ Created workflow: ${schemaExtraction.workflowId}`);

  // 4. Hybrid (schema + raw content)
  console.log("\n4. Hybrid extraction (schema + raw HTML):");
  const hybridExtraction = await client
    .extract({
      urls: ["https://sandbox.kadoa.com/ecommerce"],
      name: "Hybrid Demo",
      extraction: (builder) =>
        builder
          .entity("Product")
          .field("title", "Product name", "STRING", {
            example: "Example Product",
          })
          .field("price", "Product price", "MONEY")
          .raw("HTML"),
    })
    .bypassPreview()
    .setInterval({ interval: "ONLY_ONCE" })
    .create();
  console.log(`✓ Created workflow: ${hybridExtraction.workflowId}`);

  // 5. Classification field
  console.log("\n5. Classification field:");
  const classificationExtraction = await client
    .extract({
      urls: ["https://sandbox.kadoa.com/ecommerce"],
      name: "Classification Demo",
      extraction: (builder) =>
        builder.classify("category", "Product category", [
          {
            title: "Electronics",
            definition: "Electronic devices and gadgets",
          },
          { title: "Clothing", definition: "Apparel and fashion items" },
          { title: "Other", definition: "Other products" },
        ]),
    })
    .bypassPreview()
    .setInterval({ interval: "ONLY_ONCE" })
    .create();
  console.log(`✓ Created workflow: ${classificationExtraction.workflowId}`);

  console.log("\n=== All demos completed successfully! ===\n");

  client.dispose();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
