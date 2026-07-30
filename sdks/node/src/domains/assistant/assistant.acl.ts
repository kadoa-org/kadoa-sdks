import type {
  AgentApiInterface,
  AgentPromptResponseData,
  AssistantAnswerResponseData,
  AssistantControlResponseData,
  AssistantPauseStateResponseData,
  AssistantPauseStateResponseDataPause,
  AssistantPauseStateResponseDataPendingQuestion,
  AssistantQuestion,
  AssistantResumeResponseData,
  ExtractionStrategySummary,
  WorkflowAssistantMessageResponseData,
} from "../../generated";

export type { AgentApiInterface };

export const FREEFORM_ASSISTANT_ANSWER_KEY = "_freeform" as const;

export interface CreateRealtimeWorkflowInput {
  instructions: string;
  notificationChannelIds: string[];
  tags?: string[];
  newSessionId?: string;
}

export interface WorkflowAssistantUpdateInput {
  instructions: string;
  threadId?: string;
}

export type RealtimeWorkflowCreationAccepted = AgentPromptResponseData;
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
export type AssistantControlResult = AssistantControlResponseData;
export type AssistantResumeAccepted = AssistantResumeResponseData;
