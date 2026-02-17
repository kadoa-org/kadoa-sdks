"""Seeder utilities for E2E tests."""

from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:  # pragma: no cover
    from kadoa_sdk import KadoaClient
from kadoa_sdk.extraction.types import ExtractOptions, RunWorkflowOptions
from kadoa_sdk.validation import GenerateRuleRequest


def seed_schema(
    request: dict[str, Any],
    client: "KadoaClient",
) -> dict[str, str]:
    """
    Seed a schema for testing (idempotent).

    Args:
        request: Schema creation request dict with name, entity, fields
        client: KadoaClient instance

    Returns:
        Dictionary with schema_id
    """
    from kadoa_sdk.schemas.schemas_acl import (
        CreateSchemaRequest,
        DataField,
        FieldExample,
        SchemaField,
    )

    name = request.get("name", "")
    print(f"[Seeder] Seeding schema: {name}")

    # Check if schema already exists
    schemas = client.schema.list_schemas()
    existing = next((s for s in schemas if s.name == name), None)
    if existing and existing.id:
        print(f"[Seeder] Schema {name} already exists: {existing.id}")
        return {"schema_id": existing.id}

    # Build schema fields from request
    fields = []
    for field_dict in request.get("fields", []):
        field = SchemaField(
            actual_instance=DataField(
                name=field_dict.get("name"),
                description=field_dict.get("description"),
                fieldType=field_dict.get("fieldType", "SCHEMA"),
                dataType=field_dict.get("dataType", "STRING"),
                example=FieldExample(actual_instance=field_dict.get("example"))
                if field_dict.get("example")
                else None,
            )
        )
        fields.append(field)

    create_request = CreateSchemaRequest(
        name=name,
        entity=request.get("entity"),
        fields=fields,
    )

    schema = client.schema.create_schema(create_request)
    print(f"[Seeder] Schema {name} seeded: {schema.id}")
    return {"schema_id": schema.id}


def seed_workflow(
    name: str,
    client: "KadoaClient",
    run_job: bool = False,
    additional_data: Optional[dict] = None,
) -> dict:
    """
    Seed a workflow for testing.

    Args:
        name: Workflow name
        client: KadoaClient instance
        run_job: Whether to run a job after creating the workflow
        additional_data: Additional data to include

    Returns:
        Dictionary with workflow_id and optionally job_id
    """
    print(f"[Seeder] Seeding workflow: {name}")

    # Check if workflow already exists
    existing_workflow = client.workflow.get_by_name(name)
    if existing_workflow:
        workflow_id = (
            existing_workflow.get("_id")
            if isinstance(existing_workflow, dict)
            else getattr(existing_workflow, "_id", None)
            or (
                existing_workflow.get("id")
                if isinstance(existing_workflow, dict)
                else getattr(existing_workflow, "id", None)
            )
        )
        print(f"[Seeder] Workflow {name} already exists: {workflow_id}")

        if run_job:
            # Check if job already exists
            existing_job_id = (
                existing_workflow.get("jobId")
                if isinstance(existing_workflow, dict)
                else getattr(existing_workflow, "jobId", None)
                or (
                    existing_workflow.get("job_id")
                    if isinstance(existing_workflow, dict)
                    else getattr(existing_workflow, "job_id", None)
                )
            )

            if not existing_job_id:
                # Run a new job
                job_result = client.workflow.run_workflow(
                    workflow_id, input=RunWorkflowOptions(limit=10)
                )
                job_id = getattr(job_result, "job_id", None) or getattr(job_result, "jobId", None)
                print(f"[Seeder] Job {name} seeded: {job_id}")
                return {"workflow_id": workflow_id, "job_id": job_id}

            return {"workflow_id": workflow_id, "job_id": existing_job_id}

        return {"workflow_id": workflow_id}

    # Create new workflow
    created_extraction = (
        client.extract(
            ExtractOptions(
                urls=["https://sandbox.kadoa.com/careers"],
                name=name,
                additional_data=additional_data,
            )
        )
        .bypass_preview()
        .create()
    )

    workflow_id = created_extraction.workflow_id
    print(f"[Seeder] Workflow {name} seeded: {workflow_id}")

    if run_job:
        # Run the workflow
        job_result = client.workflow.run_workflow(
            workflow_id, input=RunWorkflowOptions(limit=10)
        )
        job_id = getattr(job_result, "job_id", None) or getattr(job_result, "jobId", None)
        print(f"[Seeder] Job {name} seeded: {job_id}")
        return {"workflow_id": workflow_id, "job_id": job_id}

    # Verify workflow was created
    created_workflow = client.workflow.get_by_name(name)
    if not created_workflow:
        raise Exception("[Seeder] This should never happen")

    return {"workflow_id": workflow_id}


