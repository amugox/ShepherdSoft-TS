import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';

import { dispatch, type ActionMap } from './action-dispatcher';
import { ApiRequestDto } from './api-request.dto';
import { ApiResponse, isRawEnvelope, rawEnvelope } from './api-response';

describe('Envelope', () => {
  describe('ApiResponse helpers', () => {
    it('ok() wraps data', () => {
      expect(ApiResponse.ok({ foo: 1 })).toEqual({ stat: 0, data: { foo: 1 } });
    });
    it('ok() includes msg when supplied (data omitted when undefined)', () => {
      expect(ApiResponse.ok(undefined, 'done')).toEqual({ stat: 0, msg: 'done' });
    });
    it('fail() reports stat=1', () => {
      expect(ApiResponse.fail('boom', 'ERR-1')).toEqual({ stat: 1, msg: 'boom', err_no: 'ERR-1' });
    });
    it('rawEnvelope() carries the sentinel', () => {
      const r = rawEnvelope({ stat: 0, data: 'x' });
      expect(isRawEnvelope(r)).toBe(true);
    });
    it('isRawEnvelope() rejects plain envelopes', () => {
      expect(isRawEnvelope({ stat: 0, data: 'x' })).toBe(false);
    });
  });

  describe('ApiRequestDto deserialisation', () => {
    it('maps short keys onto class properties', () => {
      const dto = plainToInstance(ApiRequestDto, {
        tsp: 'now', ver: 1, act: 200, content: { stxt: 'alex' },
        caller: { br_code: 10, ucode: 11, uname: 'Admin1', fnames: 'ALEX MUGO' },
      });
      expect(dto.ver).toBe(1);
      expect(dto.act).toBe(200);
      expect(dto.caller?.br_code).toBe(10);
      expect(dto.caller?.ucode).toBe(11);
    });
  });

  describe('dispatch()', () => {
    it('routes by action code', async () => {
      const handlers: ActionMap = {
        200: async () => ({ ok: true }),
      };
      const req = plainToInstance(ApiRequestDto, { tsp: 'now', ver: 1, act: 200, content: {} });
      await expect(dispatch(req, handlers)).resolves.toEqual({ ok: true });
    });
    it('throws on unknown action', async () => {
      const req = plainToInstance(ApiRequestDto, { tsp: 'now', ver: 1, act: 999, content: {} });
      await expect(dispatch(req, {})).rejects.toThrow(/Unsupported action code/);
    });
  });
});
