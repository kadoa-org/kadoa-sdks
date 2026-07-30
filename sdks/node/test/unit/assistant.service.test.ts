import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaSdkException } from "../../src/runtime/exceptions";

const mockPrompt = mock();
const mockUpdate = mock();
const mockPauseState = mock();
const mockAnswer = mock();
const mockStrategy = mock();
const mockInterrupt = mock();
const mockResume = mock();
const mockStop = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  Object.assign(client.apis.agent, {
    v5AgentPrompt: mockPrompt,
    v5AgentWorkflowAssistantMessage: mockUpdate,
    v5AgentPauseState: mockPauseState,
    v5AgentAnswer: mockAnswer,
    v5AgentStrategy: mockStrategy,
    v5AgentInterrupt: mockInterrupt,
    v5AgentResume: mockResume,
    v5AgentStop: mockStop,
  });
  return client;
}

const createData = {
  workflowId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  threadId: "33333333-3333-4333-8333-333333333333",
  jobId: "job-1",
  inputEventId: "event-1",
  existed: false,
};

const updateData = {
  workflowId: "11111111-1111-4111-8111-111111111111",
  sessionId: "22222222-2222-4222-8222-222222222222",
  threadId: "33333333-3333-4333-8333-333333333333",
  jobId: "job-1",
  inputEventId: "event-1",
  alreadyBootstrapped: true,
};

const pauseState = {
  paused: true,
  pause: {
    id: "question-1",
    reason: "question" as const,
    status: "active" as const,
    threadId: updateData.threadId,
    pausedAt: "2026-07-28T10:00:00.000Z",
  },
  pendingQuestion: {
    questionId: "question-1",
    threadId: updateData.threadId,
    questions: [
      {
        header: "Source",
        question: "Which source should be used?",
        answerType: "freeform" as const,
        options: [],
        metadata: { customerSafe: true },
      },
    ],
    askedAt: "2026-07-28T10:00:00.000Z",
  },
};

const strategy = {
  approach: "direct-api",
  summary: "Reads the public JSON API.",
  dataSource: {
    type: "api",
    endpoints: ["/v1/items"],
    interactionStyle: "request-response",
    selectors: [],
  },
  intervalSeconds: null,
};

