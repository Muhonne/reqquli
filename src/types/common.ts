export interface Approver {
  id: string;
  displayName: string;
  email: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}