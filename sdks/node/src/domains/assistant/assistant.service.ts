import { KadoaSdkException } from "../../runtime/exceptions";
import type {
  AgentApiInterface,
  AssistantExtractionStrategy,
  AssistantPauseState,
  AssistantQuestionAnswerInput,
  AssistantQuestionAnswerResult,
  WorkflowAssistantUpdateAccepted,
  WorkflowAssistantUpdateInput,
} from "./assistant.acl";

export class AssistantService {
  constructor(private readonly agentApi: AgentApiInterface) {}

  async requestWorkflowUpdate(
    workflowId: string,
    input: WorkflowAssistantUpdateInput,
  ): Promise<WorkflowAssistantUpdateAccepted> {
    const response = await this.agentApi.v5AgentWorkflowAssistantMessage({
      workflowId,
      workflowAssistantMessageRequest: {
        prompt: input.instructions,
        ...(input.threadId != null && { threadId: input.threadId }),
      },
    });
    const data = response.data?.data;

    if (!data?.workflowId || !data.sessionId || !data.threadId) {
      throw new KadoaSdkException(
        "Workflow Assistant update response is missing required identifiers",
        {
          code: "INTERNAL_ERROR",
          details: { workflowId, response: response.data },
        },
      );
    }

    return data;
  }

  async getPauseState(sessionId: string): Promise<AssistantPauseState> {
    const response = await this.agentApi.v5AgentPauseState({ sessionId });
    return response.data.data;
  }

  async answerQuestion(
    input: AssistantQuestionAnswerInput,
  ): Promise<AssistantQuestionAnswerResult> {
    const response = await this.agentApi.v5AgentAnswer({
      assistantAnswerRequest: {
        sessionId: input.sessionId,
        questionId: input.questionId,
        answers: input.answers,
        ...(input.threadId != null && { threadId: input.threadId }),
      },
    });
    return response.data.data;
  }

  async getStrategy(
    sessionId: string,
  ): Promise<AssistantExtractionStrategy | null> {
    const response = await this.agentApi.v5AgentStrategy({ sessionId });
    return response.data.data.strategy;
  }
}
