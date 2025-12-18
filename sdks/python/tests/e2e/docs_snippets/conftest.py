"""Fixtures for docs snippets tests."""

import pytest

from tests.utils.client_factory import create_client
from tests.utils.cleanup_helpers import clear_tracked_workflows, get_tracked_workflows
from tests.utils.shared_fixtures import get_docs_workflow_fixture, get_shared_validation_fixture


@pytest.fixture(scope="session")
def client():
    """Session-scoped client for docs snippets tests."""
    c = create_client()
    yield c
    # Cleanup tracked workflows
    for wf_id in get_tracked_workflows():
        try:
            c.workflow.delete(wf_id)
        except Exception:
            pass
    clear_tracked_workflows()
    c.dispose()


@pytest.fixture(scope="session")
def fixture_workflow_id(client) -> str:
    """Get shared workflow for docs tests."""
    return get_docs_workflow_fixture(client)


@pytest.fixture(scope="session")
def fixture_validation(client):
    """Get shared validation fixture."""
    return get_shared_validation_fixture(client)
