# Schema Management Guide - SDK Implementation

## Overview

A **Schema** defines the structure of data to extract from web pages. It consists of an entity type (e.g., "Product", "Article") and fields describing specific data points to capture.

This guide focuses on how schemas are created and used in the Kadoa Node.js SDK using the **Builder Pattern**.

## Schema Definition with Builder Pattern

The SDK provides a fluent `SchemaBuilder` API for defining schemas programmatically.

### Basic Schema Creation

```typescript
import { KadoaClient } from '@kadoa/sdk';

const client = new KadoaClient({ apiKey: 'your-api-key' });

// Define a schema using the builder pattern
const extraction = await client
  .extract({
    urls: ['https://example.com/products'],
    name: 'Product Extraction',
    extraction: (builder) =>
      builder
        .entity('Product')
        .field('title', 'Product name', 'STRING', {
          example: 'Wireless Headphones'
        })
        .field('price', 'Product price', 'MONEY')
        .field('inStock', 'Stock status', 'BOOLEAN')
  })
  .create();
```

### SchemaBuilder API

The `SchemaBuilder` class provides these methods:

#### `entity(name: string)`
Sets the entity type for the schema.

```typescript
builder.entity('Product')
```

#### `field(name, description, dataType, options?)`
Adds a structured field to extract specific data.

**Parameters:**
- `name` - Field name (alphanumeric only, e.g., `"productTitle"`)
- `description` - Field purpose description
- `dataType` - Data type (see Field Types below)
- `options` - Optional configuration:
  - `example` - Example value (required for STRING, IMAGE, LINK, OBJECT, ARRAY)
  - `isKey` - Whether this is a primary key field

```typescript
builder
  .field('productId', 'Unique product identifier', 'STRING', {
    example: 'PROD-12345',
    isKey: true
  })
  .field('price', 'Product price', 'MONEY')
  .field('releaseDate', 'Product release date', 'DATE')
```

#### `classify(name, description, categories)`
Adds a classification field to categorize content into predefined labels.

**Parameters:**
- `name` - Field name (alphanumeric only)
- `description` - Field purpose description
- `categories` - Array of category definitions with `title` and `definition`

```typescript
builder.classify('category', 'Product category', [
  {
    title: 'Electronics',
    definition: 'Electronic devices and gadgets'
  },
  {
    title: 'Clothing',
    definition: 'Apparel and fashion items'
  },
  {
    title: 'Other',
    definition: 'Other products'
  }
])
```

#### `raw(format)`
Adds raw page content extraction in specified format(s).

**Parameters:**
- `format` - Single format or array: `"HTML"`, `"MARKDOWN"`, or `"PAGE_URL"`

```typescript
// Single format
builder.raw('MARKDOWN')

// Multiple formats
builder.raw(['HTML', 'MARKDOWN', 'PAGE_URL'])
```

**Note:** Raw content fields are automatically named as `rawHtml`, `rawMarkdown`, `rawPageUrl`.

## Field Types

### 1. Schema Fields (SCHEMA)

Extract and structure specific data from web pages.

#### Supported Data Types

| Data Type | Description | Example Required? |
|-----------|-------------|-------------------|
| `STRING` | Text content | ✅ Yes |
| `NUMBER` | Numeric values | ❌ No |
| `BOOLEAN` | True/false values | ❌ No |
| `DATE` | Date only | ❌ No |
| `DATETIME` | Date with time | ❌ No |
| `MONEY` | Monetary amounts (numeric) | ❌ No |
| `IMAGE` | Image URLs | ✅ Yes |
| `LINK` | Hyperlinks | ✅ Yes |
| `OBJECT` | Nested objects | ✅ Yes |
| `ARRAY` | Arrays of values | ✅ Yes |

**Example:**

```typescript
builder
  .field('title', 'Product title', 'STRING', { example: 'Wireless Headphones' })
  .field('price', 'Product price', 'MONEY')
  .field('inStock', 'Stock availability', 'BOOLEAN')
  .field('releaseDate', 'Release date', 'DATE')
  .field('thumbnail', 'Product image', 'IMAGE', { example: 'https://example.com/img.jpg' })
  .field('tags', 'Product tags', 'ARRAY', { example: ['electronics', 'wireless'] })
```

### 2. Raw Fields

Expose raw page content in different formats.

**Available formats:**
- `HTML` → generates `rawHtml` field
- `MARKDOWN` → generates `rawMarkdown` field
- `PAGE_URL` → generates `rawPageUrl` field

```typescript
builder.raw('MARKDOWN')                      // Single format
builder.raw(['HTML', 'MARKDOWN', 'PAGE_URL']) // Multiple formats
```

**Restrictions:** Only supported with `single-page` navigation mode.

### 3. Classification Fields (CLASSIFICATION)

Categorize extracted data into predefined labels.