describe("AssistantService", () => {
  beforeEach(() => {
    mockPrompt.mockReset();
    mockUpdate.mockReset();
    mockPauseState.mockReset();
    mockAnswer.mockReset();
    mockStrategy.mockReset();
    mockInterrupt.mockReset();
    mockResume.mockReset();
    mockStop.mockReset();
  });

  test("creates a realtime workflow through the agent prompt API", async () => {
    mockPrompt.mockResolvedValueOnce({
      data: {
        data: createData,
        status: "success",
        message: "Agent prompt accepted",
      },
    });
    const client = createTestClient();

    const result = await client.assistant.createRealtimeWorkflow({
      instructions: "Monitor https://example.com for price changes",
      notificationChannelIds: ["11111111-1111-4111-8111-111111111111"],
      tags: ["mcp"],
      newSessionId: "22222222-2222-4222-8222-222222222222",
    });

    expect(mockPrompt).toHaveBeenCalledWith({
      agentPromptRequest: {
        prompt: "Monitor https://example.com for price changes",
        productType: "realtime",
        notificationChannelIds: ["11111111-1111-4111-8111-111111111111"],
        tags: ["mcp"],
        newSessionId: "22222222-2222-4222-8222-222222222222",
      },
    });
    expect(result).toEqual(createData);
  });

  test("preserves a nullable realtime creation job id", async () => {
    mockPrompt.mockResolvedValueOnce({
      data: {
        data: { ...createData, jobId: null },
        status: "success",
        message: "Agent prompt accepted",
      },
    });

    const result = await createTestClient().assistant.createRealtimeWorkflow({
      instructions: "Monitor https://example.com for price changes",
      notificationChannelIds: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result.jobId).toBeNull();
  });

  test.each([
    ["workflowId", { ...createData, workflowId: "" }],
    ["sessionId", { ...createData, sessionId: "" }],
    ["threadId", { ...createData, threadId: "" }],
    [
      "jobId",
      (() => {
        const data = { ...createData };
        delete (data as { jobId?: string | null }).jobId;
        return data;
      })(),
    ],
  ])("rejects malformed realtime creation responses missing %s", async (_field, data) => {
    mockPrompt.mockResolvedValueOnce({
      data: {
        data,
        status: "success",
        message: "Agent prompt accepted",
      },
    });

    await expect(
      createTestClient().assistant.createRealtimeWorkflow({
        instructions: "Monitor https://example.com for price changes",
        notificationChannelIds: ["11111111-1111-4111-8111-111111111111"],
      }),
    ).rejects.toBeInstanceOf(KadoaSdkException);
  });

  test("rejects malformed realtime creation success envelopes", async () => {
    mockPrompt.mockResolvedValueOnce({
      data: { status: "success", message: "Agent prompt accepted" },
    });

    await expect(
      createTestClient().assistant.createRealtimeWorkflow({
        instructions: "Monitor https://example.com for price changes",
        notificationChannelIds: ["11111111-1111-4111-8111-111111111111"],
      }),
    ).rejects.toBeInstanceOf(KadoaSdkException);
  });

  test("requests an identity-preserving workflow update", async () => {
    mockUpdate.mockResolvedValueOnce({
      data: { data: updateData, status: "success", message: "Message sent" },
    });
    const client = createTestClient();

    const result = await client.assistant.requestWorkflowUpdate(
      updateData.workflowId,
      {
        instructions: "Add pagination",
        threadId: updateData.threadId,
      },
    );

    expect(mockUpdate).toHaveBeenCalledWith({
      workflowId: updateData.workflowId,
      workflowAssistantMessageRequest: {
        prompt: "Add pagination",
        threadId: updateData.threadId,
      },
    });
    expect(result).toEqual(updateData);
  });

  test("preserves a nullable dispatch job id", async () => {
    mockUpdate.mockResolvedValueOnce({
      data: {
        data: { ...updateData, jobId: null },
        status: "success",
        message: "Message sent",
      },
    });
    const result = await createTestClient().assistant.requestWorkflowUpdate(
      updateData.workflowId,
      {
        instructions: "Repair pagination",
      },
    );

    expect(result.jobId).toBeNull();
  });

  test("rejects a malformed successful update response", async () => {
    mockUpdate.mockResolvedValueOnce({
      data: {
        data: { ...updateData, workflowId: undefined },
        status: "success",
        message: "Message sent",
      },
    });

    await expect(
      createTestClient().assistant.requestWorkflowUpdate(
        updateData.workflowId,
        { instructions: "Add pagination" },
      ),
    ).rejects.toBeInstanceOf(KadoaSdkException);
  });

  test("returns durable pause state without dropping question metadata", async () => {
    mockPauseState.mockResolvedValueOnce({
      data: { data: pauseState, status: "success" },
    });

    const result = await createTestClient().assistant.getPauseState(
      updateData.sessionId,
    );

    expect(mockPauseState).toHaveBeenCalledWith({
      sessionId: updateData.sessionId,
    });
    expect(result).toEqual(pauseState);
    expect(result.pendingQuestion?.questions[0]?.metadata).toEqual({
      customerSafe: true,
    });
  });

  test("submits a structured question answer", async () => {
    mockAnswer.mockResolvedValueOnce({
      data: {
        data: { success: true },
        status: "success",
        message: "Answer submitted successfully",
      },
    });
    const client = createTestClient();

    const result = await client.assistant.answerQuestion({
      sessionId: updateData.sessionId,
      questionId: "question-1",
      threadId: updateData.threadId,
      answers: { _freeform: "Use the API" },
    });

    expect(mockAnswer).toHaveBeenCalledWith({
      assistantAnswerRequest: {
        sessionId: updateData.sessionId,
        questionId: "question-1",
        threadId: updateData.threadId,
        answers: { _freeform: "Use the API" },
      },
    });
    expect(result).toEqual({ success: true });
  });

  test("returns the current extraction strategy", async () => {
    mockStrategy.mockResolvedValueOnce({
      data: { data: { strategy }, status: "success" },
    });

    const result = await createTestClient().assistant.getStrategy(
      updateData.sessionId,
    );

    expect(mockStrategy).toHaveBeenCalledWith({
      sessionId: updateData.sessionId,
    });
    expect(result).toEqual(strategy);
  });

  test("returns null when no build strategy exists", async () => {
    mockStrategy.mockResolvedValueOnce({
      data: { data: { strategy: null }, status: "success" },
    });

    expect(
      await createTestClient().assistant.getStrategy(updateData.sessionId),
    ).toBeNull();
  });

  test("interrupts an Assistant session and preserves delivery state", async () => {
    mockInterrupt.mockResolvedValueOnce({
      data: { data: { success: true, delivery: "durable" }, status: "success" },
    });

    const result = await createTestClient().assistant.interrupt(
      updateData.sessionId,
    );

    expect(mockInterrupt).toHaveBeenCalledWith({
      sessionId: updateData.sessionId,
    });
    expect(result).toEqual({ success: true, delivery: "durable" });
  });

  test("resumes an Assistant session and returns the new execution", async () => {
    mockResume.mockResolvedValueOnce({
      data: {
        data: { sessionId: updateData.sessionId, jobId: "resume-job-1" },
        status: "success",
        message: "Session resume started",
      },
    });

    const result = await createTestClient().assistant.resume(
      updateData.sessionId,
    );

    expect(mockResume).toHaveBeenCalledWith({
      sessionId: updateData.sessionId,
    });
    expect(result).toEqual({
      sessionId: updateData.sessionId,
      jobId: "resume-job-1",
    });
  });

  test("stops an Assistant session", async () => {
    mockStop.mockResolvedValueOnce({
      data: { data: { success: true }, status: "success" },
    });

    const result = await createTestClient().assistant.stop(
      updateData.sessionId,
    );

    expect(mockStop).toHaveBeenCalledWith({ sessionId: updateData.sessionId });
    expect(result).toEqual({ success: true });
  });

  test("propagates generated API errors", async () => {
    mockPauseState.mockRejectedValueOnce(new Error("manager unavailable"));

    await expect(
      createTestClient().assistant.getPauseState(updateData.sessionId),
    ).rejects.toThrow("manager unavailable");
  });
});
