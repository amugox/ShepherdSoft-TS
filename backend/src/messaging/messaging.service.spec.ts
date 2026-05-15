import { HTTP_API_ACTION, type MessagingRecipient } from '@shepherd/shared';

import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  it('deduplicates recipients across manual numbers and fellowships', async () => {
    const sp = {
      findFellowshipRecipients: jest.fn().mockResolvedValue([
        { pno: '+15551234567', source: 'fellowship' } satisfies MessagingRecipient,
      ]),
    };
    const svc = new MessagingService(sp as never);

    const res = await svc.handle({
      act: HTTP_API_ACTION.MESSAGING_PREVIEW_RECIPIENTS,
      content: { pnos: ['+15551234567', '+15551234568'], flsps: [1] },
      caller: { br_code: 1, ucode: 2 },
    });

    expect((res as { total: number }).total).toBe(2);
  });

  it('rejects send when message is empty', async () => {
    const sp = { findFellowshipRecipients: jest.fn().mockResolvedValue([]) };
    const svc = new MessagingService(sp as never);

    await expect(
      svc.handle({
        act: HTTP_API_ACTION.MESSAGING_SEND_SMS,
        content: { msg: '   ', pnos: ['+15551234567'] },
        caller: { br_code: 1, ucode: 2 },
      }),
    ).rejects.toThrow(/Message is required/);
  });
});