```typescript
builder.classify('sentiment', 'Article sentiment', [
  { title: 'Positive', definition: 'Positive or optimistic tone' },
  { title: 'Negative', definition: 'Negative or pessimistic tone' },
  { title: 'Neutral', definition: 'Neutral or balanced tone' }
])
```

## Schema Validation Rules

The `SchemaBuilder` enforces these validation rules:

### 1. Field Names
- **Must be alphanumeric only** (no underscores or special characters)
- Pattern: `^[A-Za-z0-9]+$`
- Must be unique within a schema (case-insensitive)

```typescript
// ✅ Valid
builder.field('productTitle', ...)
builder.field('price123', ...)

// ❌ Invalid
builder.field('product_title', ...)  // Contains underscore
builder.field('price-usd', ...)       // Contains hyphen
```

### 2. Example Requirements
Required for specific data types:
- `STRING` ✅
- `IMAGE` ✅
- `LINK` ✅
- `OBJECT` ✅
- `ARRAY` ✅

Optional for:
- `NUMBER`, `BOOLEAN`, `DATE`, `DATETIME`, `MONEY`

```typescript
// ✅ Valid - STRING with example
builder.field('title', 'Product title', 'STRING', {
  example: 'Example Product'
})

// ❌ Invalid - STRING without example
builder.field('title', 'Product title', 'STRING')
// Throws: Field "title" with type STRING requires an example
```

### 3. Duplicate Field Names
Field names must be unique (case-insensitive comparison).

```typescript
// ❌ Invalid - duplicate field names
builder
  .field('title', 'Product title', 'STRING', { example: 'A' })
  .field('Title', 'Another title', 'STRING', { example: 'B' })
// Throws: Duplicate field name: "Title"
```

### 4. Entity Name Requirement
Entity name must be set before building.

```typescript
// ❌ Invalid - no entity name
builder.field('title', 'Title', 'STRING', { example: 'A' }).build()
// Throws: Entity name is required

// ✅ Valid
builder.entity('Product').field('title', 'Title', 'STRING', { example: 'A' }).build()
```

## Using Schemas in Workflow Creation

### Method 1: Inline Schema Definition

Define the schema directly when creating an extraction workflow.

```typescript
const extraction = await client
  .extract({
    urls: ['https://example.com'],
    name: 'My Extraction',
    extraction: (builder) =>
      builder
        .entity('Product')
        .field('title', 'Product name', 'STRING', {
          example: 'Example'
        })
        .field('price', 'Price', 'MONEY')
  })
  .create();
```

**When to use:**
- One-off workflows
- Rapid prototyping
- Custom extraction needs
- No need for reusability

### Method 2: Reference Saved Schema

Create a reusable schema first, then reference it by ID.

```typescript
// Create and save a schema using fluent builder
const schema = await client.schema
  .builder('Product')
  .field('title', 'Product name', 'STRING', { example: 'iPhone 15' })
  .field('price', 'Product price', 'MONEY')
  .create('Product Schema');

// Use the saved schema in workflow
const extraction = await client
  .extract({
    urls: ['https://example.com'],
    name: 'My Extraction',
    extraction: { schemaId: schema.id }
  })
  .create();
```

**When to use:**
- Same extraction pattern across multiple workflows
- Need version control and audit trail
- Sharing within team/organization
- Building library of reusable templates

### Method 3: AI-Powered Auto-Detection

Let the AI automatically detect the entity and fields.

```typescript
const extraction = await client
  .extract({
    urls: ['https://example.com/products'],
    name: 'Auto Detection',
    // No extraction parameter - AI auto-detects
  })
  .create();
```

**When to use:**
- Starting with a new website
- Unsure what fields are available
- Quick prototyping
- Exploratory data extraction

## Practical Examples

### E-commerce Product Extraction

```typescript
const extraction = await client
  .extract({
    urls: ['https://shop.example.com/products'],
    name: 'Product Catalog',
    extraction: (builder) =>
      builder
        .entity('Product')
        .field('productId', 'Unique product ID', 'STRING', {
          example: 'PROD-12345',
          isKey: true
        })
        .field('title', 'Product name', 'STRING', { example: 'Wireless Headphones' })
        .field('price', 'Current price', 'MONEY')
        .field('inStock', 'Stock availability', 'BOOLEAN')
        .field('imageUrl', 'Product image', 'IMAGE', { example: 'https://example.com/img.jpg' })
        .classify('category', 'Product category', [
          { title: 'Electronics', definition: 'Electronic devices' },
          { title: 'Fashion', definition: 'Clothing and accessories' }
        ])
  })
  .create();
```

### Combining All Field Types

```typescript
const extraction = await client
  .extract({
    urls: ['https://blog.example.com'],
    name: 'Blog Articles',
    navigationMode: 'single-page',
    extraction: (builder) =>
      builder
        .entity('Article')
        .field('title', 'Article title', 'STRING', { example: 'How to Build APIs' })
        .field('publishedAt', 'Publication date', 'DATETIME')
        .classify('sentiment', 'Article sentiment', [
          { title: 'Positive', definition: 'Positive tone' },
          { title: 'Neutral', definition: 'Neutral tone' }
        ])
        .raw('MARKDOWN')  // Also extract raw markdown
  })
  .create();
```

