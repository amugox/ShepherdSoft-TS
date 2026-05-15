import {
  HTTP_API_ACTION,
  type MessagingPayload,
  type MessagingPreviewResult,
  type MessagingSendResult,
} from '@shepherd/shared';

import { call } from './envelope';

export const messagingApi = {
  preview: (payload: MessagingPayload): Promise<MessagingPreviewResult | undefined> =>
    call<MessagingPreviewResult>('messaging', HTTP_API_ACTION.MESSAGING_PREVIEW_RECIPIENTS, payload),

  send: (payload: MessagingPayload): Promise<MessagingSendResult | undefined> =>
    call<MessagingSendResult>('messaging', HTTP_API_ACTION.MESSAGING_SEND_SMS, payload),
};
