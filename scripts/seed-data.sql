-- Development seed data for Reqquli requirements management system
-- Based on gherkin specifications and real-world examples

-- Clear existing data (development only)
DELETE FROM traces;
DELETE FROM system_requirements;
DELETE FROM user_requirements;
DELETE FROM users;

-- Insert development admin user with proper UUID
INSERT INTO users (id, email, password_hash, full_name, email_verified, created_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@reqquli.com', '$2b$10$0cpfTHC75c/L89Sx7XCTf.TYuwJXNaWG7gqFueMcrB6uGFvpobKoq', 'Admin User', true, NOW() - INTERVAL '30 days');

-- Insert 50 user requirements
-- Mix of draft and approved, with varied lastModified dates for proper ordering
INSERT INTO user_requirements (
    id, title, description, status, revision,
    created_by, created_at, last_modified, modified_by,
    approved_at, approved_by, deleted_at
) VALUES
    -- First 5: Original requirements
    ('UR-1', 'System Login',
     'Users shall be able to login to the system using their username and password. The system shall provide secure authentication with session management and proper error handling for invalid credentials.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '45 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-2', 'User Registration',
     'New users shall be able to register for system access by providing their full name, email address, and creating a secure password. The system shall validate email uniqueness and password strength requirements.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '49 days', NOW() - INTERVAL '44 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '44 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-3', 'Password Reset Functionality',
     'Users shall be able to reset their forgotten passwords through a secure email-based verification process. The system shall generate temporary reset tokens with expiration times and proper security validation.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '48 days', NOW() - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-4', 'Requirements Management Interface',
     'Authorized users shall be able to create, edit, view, and manage requirements through an intuitive web-based interface. The system shall provide proper role-based access control and audit trails for all operations.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '47 days', NOW() - INTERVAL '42 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '42 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-5', 'Complete Audit Trail',
     'The system shall maintain a complete audit trail of all requirement changes, including creation, modification, approval, and deletion events. Each audit entry shall include timestamps, user identification, and change details for regulatory compliance.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '46 days', NOW() - INTERVAL '41 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '41 days', '11111111-1111-1111-1111-111111111111', NULL),

    -- Additional 45 user requirements (UR-6 to UR-50)
    ('UR-6', 'Data Export Functionality',
     'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-7', 'Email Notifications',
     'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '44 days', NOW() - INTERVAL '40 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '40 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-8', 'Dashboard Analytics',
     'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '43 days', NOW() - INTERVAL '39 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '39 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-9', 'File Upload Support',
     'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '42 days', NOW() - INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-10', 'Search Functionality',
     'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '41 days', NOW() - INTERVAL '38 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '38 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-11', 'Role-Based Access Control',
     'Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days', NOW() - INTERVAL '37 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '37 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-12', 'API Integration',
     'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '39 days', NOW() - INTERVAL '2 hours', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-13', 'Mobile Responsive Design',
     'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '38 days', NOW() - INTERVAL '36 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '36 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-14', 'Batch Operations',
     'Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '37 days', NOW() - INTERVAL '35 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '35 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-15', 'Data Validation Rules',
     'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '36 days', NOW() - INTERVAL '1 hour', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-16', 'User Profile Management',
     'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '34 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-17', 'Report Generation',
     'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '34 days', NOW() - INTERVAL '33 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '33 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-18', 'Version Control',
     'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days', NOW() - INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-19', 'Collaboration Features',
     'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '32 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-20', 'Performance Monitoring',
     'Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '31 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-21', 'Security Compliance',
     'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days', NOW() - INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-22', 'Backup and Recovery',
     'Sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '29 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-23', 'Internationalization Support',
     'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '28 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-24', 'Custom Workflows',
     'Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '27 days', NOW() - INTERVAL '10 minutes', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-25', 'Calendar Integration',
     'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '26 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-26', 'Third-Party Authentication',
     'Nisi ut aliquid ex ea commodi consequatur quis autem vel eum iure reprehenderit.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-27', 'Data Migration Tools',
     'Qui in ea voluptate velit esse quam nihil molestiae consequatur.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '24 days', NOW() - INTERVAL '5 minutes', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-28', 'Activity Logging',
     'Vel illum qui dolorem eum fugiat quo voluptas nulla pariatur.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '23 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-29', 'Template Management',
     'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-30', 'Automated Testing',
     'Praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 days', NOW() - INTERVAL '1 minute', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-31', 'Document Management',
     'Excepturi sint occaecati cupiditate non provident, similique sunt in culpa.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-32', 'Change History Tracking',
     'Qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-33', 'Approval Workflow',
     'Et harum quidem rerum facilis est et expedita distinctio.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-34', 'User Permissions Matrix',
     'Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-35', 'Bulk Import Export',
     'Quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '16 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-36', 'Real-time Updates',
     'Omnis dolor repellendus temporibus autem quibusdam et aut officiis debitis.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-37', 'Custom Fields',
     'Aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-38', 'Advanced Filtering',
     'Et molestiae non recusandae itaque earum rerum hic tenetur a sapiente delectus.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '13 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-39', 'Dependency Management',
     'Ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-40', 'Impact Analysis',
     'Asperiores repellat lorem ipsum dolor sit amet consectetur adipiscing elit.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '11 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-41', 'Requirement Baselines',
     'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-42', 'Release Management',
     'Ut enim ad minim veniam quis nostrud exercitation ullamco laboris.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-43', 'Test Case Linking',
     'Nisi ut aliquip ex ea commodo consequat duis aute irure dolor.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '8 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-44', 'Stakeholder Management',
     'In reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-45', 'Priority Management',
     'Pariatur excepteur sint occaecat cupidatat non proident sunt in culpa.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-46', 'Review Process',
     'Qui officia deserunt mollit anim id est laborum sed ut perspiciatis.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-47', 'Compliance Reporting',
     'Unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-48', 'Risk Management',
     'Totam rem aperiam eaque ipsa quae ab illo inventore veritatis et quasi.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('UR-49', 'Requirements Reuse',
     'Architecto beatae vitae dicta sunt explicabo nemo enim ipsam voluptatem.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('UR-50', 'AI-Powered Analysis',
     'Quia voluptas sit aspernatur aut odit aut fugit sed quia consequuntur.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day', NOW() - INTERVAL '5 seconds', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '1 day', '11111111-1111-1111-1111-111111111111', NULL);

-- Update user_requirement_seq to avoid conflicts with seeded data
SELECT setval('user_requirement_seq', 50, true);

-- Insert 100 system requirements
INSERT INTO system_requirements (
    id, title, description, status, revision,
    created_by, created_at, last_modified, modified_by,
    approved_at, approved_by, deleted_at
) VALUES
    -- First 6: Original system requirements
    ('SR-1', 'Login Authentication System',
     'System shall implement secure authentication with multi-factor support.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '45 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('SR-2', 'User Registration Backend Services',
     'System shall implement backend services for user registration.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '49 days', NOW() - INTERVAL '44 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '44 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('SR-3', 'Password Reset Token Management',
     'System shall implement secure password reset functionality.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '48 days', NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    ('SR-4', 'Requirements CRUD API Operations',
     'System shall provide RESTful API endpoints for CRUD operations.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '47 days', NOW() - INTERVAL '42 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '42 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('SR-5', 'Audit Trail Database Implementation',
     'System shall implement comprehensive audit trail database.',
     'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '46 days', NOW() - INTERVAL '41 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '41 days', '11111111-1111-1111-1111-111111111111', NULL),

    ('SR-6', 'Session Management Security',
     'System shall implement secure session management.',
     'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days', NOW() - INTERVAL '3 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL, NULL),

    -- Additional 94 system requirements (SR-7 to SR-100)
    ('SR-7', 'Database Connection Pool', 'Implement connection pooling.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '44 days', NOW() - INTERVAL '40 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-8', 'Caching Layer', 'Implement Redis caching.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '43 days', NOW() - INTERVAL '39 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '39 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-9', 'Load Balancer Configuration', 'Setup load balancing.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '42 days', NOW() - INTERVAL '6 hours', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-10', 'SSL Certificate Management', 'Manage SSL certificates.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '41 days', NOW() - INTERVAL '38 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '38 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-11', 'API Rate Limiting', 'Implement rate limiting.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days', NOW() - INTERVAL '37 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '37 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-12', 'Request Validation', 'Validate all requests.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '39 days', NOW() - INTERVAL '5 hours', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-13', 'Response Compression', 'Enable GZIP compression.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '38 days', NOW() - INTERVAL '36 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '36 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-14', 'Error Handling', 'Centralized error handling.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '37 days', NOW() - INTERVAL '35 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '35 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-15', 'Logging Framework', 'Structured logging system.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '36 days', NOW() - INTERVAL '4 hours', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-16', 'Health Check Endpoints', 'System health monitoring.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '34 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-17', 'Metrics Collection', 'Collect system metrics.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '34 days', NOW() - INTERVAL '33 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-18', 'Database Migrations', 'Automated DB migrations.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days', NOW() - INTERVAL '3 hours 30 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-19', 'Input Sanitization', 'Sanitize user inputs.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '32 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-20', 'CORS Configuration', 'Configure CORS properly.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '31 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-21', 'JWT Token Service', 'Implement JWT tokens.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days', NOW() - INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-22', 'OAuth2 Integration', 'OAuth2 provider setup.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '29 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-23', 'WebSocket Support', 'Real-time connections.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '28 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-24', 'Queue System', 'Message queue implementation.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '27 days', NOW() - INTERVAL '2 hours 45 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-25', 'File Storage Service', 'S3 compatible storage.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '26 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-26', 'Email Service', 'SMTP email integration.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-27', 'PDF Generation', 'Generate PDF reports.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '24 days', NOW() - INTERVAL '2 hours 30 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-28', 'CSV Export', 'Export data to CSV.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-29', 'Data Encryption', 'Encrypt sensitive data.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-30', 'Backup Service', 'Automated backups.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 days', NOW() - INTERVAL '2 hours 15 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-31', 'Search Engine', 'Elasticsearch integration.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-32', 'API Documentation', 'OpenAPI documentation.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-33', 'Unit Tests', 'Unit test coverage.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 days', NOW() - INTERVAL '2 hours', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-34', 'Integration Tests', 'Integration test suite.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-35', 'Performance Tests', 'Load testing setup.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-36', 'CI/CD Pipeline', 'Continuous integration.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 hour 45 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-37', 'Docker Configuration', 'Container setup.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-38', 'Kubernetes Deployment', 'K8s configuration.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-39', 'Monitoring Dashboard', 'Grafana dashboard.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 hour 30 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-40', 'Alert System', 'Alert notifications.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '11 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-41', 'Service Mesh', 'Implement service mesh.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-42', 'GraphQL API', 'GraphQL endpoint.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '9 days', NOW() - INTERVAL '1 hour 15 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-43', 'Webhooks', 'Webhook system.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-44', 'Event Bus', 'Event-driven architecture.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-45', 'State Machine', 'Workflow state machine.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 hour', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-46', 'Feature Flags', 'Feature toggle system.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-47', 'A/B Testing', 'Split testing framework.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-48', 'CDN Integration', 'Content delivery network.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days', NOW() - INTERVAL '45 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-49', 'WAF Rules', 'Web application firewall.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-50', 'DDoS Protection', 'DDoS mitigation.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 day', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-51', 'Multi-tenancy', 'Tenant isolation.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 hours', NOW() - INTERVAL '25 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-52', 'RBAC System', 'Role-based access.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 hours', NOW() - INTERVAL '22 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-53', 'LDAP Integration', 'Directory service.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 hours', NOW() - INTERVAL '21 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-54', 'SAML Support', 'SAML authentication.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-55', 'MFA Implementation', 'Multi-factor auth.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 hours', NOW() - INTERVAL '19 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-56', 'Password Policy', 'Strong passwords.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 hours', NOW() - INTERVAL '18 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '18 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-57', 'Account Lockout', 'Brute force protection.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 hours', NOW() - INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-58', 'Session Timeout', 'Auto logout.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 hours', NOW() - INTERVAL '16 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-59', 'IP Whitelisting', 'Access control.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 hours', NOW() - INTERVAL '15 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-60', 'Audit Logging', 'Security logs.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 hours', NOW() - INTERVAL '10 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-61', 'Data Masking', 'PII protection.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 hours', NOW() - INTERVAL '13 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-62', 'Field Encryption', 'Encrypt fields.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-63', 'Key Management', 'KMS integration.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '11 hours', NOW() - INTERVAL '8 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-64', 'Secrets Vault', 'Secure secrets.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-65', 'Compliance Scanning', 'Security compliance.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '9 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-66', 'Vulnerability Scan', 'Security testing.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-67', 'Penetration Testing', 'Security audit.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 hours', NOW() - INTERVAL '7 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '7 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-68', 'Code Analysis', 'Static analysis.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '6 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-69', 'Dependency Check', 'Library scanning.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '6 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-70', 'License Compliance', 'License check.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-71', 'GDPR Compliance', 'Privacy rules.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-72', 'Data Retention', 'Retention policy.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '5 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-73', 'Right to Delete', 'GDPR deletion.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '90 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '90 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-74', 'Data Portability', 'Export user data.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '80 minutes', NOW() - INTERVAL '80 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '80 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-75', 'Cookie Consent', 'Cookie banner.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '70 minutes', NOW() - INTERVAL '4 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-76', 'Privacy Policy', 'Policy page.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '60 minutes', NOW() - INTERVAL '60 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '60 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-77', 'Terms of Service', 'ToS page.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '50 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '50 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-78', 'Accessibility', 'WCAG compliance.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '3 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-79', 'i18n Support', 'Internationalization.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-80', 'Localization', 'Translation system.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-81', 'Timezone Support', 'Handle timezones.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '2 minutes', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-82', 'Currency Support', 'Multi-currency.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-83', 'Payment Gateway', 'Payment processing.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-84', 'Subscription Billing', 'Recurring payments.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '1 minute', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-85', 'Invoice Generation', 'Create invoices.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 minutes', NOW() - INTERVAL '4 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-86', 'Tax Calculation', 'Calculate taxes.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 minutes', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-87', 'Refund Processing', 'Handle refunds.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '30 seconds', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-88', 'Fraud Detection', 'Detect fraud.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '90 seconds', NOW() - INTERVAL '90 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '90 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-89', 'Risk Assessment', 'Risk scoring.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '60 seconds', NOW() - INTERVAL '60 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '60 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-90', 'Chargebacks', 'Handle disputes.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '20 seconds', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-91', 'Analytics Dashboard', 'Business metrics.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 seconds', NOW() - INTERVAL '15 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-92', 'KPI Tracking', 'Track KPIs.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 seconds', NOW() - INTERVAL '10 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-93', 'Custom Reports', 'Report builder.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 seconds', NOW() - INTERVAL '10 seconds', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-94', 'Data Warehouse', 'ETL pipeline.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 seconds', NOW() - INTERVAL '4 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-95', 'BI Integration', 'Business intelligence.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 seconds', NOW() - INTERVAL '3 seconds', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 seconds', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-96', 'ML Pipeline', 'Machine learning.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 seconds', NOW() - INTERVAL '5 seconds', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-97', 'Recommendation Engine', 'Product recommendations.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 second', NOW() - INTERVAL '1 second', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '1 second', '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-98', 'Chatbot Integration', 'AI assistant.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW() - INTERVAL '2 seconds', '11111111-1111-1111-1111-111111111111', NOW(), '11111111-1111-1111-1111-111111111111', NULL),
    ('SR-99', 'Voice Assistant', 'Voice commands.', 'draft', 0, '11111111-1111-1111-1111-111111111111', NOW(), NOW() - INTERVAL '1 second', '11111111-1111-1111-1111-111111111111', NULL, NULL, NULL),
    ('SR-100', 'Mobile App API', 'Mobile backend.', 'approved', 1, '11111111-1111-1111-1111-111111111111', NOW(), NOW(), '11111111-1111-1111-1111-111111111111', NOW(), '11111111-1111-1111-1111-111111111111', NULL);

-- Create trace relationships between 30 user requirements and 50 system requirements
-- Creating multiple traces to demonstrate many-to-many relationships
-- Types are determined from ID prefixes: UR- (user), SR- (system), TC- (testcase), TRES- (testresult)
INSERT INTO traces (
    from_requirement_id, to_requirement_id,
    created_by, created_at
) VALUES
    -- UR-1 traces to multiple SRs (Login functionality)
    ('UR-1', 'SR-1', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days'),
    ('UR-1', 'SR-6', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '45 days'),
    ('UR-1', 'SR-21', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 days'),
    ('UR-1', 'SR-55', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '19 hours'),

    -- UR-2 traces (User Registration)
    ('UR-2', 'SR-2', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '44 days'),
    ('UR-2', 'SR-19', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '32 days'),
    ('UR-2', 'SR-26', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days'),

    -- UR-3 traces (Password Reset)
    ('UR-3', 'SR-3', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '48 days'),
    ('UR-3', 'SR-26', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 days'),

    -- UR-4 traces (Requirements Management)
    ('UR-4', 'SR-4', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '42 days'),
    ('UR-4', 'SR-14', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '35 days'),

    -- UR-5 traces (Audit Trail)
    ('UR-5', 'SR-5', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '41 days'),
    ('UR-5', 'SR-60', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 hours'),

    -- UR-7 traces (Email Notifications)
    ('UR-7', 'SR-26', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '40 days'),
    ('UR-7', 'SR-24', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '27 days'),

    -- UR-8 traces (Dashboard Analytics)
    ('UR-8', 'SR-91', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 seconds'),
    ('UR-8', 'SR-92', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '10 seconds'),
    ('UR-8', 'SR-17', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days'),

    -- UR-10 traces (Search Functionality)
    ('UR-10', 'SR-31', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days'),

    -- UR-11 traces (Role-Based Access Control)
    ('UR-11', 'SR-52', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 hours'),
    ('UR-11', 'SR-34', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '17 days'),

    -- UR-13 traces (Mobile Responsive Design)
    ('UR-13', 'SR-100', '11111111-1111-1111-1111-111111111111', NOW()),
    ('UR-13', 'SR-13', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '36 days'),

    -- UR-14 traces (Batch Operations)
    ('UR-14', 'SR-24', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '27 days'),
    ('UR-14', 'SR-35', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '16 days'),

    -- UR-16 traces (User Profile Management)
    ('UR-16', 'SR-61', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '13 hours'),
    ('UR-16', 'SR-62', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 hours'),

    -- UR-17 traces (Report Generation)
    ('UR-17', 'SR-27', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '24 days'),
    ('UR-17', 'SR-28', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 days'),
    ('UR-17', 'SR-93', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '5 seconds'),

    -- UR-19 traces (Collaboration Features)
    ('UR-19', 'SR-23', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '28 days'),
    ('UR-19', 'SR-43', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '8 days'),

    -- UR-20 traces (Performance Monitoring)
    ('UR-20', 'SR-16', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '34 days'),
    ('UR-20', 'SR-17', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days'),
    ('UR-20', 'SR-39', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '12 days'),
    ('UR-20', 'SR-40', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '11 days'),

    -- UR-22 traces (Backup and Recovery)
    ('UR-22', 'SR-30', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 days'),

    -- UR-23 traces (Internationalization Support)
    ('UR-23', 'SR-79', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '30 minutes'),
    ('UR-23', 'SR-80', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '25 minutes'),
    ('UR-23', 'SR-81', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 minutes'),

    -- UR-25 traces (Calendar Integration)
    ('UR-25', 'SR-81', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 minutes'),

    -- UR-26 traces (Third-Party Authentication)
    ('UR-26', 'SR-22', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '29 days'),
    ('UR-26', 'SR-53', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '21 hours'),
    ('UR-26', 'SR-54', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 hours'),

    -- UR-28 traces (Activity Logging)
    ('UR-28', 'SR-15', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '36 days'),
    ('UR-28', 'SR-60', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '14 hours'),

    -- UR-29 traces (Template Management)
    ('UR-29', 'SR-25', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '26 days'),

    -- UR-31 traces (Document Management)
    ('UR-31', 'SR-25', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '26 days'),
    ('UR-31', 'SR-27', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '24 days'),

    -- UR-32 traces (Change History Tracking)
    ('UR-32', 'SR-5', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '41 days'),
    ('UR-32', 'SR-18', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '33 days'),

    -- UR-34 traces (User Permissions Matrix)
    ('UR-34', 'SR-52', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '22 hours'),
    ('UR-34', 'SR-59', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '15 hours'),

    -- UR-35 traces (Bulk Import Export)
    ('UR-35', 'SR-28', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '23 days'),
    ('UR-35', 'SR-74', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '80 minutes'),

    -- UR-37 traces (Custom Fields)
    ('UR-37', 'SR-4', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '42 days'),

    -- UR-38 traces (Advanced Filtering)
    ('UR-38', 'SR-31', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '20 days'),

    -- UR-40 traces (Impact Analysis)
    ('UR-40', 'SR-94', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '4 seconds'),
    ('UR-40', 'SR-95', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 seconds');

-- Display summary of created data
SELECT 'USER requireMENTS' as category, count(*) as total,
       sum(case when status = 'approved' then 1 else 0 end) as approved,
       sum(case when status = 'draft' then 1 else 0 end) as draft
FROM user_requirements WHERE deleted_at IS NULL
UNION ALL
SELECT 'SYSTEM requireMENTS' as category, count(*) as total,
       sum(case when status = 'approved' then 1 else 0 end) as approved,
       sum(case when status = 'draft' then 1 else 0 end) as draft
FROM system_requirements WHERE deleted_at IS NULL
UNION ALL
SELECT 'USERS' as category, count(*) as total, count(*) as approved, 0 as draft
FROM users WHERE email_verified = true
UNION ALL
SELECT 'TRACE RELATIONSHIPS' as category, count(*) as total, count(*) as approved, 0 as draft
FROM traces;

-- Update system_requirement_seq to avoid conflicts with seeded data
SELECT setval('system_requirement_seq', 100, true);

-- Test Cases and Test Runs seed data
-- Clear testing data
DELETE FROM testing.test_step_results;
DELETE FROM testing.test_run_cases;
DELETE FROM testing.test_runs;
DELETE FROM testing.evidence_files;
-- Note: SR to TC links now handled via traces table
DELETE FROM testing.test_steps;
DELETE FROM testing.test_cases;

-- Don't reset test case sequence since we're using specific IDs (TC-1 through TC-8)
-- ALTER SEQUENCE test_case_seq RESTART WITH 1;

-- Insert test cases
INSERT INTO testing.test_cases (id, title, description, status, revision, created_at, created_by, last_modified, modified_by, approved_at, approved_by) VALUES
    ('TC-1', 'User Login with Valid Credentials',
     'Verify that users can successfully login with valid username and password',
     'approved', 1, NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '24 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '24 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-2', 'User Login with Invalid Credentials',
     'Verify that system rejects login attempts with invalid credentials and shows appropriate error messages',
     'approved', 1, NOW() - INTERVAL '25 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '24 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '24 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-3', 'New User Registration Flow',
     'Verify complete user registration process including email validation',
     'approved', 1, NOW() - INTERVAL '23 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '22 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-4', 'Create New Requirement',
     'Verify that authorized users can create new requirements with all mandatory fields',
     'approved', 1, NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-5', 'Edit Existing Requirement',
     'Verify that users can modify draft requirements and that audit trail is maintained',
     'approved', 1, NOW() - INTERVAL '20 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '19 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-6', 'Approve Requirement Workflow',
     'Verify the complete approval workflow including password confirmation',
     'draft', 0, NOW() - INTERVAL '15 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '15 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL),

    ('TC-7', 'Session Timeout Handling',
     'Verify that inactive sessions are properly terminated after timeout period',
     'approved', 1, NOW() - INTERVAL '18 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '17 days', '11111111-1111-1111-1111-111111111111'),

    ('TC-8', 'Data Export to Multiple Formats',
     'Verify that requirements can be exported to CSV, PDF, and JSON formats',
     'draft', 0, NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL);

-- Insert test steps
INSERT INTO testing.test_steps (test_case_id, step_number, action, expected_result) VALUES
    -- TC-1: User Login with Valid Credentials
    ('TC-1', 1, 'Navigate to login page', 'Login page is displayed with username and password fields'),
    ('TC-1', 2, 'Enter valid username: admin@reqquli.com', 'Username is accepted and displayed in the field'),
    ('TC-1', 3, 'Enter valid password', 'Password is masked and accepted'),
    ('TC-1', 4, 'Click Login button', 'User is successfully logged in and redirected to dashboard'),
    ('TC-1', 5, 'Verify session is created', 'User session is active and username is displayed in header'),

    -- TC-2: User Login with Invalid Credentials
    ('TC-2', 1, 'Navigate to login page', 'Login page is displayed'),
    ('TC-2', 2, 'Enter invalid username: wronguser@example.com', 'Username is accepted'),
    ('TC-2', 3, 'Enter any password', 'Password is masked and accepted'),
    ('TC-2', 4, 'Click Login button', 'Error message "Invalid credentials" is displayed'),
    ('TC-2', 5, 'Verify user remains on login page', 'User is not logged in and stays on login page'),

    -- TC-3: New User Registration Flow
    ('TC-3', 1, 'Navigate to registration page', 'Registration form is displayed'),
    ('TC-3', 2, 'Enter full name: John Doe', 'Name is accepted'),
    ('TC-3', 3, 'Enter email: john.doe@example.com', 'Email is validated and accepted'),
    ('TC-3', 4, 'Enter password meeting requirements', 'Password strength indicator shows "Strong"'),
    ('TC-3', 5, 'Confirm password', 'Passwords match confirmation is shown'),
    ('TC-3', 6, 'Click Register button', 'Registration successful, verification email sent'),
    ('TC-3', 7, 'Check email and click verification link', 'Email is verified successfully'),

    -- TC-4: Create New Requirement
    ('TC-4', 1, 'Login as authorized user', 'User is logged in successfully'),
    ('TC-4', 2, 'Navigate to Requirements section', 'Requirements list is displayed'),
    ('TC-4', 3, 'Click "Create New Requirement" button', 'New requirement form is displayed'),
    ('TC-4', 4, 'Enter requirement title', 'Title is accepted (max 200 chars)'),
    ('TC-4', 5, 'Enter requirement description', 'Description is accepted'),
    ('TC-4', 6, 'Select requirement type', 'Type is selected (User/System)'),
    ('TC-4', 7, 'Click Save button', 'Requirement is created with unique ID and status "draft"'),

    -- TC-5: Edit Existing Requirement
    ('TC-5', 1, 'Login and navigate to requirements', 'Requirements list is displayed'),
    ('TC-5', 2, 'Select a draft requirement', 'Requirement details are shown'),
    ('TC-5', 3, 'Click Edit button', 'Edit form is enabled'),
    ('TC-5', 4, 'Modify title and description', 'Changes are accepted in form'),
    ('TC-5', 5, 'Click Save Changes', 'Changes are saved and revision number increments'),
    ('TC-5', 6, 'Check audit trail', 'Modification is recorded with timestamp and user'),

    -- TC-6: Approve Requirement Workflow
    ('TC-6', 1, 'Select a draft requirement', 'Requirement details displayed with Approve button'),
    ('TC-6', 2, 'Click Approve button', 'Password confirmation dialog appears'),
    ('TC-6', 3, 'Enter incorrect password', 'Error message displayed'),
    ('TC-6', 4, 'Enter correct password', 'Password accepted'),
    ('TC-6', 5, 'Add approval notes', 'Notes field accepts text'),
    ('TC-6', 6, 'Confirm approval', 'Requirement status changes to "approved"'),

    -- TC-7: Session Timeout Handling
    ('TC-7', 1, 'Login to system', 'User logged in successfully'),
    ('TC-7', 2, 'Leave browser idle for timeout period', 'No activity for configured timeout'),
    ('TC-7', 3, 'Attempt to perform an action', 'Session expired message is shown'),
    ('TC-7', 4, 'Verify redirect to login', 'User is redirected to login page'),

    -- TC-8: Data Export to Multiple Formats
    ('TC-8', 1, 'Navigate to requirements list', 'Requirements are displayed'),
    ('TC-8', 2, 'Select requirements to export', 'Requirements are selected with checkboxes'),
    ('TC-8', 3, 'Click Export button', 'Export format dialog appears'),
    ('TC-8', 4, 'Select CSV format and export', 'CSV file is downloaded with selected data'),
    ('TC-8', 5, 'Select PDF format and export', 'PDF file is generated and downloaded'),
    ('TC-8', 6, 'Select JSON format and export', 'JSON file is downloaded with complete data structure');

-- Update test_case_seq to avoid conflicts with seeded data
SELECT setval('test_case_seq', 8, true);

-- Link test cases to system requirements using traces table
-- Types are determined from ID prefixes: SR- (system), TC- (testcase)
INSERT INTO traces (from_requirement_id, to_requirement_id, created_by) VALUES
    -- Traces from System Requirements to Test Cases
    ('SR-1', 'TC-1', '11111111-1111-1111-1111-111111111111'),
    ('SR-1', 'TC-2', '11111111-1111-1111-1111-111111111111'),
    ('SR-2', 'TC-1', '11111111-1111-1111-1111-111111111111'),
    ('SR-3', 'TC-3', '11111111-1111-1111-1111-111111111111'),
    ('SR-4', 'TC-4', '11111111-1111-1111-1111-111111111111'),
    ('SR-4', 'TC-5', '11111111-1111-1111-1111-111111111111'),
    ('SR-5', 'TC-5', '11111111-1111-1111-1111-111111111111'),
    ('SR-6', 'TC-6', '11111111-1111-1111-1111-111111111111'),
    ('SR-10', 'TC-7', '11111111-1111-1111-1111-111111111111'),
    ('SR-15', 'TC-8', '11111111-1111-1111-1111-111111111111');

-- Insert sample test runs
INSERT INTO testing.test_runs (id, name, description, status, overall_result, created_at, created_by, approved_at, approved_by) VALUES
    ('TR-1', 'Release 1.0 Test Run',
     'Complete test run for version 1.0 release',
     'approved', 'pass', NOW() - INTERVAL '14 days', '11111111-1111-1111-1111-111111111111',
     NOW() - INTERVAL '13 days', '11111111-1111-1111-1111-111111111111'),

    ('TR-2', 'Sprint 3 Regression Test',
     'Regression testing for Sprint 3 features',
     'complete', 'fail', NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL),

    ('TR-3', 'Current Sprint Test',
     'Ongoing test execution for current sprint',
     'in_progress', 'pending', NOW() - INTERVAL '2 days', '11111111-1111-1111-1111-111111111111',
     NULL, NULL),

    ('TR-4', 'UAT Testing - Complete',
     'User acceptance testing - all test cases executed successfully and ready for approval',
     'complete', 'pass', NOW() - INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111',
     NULL, NULL),

    ('TR-5', 'Integration Test - In Progress',
     'Integration testing between modules - partially complete',
     'in_progress', 'pending', NOW() - INTERVAL '1 day', '11111111-1111-1111-1111-111111111111',
     NULL, NULL),

    ('TR-6', 'Smoke Test - Not Started',
     'Quick smoke test for new deployment - not yet started',
     'not_started', 'pending', NOW() - INTERVAL '1 hour', '11111111-1111-1111-1111-111111111111',
     NULL, NULL);

-- Insert test run cases (linking test cases to runs)
INSERT INTO testing.test_run_cases (test_run_id, test_case_id, status, result, started_at, completed_at, executed_by) VALUES
    -- Release 1.0 Test Run (all passed)
    ('TR-1', 'TC-1', 'complete', 'pass',
     NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-1', 'TC-2', 'complete', 'pass',
     NOW() - INTERVAL '14 days' + INTERVAL '1 hour', NOW() - INTERVAL '14 days' + INTERVAL '90 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-1', 'TC-3', 'complete', 'pass',
     NOW() - INTERVAL '14 days' + INTERVAL '2 hours', NOW() - INTERVAL '14 days' + INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111'),
    ('TR-1', 'TC-4', 'complete', 'pass',
     NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days' + INTERVAL '45 minutes', '11111111-1111-1111-1111-111111111111'),

    -- Sprint 3 Regression Test (one failure)
    ('TR-2', 'TC-1', 'complete', 'pass',
     NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '20 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-2', 'TC-2', 'complete', 'pass',
     NOW() - INTERVAL '7 days' + INTERVAL '30 minutes', NOW() - INTERVAL '7 days' + INTERVAL '45 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-2', 'TC-5', 'complete', 'fail',
     NOW() - INTERVAL '7 days' + INTERVAL '1 hour', NOW() - INTERVAL '7 days' + INTERVAL '90 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-2', 'TC-7', 'complete', 'pass',
     NOW() - INTERVAL '7 days' + INTERVAL '2 hours', NOW() - INTERVAL '7 days' + INTERVAL '150 minutes', '11111111-1111-1111-1111-111111111111'),

    -- Current Sprint Test (in progress)
    ('TR-3', 'TC-1', 'complete', 'pass',
     NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-3', 'TC-2', 'complete', 'pass',
     NOW() - INTERVAL '2 days' + INTERVAL '20 minutes', NOW() - INTERVAL '2 days' + INTERVAL '35 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-3', 'TC-3', 'in_progress', 'pending',
     NOW() - INTERVAL '1 day', NULL, '11111111-1111-1111-1111-111111111111'),
    ('TR-3', 'TC-4', 'not_started', 'pending',
     NULL, NULL, NULL),

    -- UAT Testing - Complete (all test cases completed and passed)
    ('TR-4', 'TC-1', 'complete', 'pass',
     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours' + INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-4', 'TC-2', 'complete', 'pass',
     NOW() - INTERVAL '3 hours' + INTERVAL '20 minutes', NOW() - INTERVAL '3 hours' + INTERVAL '35 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-4', 'TC-3', 'complete', 'pass',
     NOW() - INTERVAL '3 hours' + INTERVAL '40 minutes', NOW() - INTERVAL '3 hours' + INTERVAL '60 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-4', 'TC-4', 'complete', 'pass',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '25 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-4', 'TC-6', 'complete', 'pass',
     NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' + INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111'),

    -- Integration Test - In Progress (some complete, some in progress, some not started)
    ('TR-5', 'TC-1', 'complete', 'pass',
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '20 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-5', 'TC-2', 'complete', 'pass',
     NOW() - INTERVAL '1 day' + INTERVAL '30 minutes', NOW() - INTERVAL '1 day' + INTERVAL '45 minutes', '11111111-1111-1111-1111-111111111111'),
    ('TR-5', 'TC-5', 'in_progress', 'pending',
     NOW() - INTERVAL '6 hours', NULL, '11111111-1111-1111-1111-111111111111'),
    ('TR-5', 'TC-7', 'not_started', 'pending',
     NULL, NULL, NULL),
    ('TR-5', 'TC-8', 'not_started', 'pending',
     NULL, NULL, NULL),

    -- Smoke Test - Not Started (all test cases not started)
    ('TR-6', 'TC-1', 'not_started', 'pending',
     NULL, NULL, NULL),
    ('TR-6', 'TC-2', 'not_started', 'pending',
     NULL, NULL, NULL),
    ('TR-6', 'TC-3', 'not_started', 'pending',
     NULL, NULL, NULL);

-- Insert sample test step results for completed test cases
-- We'll add results for TC-1 in the first test run as an example
INSERT INTO testing.test_step_results (test_run_case_id, step_number, expected_result, actual_result, status, executed_at, executed_by)
SELECT
    trc.id,
    ts.step_number,
    ts.expected_result,
    CASE
        WHEN trc.result = 'pass' THEN 'As expected - ' || ts.expected_result
        WHEN trc.result = 'fail' AND ts.step_number = 4 THEN 'Failed - Error message not displayed correctly'
        ELSE 'As expected'
    END as actual_result,
    CASE
        WHEN trc.result = 'fail' AND ts.step_number >= 4 THEN 'fail'
        WHEN trc.status = 'complete' THEN 'pass'
        ELSE 'not_executed'
    END as status,
    CASE
        WHEN trc.status = 'complete' THEN trc.started_at + (ts.step_number * INTERVAL '3 minutes')
        ELSE NULL
    END as executed_at,
    trc.executed_by
FROM testing.test_run_cases trc
JOIN testing.test_steps ts ON ts.test_case_id = trc.test_case_id
WHERE trc.status = 'complete';

-- Reset sequences to match the inserted data
SELECT setval('test_run_seq', 6, true);  -- Last TR-6 was inserted
SELECT setval('test_case_seq', 10, true);  -- Last TC-10 was inserted
SELECT setval('test_result_seq', 1, false);  -- No test results inserted yet
-- Add TC-6 to TR-1 (Release 1.0 Test Run) if not already there
INSERT INTO testing.test_run_cases (test_run_id, test_case_id, status, result, started_at, completed_at, executed_by)
VALUES
    ('TR-1', 'TC-6', 'complete', 'pass', NOW() - INTERVAL '13 days' + INTERVAL '2 hours', NOW() - INTERVAL '13 days' + INTERVAL '3 hours', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

-- Create test result sequence if not exists
CREATE SEQUENCE IF NOT EXISTS test_result_seq START WITH 1;

-- Reset sequence for seed data
SELECT setval('test_result_seq', 100, false);

-- Insert test results for approved test run TR-1
-- These are created when a test run is approved
INSERT INTO testing.test_results (id, test_run_id, test_case_id, result, executed_by, executed_at, created_at)
SELECT
    'TRES-' || nextval('test_result_seq'),
    'TR-1',
    trc.test_case_id,
    trc.result,
    trc.executed_by,
    trc.completed_at,
    NOW() - INTERVAL '13 days'
FROM testing.test_run_cases trc
WHERE trc.test_run_id = 'TR-1' AND trc.status = 'complete'
ON CONFLICT DO NOTHING;

-- Insert system-generated traces FROM test cases TO test results for approved test runs
-- These traces are automatically created when a test run is approved
-- Types are determined from ID prefixes: TC- (testcase), TRES- (testresult)
INSERT INTO traces (from_requirement_id, to_requirement_id, created_by, is_system_generated)
SELECT
    tr.test_case_id,
    tr.id,
    '11111111-1111-1111-1111-111111111111',
    TRUE
FROM testing.test_results tr
WHERE tr.test_run_id = 'TR-1'
ON CONFLICT DO NOTHING;

-- Display summary
SELECT 'TEST DATA SUMMARY' as title;
SELECT 'Test Cases' as category, count(*) as total,
       count(CASE WHEN status = 'approved' THEN 1 END) as approved,
       count(CASE WHEN status = 'draft' THEN 1 END) as draft
FROM testing.test_cases
UNION ALL
SELECT 'Test Runs' as category, count(*) as total,
       count(CASE WHEN status = 'approved' THEN 1 END) as approved,
       count(CASE WHEN status IN ('in_progress', 'complete') THEN 1 END) as active
FROM testing.test_runs
UNION ALL
SELECT 'Test Steps' as category, count(*) as total, 0, 0
FROM testing.test_steps
UNION ALL
SELECT 'Test Results' as category, count(*) as total,
       count(CASE WHEN status = 'pass' THEN 1 END) as passed,
       count(CASE WHEN status = 'fail' THEN 1 END) as failed
FROM testing.test_step_results;