## Saved Schema Management

The SDK provides a `schema` module (note: singular, not `schemas`) for CRUD operations on saved schemas.

### Creating Schemas

There are three ways to create a schema:

#### Method 1: Fluent Builder with Create (Recommended)

Create a schema directly using the fluent builder API with the `.create()` method.

```typescript
const schema = await client.schema
  .builder('Product')
  .field('title', 'Product name', 'STRING', { example: 'iPhone 15' })
  .field('price', 'Product price', 'MONEY')
  .create('Product Schema');
```

**When to use:**
- Most concise and readable syntax
- Quick schema creation
- When you want to create and save in one step

#### Method 2: Build then Create

Build the schema definition first, then create it separately.

```typescript
const schemaDefinition = client.schema
  .builder('Product')
  .field('title', 'Product name', 'STRING', { example: 'iPhone 15' })
  .field('price', 'Product price', 'MONEY')
  .build();

const schema = await client.schema.create({
  name: 'Product Schema',
  entity: schemaDefinition.entityName,
  fields: schemaDefinition.fields
});
```

**When to use:**
- Need to inspect schema before creating
- Conditional logic for schema creation
- Testing or validation

#### Method 3: Manual Body Construction

Create a schema using a manually constructed body object.

```typescript
const schema = await client.schema.create({
  name: 'Product Schema',
  entity: 'Product',
  fields: [
    {
      name: 'title',
      description: 'Product name',
      dataType: 'STRING',
      fieldType: 'SCHEMA',
      example: 'iPhone 15'
    },
    {
      name: 'price',
      description: 'Product price',
      dataType: 'MONEY',
      fieldType: 'SCHEMA'
    }
  ]
});
```

**When to use:**
- Maximum control over field structure
- Programmatic schema generation from external sources
- Advanced use cases

### Other Schema Operations

```typescript
// List all schemas
const schemas = await client.schema.list();

// Get a specific schema
const schema = await client.schema.get('schema-id');

// Update a schema
await client.schema.update('schema-id', {
  name: 'Updated Product Schema',
  entity: 'Product',
  fields: [...]
});

// Delete a schema
await client.schema.delete('schema-id');
```

## Best Practices

### Field Naming
- Use descriptive camelCase names (e.g., `productTitle`, not `field1`)
- Prefix booleans with `is` or `has` (e.g., `isAvailable`)

### Examples
- Provide realistic examples, not minimal ones (e.g., `"Apple iPhone 15 Pro"`, not `"test"`)

### Data Types
- Use `MONEY` for prices, not `STRING`
- Use `DATE`/`DATETIME` for dates, not `STRING`

### Primary Keys
- Mark unique identifiers with `isKey: true`

### Navigation Mode
- Raw content (`.raw()`) requires `navigationMode: 'single-page'`

## Troubleshooting

### Common Errors

**Error: "Field name must be alphanumeric only"**
```typescript
// ❌ Cause
builder.field('product_title', ...)

// ✅ Solution
builder.field('productTitle', ...)
```

**Error: "Duplicate field name"**
```typescript
// ❌ Cause
builder
  .field('title', 'Title', 'STRING', { example: 'A' })
  .field('Title', 'Title 2', 'STRING', { example: 'B' })

// ✅ Solution - use unique names
builder
  .field('title', 'Main title', 'STRING', { example: 'A' })
  .field('subtitle', 'Subtitle', 'STRING', { example: 'B' })
```

**Error: "Field requires an example"**
```typescript
// ❌ Cause
builder.field('title', 'Product title', 'STRING')

// ✅ Solution
builder.field('title', 'Product title', 'STRING', {
  example: 'Example Product'
})
```

**Error: "Entity name is required"**
```typescript
// ❌ Cause
builder.field('title', 'Title', 'STRING', { example: 'A' }).build()

// ✅ Solution
builder
  .entity('Product')
  .field('title', 'Title', 'STRING', { example: 'A' })
  .build()
```

**Error: "Raw fields only supported with single-page navigation"**
```typescript
// ❌ Cause
await client.extract({
  navigationMode: 'multi-page',
  extraction: (builder) => builder.raw('HTML')
}).create();

// ✅ Solution
await client.extract({
  navigationMode: 'single-page',
  extraction: (builder) => builder.raw('HTML')
}).create();
```

## Related Documentation

- [SCHEMA_CONCEPT.md](SCHEMA_CONCEPT.md) - Conceptual overview of schemas in the platform
- [EXTRACTION_BUILDER_DESIGN.md](EXTRACTION_BUILDER_DESIGN.md) - Extraction builder architecture
- [STYLEGUIDE.md](STYLEGUIDE.md) - SDK code style and structure guidelines