def seed_rule(
    name: str,
    workflow_id: str,
    client: "KadoaClient",
) -> str:
    """
    Seed a validation rule for testing.

    Args:
        name: Rule name
        workflow_id: Workflow ID
        client: KadoaClient instance

    Returns:
        Rule ID
    """
    print(f"[Seeder] Seeding rule: {name}")

    existing_rule = client.validation.rules.get_rule_by_name(name)
    if existing_rule:
        rule_id = (
            existing_rule.id
            if hasattr(existing_rule, "id")
            else (existing_rule.get("id") if isinstance(existing_rule, dict) else None)
        )
        print(f"[Seeder] Rule {name} already exists: {rule_id}")
        return rule_id

    rule = client.validation.rules.generate_rule(
        GenerateRuleRequest(
            user_prompt="Flag rows where title length exceeds 15 characters",
            workflow_id=workflow_id,
        )
    )

    rule_id = (
        rule.id if hasattr(rule, "id") else (rule.get("id") if isinstance(rule, dict) else None)
    )
    print(f"[Seeder] Rule {name} seeded: {rule_id}")
    return rule_id


def seed_validation(
    workflow_id: str,
    job_id: str,
    client: "KadoaClient",
) -> str:
    """
    Seed a validation for testing.

    Args:
        workflow_id: Workflow ID
        job_id: Job ID
        client: KadoaClient instance

    Returns:
        Validation ID
    """
    print(f"[Seeder] Seeding validation: {workflow_id}")

    existing_validation = client.validation.get_latest(workflow_id, job_id)

    if existing_validation:
        validation_id = (
            existing_validation.id
            if hasattr(existing_validation, "id")
            else (existing_validation.get("id") if isinstance(existing_validation, dict) else None)
        )

        # Check if validation has errors or anomalies
        has_error = getattr(existing_validation, "error", None) or (
            existing_validation.get("error") if isinstance(existing_validation, dict) else None
        )

        anomalies_count = (
            getattr(existing_validation, "anomalies_count_total", None)
            or getattr(existing_validation, "anomaliesCountTotal", None)
            or (
                existing_validation.get("anomalies_count_total")
                if isinstance(existing_validation, dict)
                else None
            )
            or (
                existing_validation.get("anomaliesCountTotal")
                if isinstance(existing_validation, dict)
                else None
            )
        )

        if validation_id and not has_error and (anomalies_count or 0) > 0:
            print(
                f"[Seeder] Found existing validation: {validation_id} "
                f"[anomalies: {anomalies_count}]"
            )
            return validation_id

    result = client.validation.schedule(workflow_id, job_id)

    validation_id = (
        result.validation_id
        if hasattr(result, "validation_id")
        else (
            result.get("validation_id")
            if isinstance(result, dict)
            else getattr(result, "validationId", None)
            or (result.get("validationId") if isinstance(result, dict) else None)
        )
    )

    # Wait for validation to complete
    client.validation.wait_until_completed(
        validation_id,
        poll_interval_ms=2000,
        timeout_ms=60000,
    )

    return validation_id
