from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

TResult = TypeVar("TResult")
TParams = TypeVar("TParams")


class Command(ABC, Generic[TResult, TParams]):
    @abstractmethod
    def execute(self, params: TParams) -> TResult:  # pragma: no cover - interface
        raise NotImplementedError


