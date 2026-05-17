import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable } from '@nestjs/common';

import {
  FollowUpType,
  HTTP_API_ACTION,
  type Guest,
  type GuestFilter,
  type GuestFollowUpCompletePayload,
  type GuestFollowUpPayload,
  type GuestFollowUpReschedulePayload,
  type GuestPromotePayload,
  type SearchPayload,
} from '@shepherd/shared';

import { ApiRequestDto, RequestHeaderDto } from '../common/envelope/api-request.dto';
import { dispatch, type ActionMap } from '../common/envelope/action-dispatcher';
import { rawEnvelope } from '../common/envelope/api-response';
import { FollowUpSp } from '../db/sp/followup.sp';
import { GuestSp } from '../db/sp/guest.sp';

@Injectable()
export class GuestService {
  constructor(
    private readonly guests: GuestSp,
    private readonly followups: FollowUpSp,
  ) {}

  handle(req: ApiRequestDto): Promise<unknown> {
    const handlers: ActionMap = {
      [HTTP_API_ACTION.GUEST_FIND]:               (r) => this.find(r.content as GuestFilter, r.caller),
      [HTTP_API_ACTION.GUEST_GET]:                (r) => this.get(r.content as SearchPayload, r.caller),
      [HTTP_API_ACTION.GUEST_ADD]:                (r) => this.add(r.content as Guest, r.caller),
      [HTTP_API_ACTION.GUEST_UPDATE]:             (r) => this.update(r.content as Guest, r.caller),
      [HTTP_API_ACTION.GUEST_FOLLOWUP_ADD]:       (r) => this.addFollowUp(r.content as GuestFollowUpPayload),
      [HTTP_API_ACTION.GUEST_FOLLOWUP_FIND]:      (r) => this.findFollowUps(r.content as SearchPayload, r.caller),
      [HTTP_API_ACTION.GUEST_FOLLOWUP_COMPLETE]:  (r) => this.completeFollowUp(r.content as GuestFollowUpCompletePayload),
      [HTTP_API_ACTION.GUEST_FOLLOWUP_CANCEL]:    (r) => this.cancelFollowUp(r.content as SearchPayload),
      [HTTP_API_ACTION.GUEST_FOLLOWUP_RESCHEDULE]: (r) => this.rescheduleFollowUp(r.content as GuestFollowUpReschedulePayload),
      [HTTP_API_ACTION.GUEST_PROMOTE]:            (r) => this.promote(r.content as GuestPromotePayload),
      [HTTP_API_ACTION.GUEST_GET_STATS]:          (r) => this.getStats(r.caller),
      [HTTP_API_ACTION.GUEST_DELETE]:             (r) => this.remove(r.content as SearchPayload),
    };
    return dispatch(req, handlers);
  }

  private async find(filter?: GuestFilter, caller?: RequestHeaderDto | null): Promise<unknown> {
    const branchCode = this.readBranchScope(caller);
    return this.guests.findGuests(filter ?? {}, branchCode);
  }

