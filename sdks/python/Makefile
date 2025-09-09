# Makefile for Kadoa Python SDK

.PHONY: help install test test-e2e test-coverage clean lint format audit audit-fix

help:
	@echo "Available commands:"
	@echo "  make install        Install the SDK and dependencies"
	@echo "  make install-dev    Install with development dependencies"
	@echo "  make test           Run all tests"
	@echo "  make test-e2e       Run E2E tests only"
	@echo "  make test-coverage  Run tests with coverage report"
	@echo "  make lint           Run all linting checks (ruff + pylint)"
	@echo "  make format         Format code with black"
	@echo "  make audit          Check for security vulnerabilities in dependencies"
	@echo "  make audit-fix      Attempt to fix security vulnerabilities"
	@echo "  make clean          Clean build artifacts"

install:
	pip install -e .

install-dev:
	pip install -e ".[dev,test]"

test:
	pytest tests -v

test-e2e:
	pytest tests/e2e -v -m e2e

test-coverage:
	pytest tests --cov=kadoa_sdk --cov-report=term-missing --cov-report=html

lint:
	ruff check kadoa_sdk tests

lint-fix:
	ruff check kadoa_sdk tests --fix
	ruff format kadoa_sdk tests

format:
	black kadoa_sdk tests

audit:
	pip-audit --desc

audit-fix:
	pip-audit --fix --desc

clean:
	rm -rf build dist *.egg-info .pytest_cache .coverage htmlcov
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete