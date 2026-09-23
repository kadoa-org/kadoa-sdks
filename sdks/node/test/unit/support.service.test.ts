import { describe, expect, mock, test } from "bun:test";
import { AxiosError, type AxiosResponse } from "axios";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaHttpException } from "../../src/runtime/exceptions";

const mockPost = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  (client.apis.support as any).v4SupportIssuesPost = mockPost;
  return client;
}

const options = {
  workflowId: "44444444-4444-4444-4444-444444444444",
  title: "Extraction returns no rows",
  description: "The last three runs finished with zero records.",
};

function httpError(status: number, body: unknown) {
  return new KadoaHttpException(`HTTP ${status}`, {
    httpStatus: status,
    responseBody: body,
  });
}

describe("SupportService.createIssue", () => {
  test("posts the ticket and reports it accepted", async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, supportRequestId: "sr-1", status: "accepted" },
    });

    const result = await createTestClient().support.createIssue(options);

    // v4 requires a category; workflow tickets default to workflow_issue.
    expect(mockPost).toHaveBeenCalledWith({
      v4SupportIssuesPostRequest: { ...options, category: "workflow_issue" },
    });
    expect(result).toEqual({ status: "accepted", supportRequestId: "sr-1" });
  });

  test("keeps an explicit category", async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, supportRequestId: "sr-1" },
    });

    await createTestClient().support.createIssue({
      ...options,
      category: "integration",
    });

    expect(
      mockPost.mock.calls.at(-1)?.[0].v4SupportIssuesPostRequest.category,
    ).toBe("integration");
  });

  test("forwards the Assistant session so the ticket is linked to it", async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, supportRequestId: "sr-1" },
    });

    await createTestClient().support.createIssue({
      ...options,
      copilotSessionId: "55555555-5555-4555-8555-555555555555",
    });

    expect(
      mockPost.mock.calls.at(-1)?.[0].v4SupportIssuesPostRequest
        .copilotSessionId,
    ).toBe("55555555-5555-4555-8555-555555555555");
  });

  test("never sends pauseWorkflow", async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: true, supportRequestId: "sr-1" },
    });

    await createTestClient().support.createIssue({
      ...options,
      pauseWorkflow: true,
    } as never);

    expect(
      mockPost.mock.calls.at(-1)?.[0].v4SupportIssuesPostRequest,
    ).not.toHaveProperty("pauseWorkflow");
  });

  test("treats an already-open ticket as a reuse, not an error", async () => {
    mockPost.mockRejectedValueOnce(
      httpError(409, {
        error: "Workflow already has an open support issue",
        supportRequestId: "sr-9",
        issueId: "KAD-1234",
      }),
    );

    const result = await createTestClient().support.createIssue(options);

    expect(result).toEqual({
      status: "existing",
      supportRequestId: "sr-9",
      issueIdentifier: "KAD-1234",
      message: "Workflow already has an open support issue",
    });
  });

  test("still identifies the open ticket when the 409 carries no issue identifier", async () => {
    mockPost.mockRejectedValueOnce(
      httpError(409, { supportRequestId: "sr-9" }),
    );

    const result = await createTestClient().support.createIssue(options);

    expect(result).toMatchObject({
      status: "existing",
      supportRequestId: "sr-9",
    });
    expect(result.status === "existing" && result.issueIdentifier).toBeFalsy();
  });

  test("reports a skipped ticket with its reason", async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        skipped: true,
        reason: "RUN_PARKED_FOR_REVIEW",
        supportRequestId: "sr-3",
      },
    });

    const result = await createTestClient().support.createIssue(options);

    expect(result).toEqual({
      status: "skipped",
      supportRequestId: "sr-3",
      reason: "RUN_PARKED_FOR_REVIEW",
    });
  });

  test("rethrows any failure other than an already-open ticket", async () => {
    mockPost.mockRejectedValueOnce(
      httpError(502, { error: "Failed to queue support issue creation" }),
    );

    await expect(
      createTestClient().support.createIssue(options),
    ).rejects.toBeInstanceOf(KadoaHttpException);
  });
});

/**
 * The tests above throw a hand-built KadoaHttpException. This one goes through the real
 * axios adapter and interceptor, so a regression that dropped the 409 response body on the
 * way to KadoaHttpException would surface here.
 */
describe("SupportService.createIssue over the real HTTP error path", () => {
  test("maps a real 409 response to an existing ticket", async () => {
    const client = new KadoaClient({ apiKey: "tk-test" });
    client.axiosInstance.defaults.adapter = async (config) => {
      const response = {
        data: {
          error: "Workflow already has an open support issue",
          supportRequestId: "sr-9",
          issueId: "KAD-1234",
        },
        status: 409,
        statusText: "Conflict",
        headers: {},
        config,
      } as AxiosResponse;
      const error = new AxiosError(
        "Request failed with status code 409",
        AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        response,
      );
      throw error;
    };

    const result = await client.support.createIssue(options);

    expect(result).toEqual({
      status: "existing",
      supportRequestId: "sr-9",
      issueIdentifier: "KAD-1234",
      message: "Workflow already has an open support issue",
    });
  });
});
