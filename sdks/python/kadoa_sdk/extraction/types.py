"""
Type definitions for extraction module.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Literal
from enum import Enum


class NavigationMode(str, Enum):
    """Navigation modes for extraction workflows."""

    SINGLE_PAGE = "single-page"
    MULTI_PAGE = "multi-page"
    CRAWL = "crawl"


@dataclass
class Location:
    """Location configuration for extraction."""

    type: str = "auto"
    country: Optional[str] = None
    region: Optional[str] = None


@dataclass
class EntityField:
    """Represents a field in the entity schema."""

    name: str
    description: str
    example: str
    data_type: str

    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary for API requests."""
        return {
            "name": self.name,
            "description": self.description,
            "example": self.example,
            "dataType": self.data_type,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EntityField":
        """Create from API response dictionary."""
        return cls(
            name=data.get("name", ""),
            description=data.get("description", ""),
            example=data.get("example", ""),
            data_type=data.get("dataType", "STRING"),
        )


@dataclass
class EntityPrediction:
    """Entity prediction result from the API."""

    entity: str
    fields: List[EntityField]
    confidence: Optional[float] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EntityPrediction":
        """Create from API response dictionary."""
        fields = [
            EntityField.from_dict(f) if isinstance(f, dict) else f for f in data.get("fields", [])
        ]
        return cls(entity=data.get("entity", ""), fields=fields, confidence=data.get("confidence"))


@dataclass
class EntityRequestOptions:
    """Options for entity detection request."""

    link: str
    location: Optional[Location] = None
    navigation_mode: str = "single-page"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API request."""
        result = {"link": self.link, "navigationMode": self.navigation_mode}
        if self.location:
            result["location"] = {
                "type": self.location.type,
                **({"country": self.location.country} if self.location.country else {}),
                **({"region": self.location.region} if self.location.region else {}),
            }
        return result


@dataclass
class EntityResponse:
    """Response from entity detection API."""

    success: bool
    entity_prediction: List[EntityPrediction]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EntityResponse":
        """Create from API response dictionary."""
        predictions = [
            EntityPrediction.from_dict(p) if isinstance(p, dict) else p
            for p in data.get("entityPrediction", [])
        ]
        return cls(success=data.get("success", False), entity_prediction=predictions)


@dataclass
class ExtractionOptions:
    """Options for running an extraction."""

    urls: List[str]
    navigation_mode: NavigationMode = NavigationMode.SINGLE_PAGE
    name: str = "Untitled Workflow"
    location: Optional[Location] = None
    polling_interval: int = 5000  # milliseconds
    max_wait_time: int = 300000  # milliseconds (5 minutes)
    data_limit: int = 100


@dataclass
class ExtractionConfig:
    """Internal configuration for extraction (with defaults merged)."""

    urls: List[str]
    navigation_mode: str
    name: str
    location: Location
    polling_interval: int
    max_wait_time: int
    data_limit: int

    @classmethod
    def from_options(
        cls, options: ExtractionOptions, defaults: Dict[str, Any]
    ) -> "ExtractionConfig":
        """Create config by merging options with defaults."""
        nav_mode = (
            options.navigation_mode.value
            if isinstance(options.navigation_mode, NavigationMode)
            else options.navigation_mode
        )

        location = options.location or Location(**defaults.get("location", {"type": "auto"}))

        return cls(
            urls=options.urls,
            navigation_mode=nav_mode,
            name=options.name or defaults.get("name", "Untitled Workflow"),
            location=location,
            polling_interval=options.polling_interval or defaults.get("polling_interval", 5000),
            max_wait_time=options.max_wait_time or defaults.get("max_wait_time", 300000),
            data_limit=options.data_limit or defaults.get("data_limit", 100),
        )


@dataclass
class WorkflowStatus:
    """Workflow status information."""

    workflow_id: str
    state: Optional[str] = None
    run_state: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def is_terminal(self) -> bool:
        """Check if workflow is in a terminal state."""
        from .constants import TERMINAL_RUN_STATES

        return self.run_state.upper() in TERMINAL_RUN_STATES if self.run_state else False

    def is_successful(self) -> bool:
        """Check if workflow completed successfully."""
        from .constants import SUCCESSFUL_RUN_STATES

        return self.run_state.upper() in SUCCESSFUL_RUN_STATES if self.run_state else False


@dataclass
class ExtractionResult:
    """Result of an extraction operation."""

    workflow_id: str
    workflow: WorkflowStatus
    data: Optional[List[Dict[str, Any]]] = None
