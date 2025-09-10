export enum ErrorType {
  SYSTEM_ERROR = 'system_error',
  CONTENT_CENSORSHIP = 'content_censorship', 
  SERVER_OVERLOAD = 'server_overload',
  RATE_LIMIT = 'rate_limit',
  INSUFFICIENT_CREDITS = 'insufficient_credits',
  GEO_RESTRICTION = 'geo_restriction',
  AUTH_ERROR = 'auth_error',
  TIMEOUT = 'timeout',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface DetailedError {
  type: ErrorType;
  message: string;
  originalError?: any;
  suggestions?: string[];
  retryable: boolean;
}

export interface ErrorAnalysisResult {
  errorType: ErrorType;
  userMessage: string;
  suggestions: string[];
  retryable: boolean;
  originalStatus?: number;
  originalMessage?: string;
}
