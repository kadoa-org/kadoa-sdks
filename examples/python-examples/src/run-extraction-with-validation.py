#!/usr/bin/env python3
"""
Run extraction with validation example for Kadoa SDK.
"""

import sys
import time

from kadoa_sdk import KadoaClient, KadoaClientConfig
from kadoa_sdk.core.settings import get_settings
from kadoa_sdk.core.utils import PollingOptions, poll_until
from kadoa_sdk.extraction.types import ExtractOptions
from kadoa_sdk.notifications import NotificationOptions
from kadoa_sdk.validation import BulkApproveRulesRequest, ListRulesRequest


def main():
    settings = get_settings()

    client = KadoaClient(
        KadoaClientConfig(
            api_key=settings.api_key,
            enable_realtime=True,
        )
    )

    try:
        print("Running extraction with validation...")
        realtime = client.connect_realtime()
        if realtime:
            realtime.on_event(lambda event: print("event: ", event))

        # Use extraction builder API for notifications
        created_extraction = (
            client.extract(
                ExtractOptions(
                    urls=["https://sandbox.kadoa.com/ecommerce"],
                    name="Extraction with Validation",
                    bypass_preview=False,  # skipped by default
                )
            )
            .with_notifications(
                NotificationOptions(
                    events="all",
                    channels={"WEBSOCKET": True},
                )
            )
            .set_interval({"interval": "ONLY_ONCE"})
            .create()
        )

        result = created_extraction.run()

        # Rule suggestion is asynchronous process so we need to wait for it to complete
        rules_result = poll_until(
            lambda: client.validation.rules.list_rules(
                ListRulesRequest(workflow_id=result.workflow_id)
            ),
            lambda result: len(result.data if hasattr(result, "data") else result) > 0,
            PollingOptions(poll_interval_ms=10000, timeout_ms=30000),
        )
        rules = rules_result.result
        rules_data = rules.data if hasattr(rules, "data") else rules

        if len(rules_data) == 0:
            print("No rules found")
            return

        # Approve rules
        approved_rules = client.validation.rules.bulk_approve_rules(
            BulkApproveRulesRequest(
                workflow_id=result.workflow_id,
                rule_ids=[rule.id for rule in rules_data],
            )
        )
        print("approvedRules: ", approved_rules)

        # Schedule validation
        res = client.validation.schedule(result.workflow_id, result.job_id)

        # Give Kadoa some time to start validation
        time.sleep(1)

        validation = client.validation.wait_until_completed(res.validation_id)

        print("validation: ", validation)

        # Get validation anomalies
        anomalies = client.validation.get_anomalies(res.validation_id)

        print("anomalies: ", anomalies)
    finally:
        client.dispose()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)
