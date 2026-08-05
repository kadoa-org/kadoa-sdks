/**
 * Inbox domain ACL.
 * Wraps generated InboxApi responses and removes authenticated scope fields
 * from the curated personal Inbox result.
 */
import {
  type InboxItem as GeneratedInboxItem,
  InboxItemTypeEnum as GeneratedInboxItemType,
  type InboxItemTypeEnum as GeneratedInboxItemTypeValue,
  type InboxListResponse as GeneratedInboxListResponse,
  type InboxReadMutationResponse as GeneratedInboxReadMutationResponse,
  type InboxApiInterface,
} from "../../generated";

export interface InboxApi {
  v5InboxList: InboxApiInterface["v5InboxList"];
  v5InboxMarkRead: InboxApiInterface["v5InboxMarkRead"];
}

export const InboxItemType = {
  AssistantQuestion: GeneratedInboxItemType.ShellyQuestion,
  DataQualityIssues: GeneratedInboxItemType.DataQualityIssues,
  PreviewDataReady: GeneratedInboxItemType.SampleDataReady,
} as const;

export type InboxItemType = (typeof InboxItemType)[keyof typeof InboxItemType];

const knownInboxItemTypes: Record<GeneratedInboxItemTypeValue, InboxItemType> =
  {
    [GeneratedInboxItemType.ShellyQuestion]: InboxItemType.AssistantQuestion,
    [GeneratedInboxItemType.DataQualityIssues]: InboxItemType.DataQualityIssues,
    [GeneratedInboxItemType.SampleDataReady]: InboxItemType.PreviewDataReady,
  };

export interface InboxItem {
  id: string;
  type: InboxItemType;
  subjectId: string;
  workflowId: string | null;
  title: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxListResult {
  unreadCount: number;
  items: InboxItem[];
}

export interface InboxMarkReadResult {
  readCount: number;
}

export function mapInboxItem(item: GeneratedInboxItem): InboxItem {
  return {
    id: item.id,
    type: knownInboxItemTypes[item.type] ?? item.type,
    subjectId: item.subjectId,
    workflowId: item.workflowId,
    title: item.title,
    payload: item.payload,
    isRead: item.isRead,
    readAt: item.readAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapInboxListResponse(
  response: GeneratedInboxListResponse,
): InboxListResult {
  return {
    unreadCount: response.data.unreadCount,
    items: response.data.items.map(mapInboxItem),
  };
}

export function mapInboxMarkReadResponse(
  response: GeneratedInboxReadMutationResponse,
): InboxMarkReadResult {
  return { readCount: response.data.readCount };
}
