from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from ..client import KadoaClient
from .commands import RunExtractionCommand
from .types import ExtractionOptions, ExtractionResult


class ExtractionModule:
    def __init__(self, client: "KadoaClient") -> None:
        self._run_command = RunExtractionCommand(client)

    def run(self, options: ExtractionOptions) -> ExtractionResult:
        return self._run_command.execute(options)


def run_extraction(client: "KadoaClient", options: ExtractionOptions) -> ExtractionResult:
    return client.extraction.run(options)


