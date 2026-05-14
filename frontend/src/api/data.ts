import {
  HTTP_API_ACTION,
  type ListGroupItem,
  type ListItem,
  type ListGroupType,
  type ListItemType,
} from '@shepherd/shared';

import { call } from './envelope';

export const dataApi = {
  getList: (type: ListItemType, code = 0): Promise<ListItem[] | undefined> =>
    call<ListItem[]>('data', HTTP_API_ACTION.DATA_GET_LIST, { typ: type, code }),

  getListGroup: (type: ListGroupType, code = 0): Promise<ListGroupItem[] | undefined> =>
    call<ListGroupItem[]>('data', HTTP_API_ACTION.DATA_GET_LIST_GROUP, { typ: type, code }),
};
