"""
Entity detection functionality for dynamic field extraction.
"""

from typing import Dict
from urllib.parse import urljoin

from kadoa_sdk.kadoa_sdk import KadoaSdk
from kadoa_sdk.exceptions import KadoaSdkException, KadoaHttpException, KadoaErrorCode
from kadoa_sdk.extraction.constants import DEFAULT_API_BASE_URL, ENTITY_API_ENDPOINT, ERROR_MESSAGES
from kadoa_sdk.extraction.types import EntityPrediction, EntityRequestOptions, EntityResponse

def _validate_entity_options(options: EntityRequestOptions) -> None:
    """Validate entity request options."""
    if not options.link:
        raise KadoaSdkException(
            ERROR_MESSAGES["LINK_REQUIRED"],
            code=KadoaErrorCode.VALIDATION_ERROR,
            details={"options": options.__dict__},
        )


def _build_request_headers(sdk: KadoaSdk) -> Dict[str, str]:
    """Build request headers including API key authentication."""
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    # Extract API key from configuration
    if hasattr(sdk.configuration, "api_key") and sdk.configuration.api_key:
        api_key_dict = sdk.configuration.api_key
        if isinstance(api_key_dict, dict) and "ApiKeyAuth" in api_key_dict:
            headers["X-API-Key"] = api_key_dict["ApiKeyAuth"]
        else:
            raise KadoaSdkException(
                ERROR_MESSAGES["NO_API_KEY"],
                code=KadoaErrorCode.AUTH_ERROR,
                details={"has_config": True, "api_key_type": type(api_key_dict).__name__},
            )
    else:
        raise KadoaSdkException(
            ERROR_MESSAGES["NO_API_KEY"],
            code=KadoaErrorCode.AUTH_ERROR,
            details={"has_config": bool(sdk.configuration)},
        )

    return headers


def _get_error_code_from_status(status: int) -> KadoaErrorCode:
    """Map HTTP status codes to appropriate error codes."""
    if status in (401, 403):
        return KadoaErrorCode.AUTH_ERROR
    if status == 404:
        return KadoaErrorCode.NOT_FOUND
    if status == 429:
        return KadoaErrorCode.RATE_LIMITED
    if 400 <= status < 500:
        return KadoaErrorCode.VALIDATION_ERROR
    if status >= 500:
        return KadoaErrorCode.HTTP_ERROR
    return KadoaErrorCode.UNKNOWN


def _handle_error_response(response, url: str, link: str) -> None:
    """Handle API error responses and raise appropriate exceptions."""
    error_data = {}
    error_text = ""

    try:
        error_text = response.text
        error_data = response.json() if error_text else {}
    except Exception:
        error_data = {"message": error_text or response.reason}

    base_error_options = {
        "http_status": response.status_code,
        "endpoint": url,
        "method": "POST",
        "response_body": error_data,
        "details": {"url": url, "link": link},
    }

    if response.status_code == 401:
        raise KadoaHttpException(
            ERROR_MESSAGES["AUTH_FAILED"], code=KadoaErrorCode.AUTH_ERROR, **base_error_options
        )

    if response.status_code == 429:
        raise KadoaHttpException(
            ERROR_MESSAGES["RATE_LIMITED"], code=KadoaErrorCode.RATE_LIMITED, **base_error_options
        )

    if response.status_code >= 500:
        raise KadoaHttpException(
            ERROR_MESSAGES["SERVER_ERROR"], code=KadoaErrorCode.HTTP_ERROR, **base_error_options
        )

    raise KadoaHttpException(
        f"Failed to fetch entity fields: {error_data.get('message', response.reason)}",
        code=_get_error_code_from_status(response.status_code),
        **base_error_options,
    )


def fetch_entity_fields(sdk: KadoaSdk, options: EntityRequestOptions) -> EntityPrediction:
    """
    Fetch entity fields dynamically from the /v4/entity endpoint.

    This is a workaround implementation using requests since the endpoint
    is not yet included in the OpenAPI specification.

    Args:
        sdk: The Kadoa sdk instance containing configuration
        options: Request options including the link to analyze

    Returns:
        EntityPrediction containing the detected entity type and fields

    Raises:
        KadoaSdkException: If validation fails or no predictions are returned
        KadoaHttpException: If the API request fails
    """
    _validate_entity_options(options)

    url = urljoin(sdk.base_url or DEFAULT_API_BASE_URL, ENTITY_API_ENDPOINT)
    headers = _build_request_headers(sdk)
    request_body = options.to_dict()

    try:
        response = sdk.session.post(url, headers=headers, json=request_body)
    except Exception as error:
        raise KadoaSdkException(
            ERROR_MESSAGES["NETWORK_ERROR"],
            code=KadoaErrorCode.NETWORK_ERROR,
            details={"url": url, "link": options.link},
            cause=error,
        )

    if not response.ok:
        _handle_error_response(response, url, options.link)

    try:
        data = response.json()
    except Exception as error:
        raise KadoaSdkException(
            ERROR_MESSAGES["PARSE_ERROR"],
            code=KadoaErrorCode.INTERNAL_ERROR,
            details={"url": url, "link": options.link},
            cause=error,
        )

    entity_response = EntityResponse.from_dict(data)

    if not entity_response.success or not entity_response.entity_prediction:
        raise KadoaSdkException(
            ERROR_MESSAGES["NO_PREDICTIONS"],
            code=KadoaErrorCode.NOT_FOUND,
            details={
                "success": entity_response.success,
                "has_predictions": bool(entity_response.entity_prediction),
                "prediction_count": (
                    len(entity_response.entity_prediction)
                    if entity_response.entity_prediction
                    else 0
                ),
                "link": options.link,
            },
        )

    return entity_response.entity_prediction[0]
