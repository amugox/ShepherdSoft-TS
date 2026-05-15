import { BadRequestException, Injectable } from '@nestjs/common';

import {
  HTTP_API_ACTION,
  type MessagingPayload,
  type MessagingPreviewResult,
  type MessagingRecipient,
  type MessagingSendResult,
} from '@shepherd/shared';

import { ApiRequestDto, type RequestHeaderDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { rawEnvelope } from '../common/envelope/api-response';
import { MessagingSp } from '../db/sp/messaging.sp';

@Injectable()
export class MessagingService {
  constructor(private readonly sp: MessagingSp) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [HTTP_API_ACTION.MESSAGING_PREVIEW_RECIPIENTS]: (r) =>
        this.preview(r.content as MessagingPayload, r.caller),
      [HTTP_API_ACTION.MESSAGING_SEND_SMS]: (r) =>
        this.send(r.content as MessagingPayload, r.caller),
    };
    return dispatch(req, handlers);
  }

  private async preview(
    payload?: MessagingPayload,
    caller?: RequestHeaderDto | null,
  ): Promise<MessagingPreviewResult> {
    const recipients = await this.resolveRecipients(payload, caller);
    return { recipients, total: recipients.length };
  }

  private async send(
    payload?: MessagingPayload,
    caller?: RequestHeaderDto | null,
  ): Promise<unknown> {
    const message = payload?.msg?.trim() ?? '';
    if (!message) {
      throw new BadRequestException('Message is required.');
    }
    const recipients = await this.resolveRecipients(payload, caller);
    if (!recipients.length) {
      throw new BadRequestException('No valid recipients found.');
    }
    const result: MessagingSendResult = {
      total: recipients.length,
      msg: message,
      recipients,
    };
    return rawEnvelope({
      stat: 0,
      msg: 'SMS batch prepared. Wire this payload to your SMS gateway integration.',
      data: result,
    });
  }

  private async resolveRecipients(
    payload?: MessagingPayload,
    caller?: RequestHeaderDto | null,
  ): Promise<MessagingRecipient[]> {
    const directRecipients = this.normalizeDirectNumbers(payload?.pnos ?? []);
    const fellowshipCodes = this.normalizeFellowshipCodes(payload?.flsps ?? []);
    const fellowshipRecipients = await this.sp.findFellowshipRecipients(
      fellowshipCodes,
      caller?.br_code ?? 0,
    );

    const byNumber = new Map<string, MessagingRecipient>();
    for (const item of [...directRecipients, ...fellowshipRecipients]) {
      if (!byNumber.has(item.pno)) byNumber.set(item.pno, item);
    }
    return Array.from(byNumber.values());
  }

  private normalizeDirectNumbers(input: string[]): MessagingRecipient[] {
    const seen = new Set<string>();
    const out: MessagingRecipient[] = [];
    for (const raw of input) {
      const normalized = this.normalizePhone(raw);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push({ pno: normalized, source: 'manual' });
    }
    return out;
  }

  private normalizeFellowshipCodes(input: number[]): number[] {
    const codes = new Set<number>();
    for (const code of input) {
      if (!Number.isInteger(code) || code <= 0) continue;
      codes.add(code);
    }
    return Array.from(codes);
  }

  private normalizePhone(phone: string): string | null {
    const trimmed = phone.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/[^\d+]/g, '');
    const plusCount = (normalized.match(/\+/g) ?? []).length;
    if (plusCount > 1) return null;
    if (plusCount === 1 && !normalized.startsWith('+')) return null;
    const digitCount = normalized.replace(/\D/g, '').length;
    if (digitCount < 8 || digitCount > 15) return null;
    return normalized;
  }
}
