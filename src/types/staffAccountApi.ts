// BACK #105 (ADMIN-CUENTAS-SECRETARIA-BACK): Secretaría accounts are persona + usuario with role DIRECTIVO.
// Legacy DIRECTIVO accounts created by SQL may lack a persona: personId, dni and names are then null.

export type StaffAccountStatusFilter = 'ACTIVE' | 'DISABLED';

export interface StaffListParams {
  status?: StaffAccountStatusFilter;
  q?: string;
}

export interface StaffAccountSummary {
  userId: number;
  personId: number | null;
  dni: string | null;
  fullName: string | null;
  email: string;
  active: boolean;
}

export interface CreateStaffAccountRequest {
  dni: string;
  firstNames: string;
  paternalLastName: string;
  // Optional in BACK #105: omitted when empty.
  maternalLastName?: string;
  phone?: string;
  email: string;
}

export interface CreateStaffAccountResponse {
  personId: number;
  userId: number;
  dni: string;
  fullName: string;
  email: string;
  role: 'DIRECTIVO';
  active: boolean;
}

// Generic account state (PATCH /management/accounts/{userId}/...), for DOCENTE and DIRECTIVO accounts.
export type AccountStateAction = 'DEACTIVATE' | 'REACTIVATE';

export type AccountDeactivationReason = 'END_OF_ASSIGNMENT' | 'RESIGNATION' | 'ADMINISTRATIVE_REVIEW' | 'ERRONEOUS_RECORD' | 'OTHER';
export type AccountReactivationReason = 'RETURN_TO_POST' | 'ADMINISTRATIVE_CORRECTION' | 'OTHER';
export type AccountStateReasonCode = AccountDeactivationReason | AccountReactivationReason;

export interface ChangeAccountStateRequest {
  reasonCode: AccountStateReasonCode;
  justification: string;
}

export interface AccountStateChangeResponse {
  userId: number;
  previousActive: boolean;
  active: boolean;
  reasonCode: AccountStateReasonCode;
  justification: string;
  changedBy: number;
  changedAt: string;
}
