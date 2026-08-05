import type {
  InboxApi,
  InboxListResult,
  InboxMarkReadResult,
} from "./inbox.acl";
import { mapInboxListResponse, mapInboxMarkReadResponse } from "./inbox.acl";

export class InboxService {
  constructor(private readonly inboxApi: InboxApi) {}

  async list(): Promise<InboxListResult> {
    const response = await this.inboxApi.v5InboxList();
    return mapInboxListResponse(response.data);
  }

  async markRead(itemId: string): Promise<InboxMarkReadResult> {
    const response = await this.inboxApi.v5InboxMarkRead({ itemId });
    return mapInboxMarkReadResponse(response.data);
  }
}