  private async get(p?: SearchPayload, caller?: RequestHeaderDto | null): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing guest code.');
    const branchCode = this.readBranchScope(caller);
    return this.guests.getGuest(p.code, branchCode);
  }

  private async add(g?: Guest, caller?: RequestHeaderDto | null): Promise<unknown> {
    if (!g) throw new BadRequestException('Missing guest payload.');
    const enriched: Guest = {
      ...g,
      br_code: caller?.br_code ?? g.br_code ?? 0,
      u_code:  caller?.ucode   ?? g.u_code   ?? 0,
      gid:     g.gid ?? randomUUID().replace(/-/g, ''),
    };
    const row = await this.guests.createGuest(enriched);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to add guest.' });
    }

    // Auto-create a default follow-up when the registrar flagged one.
    if (enriched.followup && enriched.u_code && row.resp_code) {
      const guestCode = Number(row.resp_code);
      if (guestCode > 0) {
        const fuPayload: GuestFollowUpPayload = {
          g_code:      guestCode,
          ftype:       FollowUpType.Call,
          fdt:         enriched.followup_dt ?? enriched.vdt,
          assigned_to: enriched.u_code,
        };
        await this.followups.addFollowUp(fuPayload).catch(() => {
          // Best-effort — guest was saved, follow-up failure should not roll back.
        });
      }
    }

    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async update(g?: Guest, caller?: RequestHeaderDto | null): Promise<unknown> {
    if (!g?.code) throw new BadRequestException('Missing guest code.');
    const branchCode = this.readBranchScope(caller);
    const ok = await this.guests.updateGuest(g.code, g, branchCode);
    if (!ok) {
      return rawEnvelope({ stat: 1, msg: 'Guest not found or no changes were made.' });
    }
    return rawEnvelope({ stat: 0, msg: 'Guest updated successfully.' });
  }

  private async addFollowUp(p?: GuestFollowUpPayload): Promise<unknown> {
    if (!p) throw new BadRequestException('Missing follow-up payload.');
    const row = await this.followups.addFollowUp(p);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to add follow-up.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async findFollowUps(p?: SearchPayload, caller?: RequestHeaderDto | null): Promise<unknown> {
    if (p?.code && p.code > 0) {
      return this.followups.findByGuest(p.code);
    }
    const branchCode = this.readBranchScopeOrUndefined(caller);
    return this.followups.findPending(branchCode);
  }

  private async completeFollowUp(p?: GuestFollowUpCompletePayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing follow-up code.');
    const row = await this.followups.completeFollowUp(p.code, p.responded, p.outcome);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to complete follow-up.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async cancelFollowUp(p?: SearchPayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing follow-up code.');
    const row = await this.followups.cancelFollowUp(p.code);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to cancel follow-up.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async rescheduleFollowUp(p?: GuestFollowUpReschedulePayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing follow-up code.');
    if (!p.fdt)   throw new BadRequestException('Missing new follow-up date.');
    const ok = await this.followups.rescheduleFollowUp(p.code, p.fdt, p.assigned_to);
    if (!ok) {
      return rawEnvelope({ stat: 1, msg: 'Follow-up not found or already completed.' });
    }
    return rawEnvelope({ stat: 0, msg: 'Follow-up rescheduled.' });
  }

  private async promote(p?: GuestPromotePayload): Promise<unknown> {
    if (!p?.g_code) throw new BadRequestException('Missing guest code.');
    const memberId = randomUUID().replace(/-/g, '');
    const row = await this.guests.promoteToMember(p, memberId);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to promote guest.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message, data: row.data1 });
  }

  private async remove(p?: SearchPayload): Promise<unknown> {
    if (!p?.code) throw new BadRequestException('Missing guest code.');
    const row = await this.guests.deleteGuest(p.code);
    if (!row || row.resp_status !== 0) {
      return rawEnvelope({ stat: 1, msg: row?.resp_message ?? 'Failed to delete guest.' });
    }
    return rawEnvelope({ stat: 0, msg: row.resp_message });
  }

  private async getStats(caller?: RequestHeaderDto | null): Promise<unknown> {
    const branchCode = this.readBranchScopeOrUndefined(caller);
    return this.guests.getStats(branchCode);
  }

  private readBranchScope(caller?: RequestHeaderDto | null): number | undefined {
    if (this.isSuperAdmin(caller?.url)) return undefined;
    const branchCode = caller?.br_code ?? 0;
    if (!branchCode) throw new BadRequestException('Missing caller branch code.');
    return branchCode;
  }

  /** Like readBranchScope but does not throw — used for scoping lists where super-admin = all branches. */
  private readBranchScopeOrUndefined(caller?: RequestHeaderDto | null): number | undefined {
    if (this.isSuperAdmin(caller?.url)) return undefined;
    const branchCode = caller?.br_code ?? 0;
    return branchCode > 0 ? branchCode : undefined;
  }

  private isSuperAdmin(role: string | undefined): boolean {
    const normalized = (role ?? '').trim().toLowerCase();
    return normalized === '0' || normalized.includes('super');
  }
}
