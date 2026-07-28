import type {
  AgentApiInterface,
  AssistantAnswerResponseData,
  AssistantPauseStateResponseData,
  AssistantPauseStateResponseDataPause,
  AssistantPauseStateResponseDataPendingQuestion,
  AssistantQuestion,
  ExtractionStrategySummary,
  WorkflowAssistantMessageResponseData,
} from "../../generated";

export type { AgentApiInterface };

export const FREEFORM_ASSISTANT_ANSWER_KEY = "_freeform" as const;

export interface WorkflowAssistantUpdateInput {
  instructions: string;
  threadId?: string;
}

export type WorkflowAssistantUpdateAccepted =
  WorkflowAssistantMessageResponseData;
export type AssistantPauseState = AssistantPauseStateResponseData;
export type AssistantPause = AssistantPauseStateResponseDataPause;
export type AssistantPendingQuestion =
  AssistantPauseStateResponseDataPendingQuestion;
export type { AssistantQuestion };
export type AssistantQuestionAnswers = Record<string, string>;

export interface AssistantQuestionAnswerInput {
  sessionId: string;
  questionId: string;
  threadId?: string;
  answers: AssistantQuestionAnswers;
}

export type AssistantQuestionAnswerResult = AssistantAnswerResponseData;
export type AssistantExtractionStrategy = ExtractionStrategySummary;
