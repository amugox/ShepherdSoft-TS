import { Injectable } from '@nestjs/common';

import { MySqlService } from '../mysql.service';
import { normRow, type SpRow } from './types';

@Injectable()
export class SecuritySp {
  constructor(private readonly mysql: MySqlService) {}

  /**
   * sp_VerifyUser(p_Username, p_BrCode)
   * Returns: RespStatus, RespMessage, Data1 (UserCode), Data2 (Pwd hash), Data3 (Salt)
   */
  async verifyUser(userName: string, brCode: number): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_VerifyUser', [userName, brCode]);
    return normRow<SpRow>(row);
  }

  /**
   * sp_VerifyUserByCode(p_UserCode)
   * Returns: RespStatus, RespMessage, Data1 (UserCode), Data2 (Pwd hash), Data3 (Salt)
   */
  async verifyUserByCode(userCode: number): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_VerifyUserByCode', [userCode]);
    return normRow<SpRow>(row);
  }

  /**
   * sp_UserLogin(p_UserCode, p_Stat, p_Token, p_SID)
   * Returns: RespStatus, RespMessage, Data1 (FullNames), Data2 (UserRole),
   *          Data3 (ChangePwd '1'/'0'), Data4 (Title / Branch name).
   */
  async userLogin(
    userCode: number,
    stat: number,
    token: string,
    sessId: string,
  ): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_UserLogin', [userCode, stat, token, sessId]);
    return normRow<SpRow>(row);
  }

  /**
   * sp_ChangeUserPwd(p_UserCode, p_NewPwd)
   * Returns: RespStatus, RespMessage [+ Data1..5 — ignored].
   */
  async changeUserPwd(userCode: number, newHash: string): Promise<SpRow | undefined> {
    const row = await this.mysql.callOne('sp_ChangeUserPwd', [userCode, newHash]);
    return normRow<SpRow>(row);
  }
}
