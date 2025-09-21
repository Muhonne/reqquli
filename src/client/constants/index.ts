// Authentication
export const AUTH_TOKEN_KEY = 'token'

// Layout dimensions
export const SIDEBAR_WIDTH = '400px'
export const MODAL_MAX_WIDTH = 'max-w-md'

// UI States
export const MIN_HEIGHTS = {
  empty: 400,
  loading: 200,
} as const

// Form validation
export const VALIDATION = {
  title: {
    minLength: 1,
    maxLength: 200
  },
  description: {
    minLength: 1
  }
} as const

// Date formats
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}

// Requirement status
export const REQUIREMENT_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved'
} as const

// View modes
export const VIEW_MODES = {
  LIST: 'list',
  DETAIL: 'detail',
  CREATE: 'create',
  EDIT: 'edit'
} as const