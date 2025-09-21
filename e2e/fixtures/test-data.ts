export const testUsers = {
  admin: {
    email: 'admin@reqquli.com',
    password: 'salasana!123',
    fullName: 'Admin User',
  },
  test: {
    email: 'test@example.com',
    password: 'Test123!',
    fullName: 'Test User',
  },
};

export const testRequirements = {
  userRequirement: {
    title: 'User shall be able to login',
    description: 'The system shall provide secure authentication mechanism allowing authorized users to access the platform through email and password credentials.',
  },
  systemRequirement: {
    title: 'Implement JWT authentication',
    description: 'The system shall implement JWT-based authentication with token expiration, refresh mechanism, and secure storage.',
  },
};

export const testSelectors = {
  auth: {
    emailInput: '[data-testid="login-email"]',
    passwordInput: '[data-testid="login-password"]',
    loginButton: '[data-testid="login-submit"]',
    signupButton: '[data-testid="register-submit"]',
    logoutButton: '[data-testid="logout-button"]',
    fullNameInput: '[data-testid="register-name"]',
    errorMessage: '[data-testid="login-error-message"]',
    successMessage: '[data-testid="login-resend-success"]',
    registerEmailInput: '[data-testid="register-email"]',
    registerPasswordInput: '[data-testid="register-password"]',
    registerConfirmPasswordInput: '[data-testid="register-confirm-password"]',
    registerSuccessMessage: '[data-testid="register-success-message"]',
  },
  requirements: {
    createButton: '[data-testid="create-requirement-button"]',
    titleInput: '[data-testid="title-input"]',
    descriptionInput: '[data-testid="description-input"]',
    saveButton: '[data-testid="save-button"]',
    cancelButton: '[data-testid="cancel-button"]',
    approveButton: '[data-testid="approve-button"]',
    editButton: '[data-testid="edit-button"]',
    deleteButton: '[data-testid="delete-button"]',
    requirementCard: '[data-testid="requirement-card"]',
    statusBadge: '[data-testid="status-badge"]',
    revisionNumber: '[data-testid="revision-number"]',
    filterDropdown: '[data-testid="filter-dropdown"]',
    sortDropdown: '[data-testid="sort-dropdown"]',
  },
  traceability: {
    editTracesButton: '[data-testid="edit-traces-button"]',
    addTraceButton: '[data-testid="add-trace-button"]',
    removeTraceButton: '[data-testid="remove-trace-button"]',
    downstreamSection: '[data-testid="downstream-traces"]',
    upstreamSection: '[data-testid="upstream-trace"]',
    traceLink: '[data-testid="trace-link"]',
  },
  navigation: {
    userRequirementsLink: '[data-testid="user-requirements-link"]',
    systemRequirementsLink: '[data-testid="system-requirements-link"]',
    dashboardLink: '[data-testid="dashboard-link"]',
    userMenu: '[data-testid="user-menu"]',
  },
};

export const endpoints = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    verify: '/api/auth/verify',
    logout: '/api/auth/logout',
  },
  userRequirements: {
    list: '/api/user-requirements',
    create: '/api/user-requirements',
    get: (id: string) => `/api/user-requirements/${id}`,
    update: (id: string) => `/api/user-requirements/${id}`,
    approve: (id: string) => `/api/user-requirements/${id}/approve`,
    delete: (id: string) => `/api/user-requirements/${id}`,
  },
  systemRequirements: {
    list: '/api/system-requirements',
    create: '/api/system-requirements',
    get: (id: string) => `/api/system-requirements/${id}`,
    update: (id: string) => `/api/system-requirements/${id}`,
    approve: (id: string) => `/api/system-requirements/${id}/approve`,
    delete: (id: string) => `/api/system-requirements/${id}`,
  },
  traces: {
    get: (id: string) => `/api/traces/requirements/${id}/traces`,
    create: '/api/traces',
    delete: (id: string) => `/api/traces/${id}`,
  },
};

export const waitForElement = async (page: any, selector: string, timeout = 5000) => {
  await page.waitForSelector(selector, { timeout });
};

export const fillAndSubmitForm = async (page: any, formData: Record<string, string>) => {
  for (const [selector, value] of Object.entries(formData)) {
    await page.fill(selector, value);
  }
};

export const expectToBeLoggedIn = async (page: any) => {
  await page.waitForSelector(testSelectors.navigation.userMenu);
  const url = page.url();
  expect(url).not.toContain('/login');
  expect(url).not.toContain('/signup');
};

export const expectToBeLoggedOut = async (page: any) => {
  const url = page.url();
  expect(url).toContain('/login');
  await page.waitForSelector(testSelectors.auth.loginButton);
};