# SDK API Reference

API parity reference for Node and Python SDKs.

> Node.js SDK is the master SDK. Python SDK maintains feature parity with Node.

## Overview

Both SDKs provide the same domain structure and API surface:

| Module | Node SDK | Python SDK |
|--------|----------|------------|
| Client | `KadoaClient` | `KadoaClient` |
| Extraction | `ExtractionService`, `ExtractionBuilderService` | `ExtractionModule`, `ExtractionBuilderService` |
| Schemas | `SchemasService`, `SchemaBuilder` | `SchemasService`, `SchemaBuilder` |
| Workflows | `WorkflowsCoreService` | `WorkflowsCoreService` |
| Notifications | 3 services + `NotificationDomain` | 3 services + `NotificationDomain` |
| Validation | 2 services + `ValidationDomain` | 2 services + `ValidationDomain` |
| Realtime | `Realtime` class | `Realtime` class |
| User | `UserService` | `UserService` |
| Exceptions | `KadoaSdkException`, `KadoaHttpException` | `KadoaSdkError`, `KadoaHttpError` |

---

## 1. Core Client

The `KadoaClient` class provides access to all SDK domains:

| Feature | Node | Python |
|---------|------|--------|
| `extract()` fluent API | `extract()` | `extract()` |
| Connect realtime | `connectRealtime()` | `connect_realtime()` |
| Disconnect realtime | `disconnectRealtime()` | `disconnect_realtime()` |
| Check connection | `isRealtimeConnected()` | `is_realtime_connected()` |
| Status check | `status()` | `status()` |
| Cleanup | `dispose()` | `close()` |
| Raw request | N/A | `makeRawRequest()` |

Domain properties on `KadoaClient`:

- `extraction` — Extraction operations
- `workflow` — Workflow management
- `notification` — Notification setup
- `schema` — Schema operations
- `user` — User information
- `validation` — Data validation

## 2. Extraction Domain

### ExtractionService / ExtractionModule

| Method | Node | Python |
|--------|------|--------|
| Run extraction | `run()` | `run()` |
| Submit extraction | `submit()` | `submit()` |
| Run job | `runJob()` | `run_job()` |
| Run job and wait | `runJobAndWait()` | `run_job_and_wait()` |
| Fetch data | `fetchData()` | `fetch_data()` |
| Fetch all data | `fetchAllData()` | `fetch_all_data()` |
| Fetch data pages | `fetchDataPages()` (AsyncGenerator) | `fetch_data_pages()` (AsyncGenerator) |
| Get notification channels | `getNotificationChannels()` | `get_notification_channels()` |
| Get notification settings | `getNotificationSettings()` | `get_notification_settings()` |
| Resume workflow | `resumeWorkflow()` | `resume_workflow()` |

### ExtractionBuilderService (Fluent API)

| Method | Node | Python |
|--------|------|--------|
| Start extraction | `extract()` | `extract()` |
| Add notifications | `withNotifications()` | `with_notifications()` |
| Add monitoring | `withMonitoring()` | `with_monitoring()` |
| Bypass preview | `bypassPreview()` | `bypass_preview()` |
| Set interval | `setInterval()` | `set_interval()` |
| Set location | `setLocation()` | `set_location()` |
| Add prompt | `withPrompt()` | `with_prompt()` |
| Create workflow | `create()` → `CreatedExtraction` | `create()` → `CreatedExtraction` |
| Wait for ready | `waitForReady()` | `wait_for_ready()` |
| Run and wait | `run()` → `FinishedExtraction` | `run()` → `FinishedExtraction` |
| Submit async | `submit()` → `SubmittedExtraction` | `submit()` → `SubmittedExtraction` |

## 3. Schemas Domain

### SchemasService

| Method | Node | Python |
|--------|------|--------|
| Create builder | `builder()` | `builder()` |
| Get schema | `getSchema()` | `get_schema()` |
| List schemas | `listSchemas()` | `list_schemas()` |
| Create schema | `createSchema()` | `create_schema()` |
| Update schema | `updateSchema()` | `update_schema()` |
| Delete schema | `deleteSchema()` | `delete_schema()` |

### SchemaBuilder

| Method | Node | Python |
|--------|------|--------|
| Add entity | `entity()` | `entity()` |
| Add field | `field()` (with overloads) | `field()` |
| Add classification | `classify()` | `classify()` |
| Add raw content | `raw()` | `raw()` |
| Build schema | `build()` | `build()` |
| Build as JSON | N/A | `build_json()` |

Type validation for field examples:
- Node uses TypeScript overloads
- Python uses runtime validation

## 4. Workflows Domain

### WorkflowsCoreService

| Method | Node | Python |
|--------|------|--------|
| Create workflow | `create()` | `create()` |
| Get workflow | `get()` | `get()` |
| List workflows | `list()` | `list()` |
| Get by name | `getByName()` | `get_by_name()` |
| Delete workflow | `delete()` | `delete()` |
| Update workflow | `update()` | `update()` |
| Resume workflow | `resume()` | `resume()` |
| Wait for completion | `wait()` | `wait()` |
| Run workflow | `runWorkflow()` | `run_workflow()` |
| Get job status | `getJobStatus()` | `get_job_status()` |
| Wait for job | `waitForJobCompletion()` | `wait_for_job_completion()` |

## 5. Notifications Domain

### NotificationChannelsService

| Method | Node | Python |
|--------|------|--------|
| List channels | `listChannels()` | `list_channels()` |
| List all channels | `listAllChannels()` | `list_all_channels()` |
| Delete channel | `deleteChannel()` | `delete_channel()` |
| Create channel | `createChannel()` | `create_channel()` |

### NotificationSettingsService

