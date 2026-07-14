"""Fixtures for docs snippets tests."""

import pytest

from kadoa_sdk.core.http import get_workflows_api
from tests.utils.cleanup_helpers import (
    clear_tracked_workflows,
    get_tracked_workflows,
    track_workflow,
)
from tests.utils.client_factory import create_client
from tests.utils.shared_fixtures import get_docs_workflow_fixture, get_shared_validation_fixture


@pytest.fixture(scope="session")
def client():
    """Session-scoped client for docs snippets tests."""
    c = create_client()
    workflows_api = get_workflows_api(c)
    create_workflow = workflows_api.v4_workflows_post

    def create_and_track(*args, **kwargs):
        response = create_workflow(*args, **kwargs)
        workflow_id = getattr(response, "workflow_id", None) or getattr(
            response, "workflowId", None
        )
        if workflow_id:
            track_workflow(workflow_id)
        return response

    workflows_api.v4_workflows_post = create_and_track
    yield c
    for wf_id in get_tracked_workflows():
        try:
            c.workflow.wait(wf_id, timeout_ms=30 * 60 * 1000)
        except Exception:
            pass
        try:
            c.workflow.delete(wf_id)
        except Exception:
            pass
    clear_tracked_workflows()
    c.dispose()


@pytest.fixture(scope="session")
def workflow_id(client) -> str:
    """Get shared workflow for docs tests."""
    return get_docs_workflow_fixture(client)


@pytest.fixture(scope="session")
def fixture_validation(client):
    """Get shared validation fixture."""
    return get_shared_validation_fixture(client)
