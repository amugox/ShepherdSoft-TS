export interface MessagingPayload {
  msg?: string;
  pnos?: string[];
  flsps?: number[];
}

export interface MessagingRecipient {
  pno: string;
  source: 'manual' | 'fellowship';
  mcode?: number;
  mname?: string;
  fcode?: number;
  fname?: string;
}

export interface MessagingPreviewResult {
  recipients: MessagingRecipient[];
  total: number;
}

export interface MessagingSendResult {
  total: number;
  msg: string;
  recipients: MessagingRecipient[];
}