| Method | Node | Python |
|--------|------|--------|
| Create settings | `createSettings()` | `create_settings()` |
| List settings | `listSettings()` | `list_settings()` |
| List all events | `listAllEvents()` | `list_all_events()` |
| Update settings | `updateSettings()` | `update_settings()` |
| Delete settings | `deleteSettings()` | `delete_settings()` |

### NotificationSetupService

| Method | Node | Python |
|--------|------|--------|
| Setup for workflow | `setupForWorkflow()` | `setup_for_workflow()` |
| Setup for workspace | `setupForWorkspace()` | `setup_for_workspace()` |
| Generic setup | `setup()` | `setup()` |
| Setup channels | `setupChannels()` | `setup_channels()` |

### NotificationDomain

| Method | Node | Python |
|--------|------|--------|
| Configure | `configure()` | `configure()` |
| Setup for workflow | `setupForWorkflow()` | `setup_for_workflow()` |
| Setup for workspace | `setupForWorkspace()` | `setup_for_workspace()` |
| Test notification | `testNotification()` | `test_notification()` |

## 6. Validation Domain

### ValidationCoreService

| Method | Node | Python |
|--------|------|--------|
| List validations | `listWorkflowValidations()` | `list_workflow_validations()` |
| Get details | `getValidationDetails()` | `get_validation_details()` |
| Schedule validation | `scheduleValidation()` | `schedule_validation()` |
| Toggle enabled | `toggleValidationEnabled()` | `toggle_validation_enabled()` |
| Get latest | `getLatestValidation()` | `get_latest_validation()` |
| Get anomalies | `getValidationAnomalies()` | `get_validation_anomalies()` |
| Get anomalies by rule | `getValidationAnomaliesByRule()` | `get_validation_anomalies_by_rule()` |
| Wait until completed | `waitUntilCompleted()` | `wait_until_completed()` |

### ValidationRulesService

| Method | Node | Python |
|--------|------|--------|
| List rules | `listRules()` | `list_rules()` |
| Get rule by ID | `getRuleById()` | `get_rule_by_id()` |
| Get rule by name | `getRuleByName()` | `get_rule_by_name()` |
| Create rule | `createRule()` | `create_rule()` |
| Update rule | `updateRule()` | `update_rule()` |
| Delete rule | `deleteRule()` | `delete_rule()` |
| Disable rule | `disableRule()` | `disable_rule()` |
| Generate rule | `generateRule()` | `generate_rule()` |
| Generate rules | `generateRules()` | `generate_rules()` |
| Bulk approve | `bulkApproveRules()` | `bulk_approve_rules()` |
| Bulk delete | `bulkDeleteRules()` | `bulk_delete_rules()` |
| Delete all rules | `deleteAllRules()` | `delete_all_rules()` |

## 7. Realtime

| Feature | Node | Python |
|---------|------|--------|
| Connect | `connect()` | `connect()` |
| Close | `close()` | `close()` |
| Check connected | `isConnected()` | `is_connected()` |
| Subscribe to events | `onEvent()` → returns unsubscribe fn | `on_event()` |
| Subscribe to connection | `onConnection()` → returns unsubscribe fn | `on_connection()` |
| Subscribe to errors | `onError()` → returns unsubscribe fn | `on_error()` |
| Unsubscribe events | Use returned function | `off_event()` |
| Unsubscribe connection | Use returned function | `off_connection()` |
| Unsubscribe errors | Use returned function | `off_error()` |

**Pattern difference:** Node returns unsubscribe functions from `on*` methods. Python provides explicit `off_*` methods.

## 8. User Service

| Method | Node | Python |
|--------|------|--------|
| Get current user | `getCurrentUser()` | `get_current_user()` |

## 9. Exceptions

| Feature | Node | Python |
|---------|------|--------|
| Base error | `KadoaSdkException` | `KadoaSdkError` |
| HTTP error | `KadoaHttpException` | `KadoaHttpError` |
| Error codes | `KadoaErrorCode` | `KadoaErrorCode` |
| Create from error | `from()` | `from_error()` |
| Wrap error | `wrap()` | `wrap()` |
| Check instance | `isInstance()` | `is_instance()` |
| Serialize | `toJSON()` | `to_json()` |
| Detailed string | `toDetailedString()` | `to_detailed_string()` |
| HTTP status mapping | `mapStatusToCode()` | `map_status_to_code()` |
| From HTTP error | `fromAxiosError()` | `from_api_exception()` |

## 10. Utilities

| Feature | Node | Python |
|---------|------|--------|
| Polling utility | `pollUntil()` | `poll_until()` |
| Polling options type | `PollingOptions` | `PollingOptions` |
| Pagination iterator | `PagedIterator` class | Inline generators |
| Version check | `checkForUpdates()` | N/A |
| Additional data validation | `validateAdditionalData()` | N/A |
| Logger utilities | `createLogger()` | Logger functions |

---

## Conventions

### Naming Conventions

| Concept | Node | Python |
|---------|------|--------|
| Method names | camelCase | snake_case |
| Base exception | `KadoaSdkException` | `KadoaSdkError` |
| HTTP exception | `KadoaHttpException` | `KadoaHttpError` |

### Pattern Differences

| Feature | Node | Python |
|---------|------|--------|
| Realtime unsubscribe | Returns function | Explicit `off_*` methods |
| Pagination | `PagedIterator` class | Inline generators |
| Axios error handling | `fromAxiosError()` | `from_api_exception()` |

### SDK-Specific Features

Node-only features:

- `checkForUpdates()` — Version update checker
- `validateAdditionalData()` — Additional data validation
- `PagedIterator` — Reusable pagination class

Python-only features:

- `makeRawRequest()` — Raw API request method on client
- `build_json()` — JSON export from SchemaBuilder
