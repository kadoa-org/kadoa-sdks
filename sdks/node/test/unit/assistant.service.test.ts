import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("../../src/runtime/utils/version-check", () => ({
  checkForUpdates: () => Promise.resolve(),
}));

import { KadoaClient } from "../../src/client/kadoa-client";
import { KadoaSdkException } from "../../src/runtime/exceptions";

const mockUpdate = mock();
const mockPauseState = mock();
const mockAnswer = mock();
const mockStrategy = mock();

function createTestClient(): KadoaClient {
  const client = new KadoaClient({ apiKey: "tk-test" });
  const agent = (client.apis as any).agent;
  agent.v5AgentWorkflowAssistantMessage = mockUpdate;
  agent.v5AgentPauseState = mockPauseState;
  agent.v5AgentAnswer = mockAnswer;
  agent.v5AgentStrategy = mockStrategy;
  return client;
}

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
    mockUpdate.mockReset();
    mockPauseState.mockReset();
    mockAnswer.mockReset();
    mockStrategy.mockReset();
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

  test("propagates generated API errors", async () => {
    mockPauseState.mockRejectedValueOnce(new Error("manager unavailable"));

    await expect(
      createTestClient().assistant.getPauseState(updateData.sessionId),
    ).rejects.toThrow("manager unavailable");
  });
});
