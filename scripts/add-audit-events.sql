-- Add comprehensive audit events tracking for reqquli
-- This migration adds event sourcing capabilities to capture all domain events

-- Create audit_events table to store all domain events
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    event_data JSONB NOT NULL,
    metadata JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100)
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_aggregate ON audit_events(aggregate_type, aggregate_id);
CREATE INDEX idx_audit_events_user ON audit_events(user_id);
CREATE INDEX idx_audit_events_occurred_at ON audit_events(occurred_at DESC);
CREATE INDEX idx_audit_events_event_name ON audit_events(event_name);
CREATE INDEX idx_audit_events_metadata ON audit_events USING gin(metadata);

-- Function to capture authentication events
CREATE OR REPLACE FUNCTION audit_auth_event()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type VARCHAR(100);
    v_event_data JSONB;
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
BEGIN
    -- Determine event type based on operation
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'users' THEN
            v_event_type := 'UserRegistered';
            v_event_data := jsonb_build_object(
                'user_id', NEW.id,
                'email', NEW.email,
                'full_name', NEW.full_name,
                'email_verified', NEW.email_verified
            );
            v_user_email := NEW.email;
            v_user_name := NEW.full_name;
        ELSIF TG_TABLE_NAME = 'email_verification_tokens' THEN
            v_event_type := 'EmailVerificationRequested';
            SELECT email, full_name INTO v_user_email, v_user_name
            FROM users WHERE id = NEW.user_id;
            v_event_data := jsonb_build_object(
                'user_id', NEW.user_id,
                'token_id', NEW.id,
                'expires_at', NEW.expires_at
            );
        ELSIF TG_TABLE_NAME = 'token_blacklist' THEN
            v_event_type := 'TokenBlacklisted';
            SELECT email, full_name INTO v_user_email, v_user_name
            FROM users WHERE id = NEW.user_id;
            v_event_data := jsonb_build_object(
                'user_id', NEW.user_id,
                'token_jti', NEW.token_jti,
                'expires_at', NEW.expires_at
            );
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'users' AND OLD.email_verified = FALSE AND NEW.email_verified = TRUE THEN
            v_event_type := 'EmailVerified';
            v_event_data := jsonb_build_object(
                'user_id', NEW.id,
                'email', NEW.email,
                'verified_at', NOW()
            );
            v_user_email := NEW.email;
            v_user_name := NEW.full_name;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Insert audit event
    IF v_event_type IS NOT NULL THEN
        INSERT INTO audit_events (
            event_type, event_name, aggregate_type, aggregate_id,
            user_id, user_email, user_name, event_data, occurred_at
        ) VALUES (
            'Authentication', v_event_type, 'User', COALESCE(NEW.id::VARCHAR, NEW.user_id::VARCHAR),
            COALESCE(NEW.id, NEW.user_id), v_user_email, v_user_name, v_event_data, NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to capture requirement events
CREATE OR REPLACE FUNCTION audit_requirement_event()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type VARCHAR(100);
    v_event_name VARCHAR(255);
    v_aggregate_type VARCHAR(50);
    v_event_data JSONB;
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
    v_user_id UUID;
BEGIN
    -- Set aggregate type
    IF TG_TABLE_NAME = 'user_requirements' THEN
        v_aggregate_type := 'UserRequirement';
        v_event_type := 'Requirements';
    ELSIF TG_TABLE_NAME = 'system_requirements' THEN
        v_aggregate_type := 'SystemRequirement';
        v_event_type := 'Requirements';
    END IF;

    -- Determine event and get user info
    IF TG_OP = 'INSERT' THEN
        v_event_name := v_aggregate_type || 'Created';
        v_user_id := NEW.created_by;
        v_event_data := jsonb_build_object(
            'id', NEW.id,
            'title', NEW.title,
            'description', NEW.description,
            'status', NEW.status,
            'revision', NEW.revision
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check for approval
        IF OLD.status = 'draft' AND NEW.status = 'approved' THEN
            v_event_name := v_aggregate_type || 'Approved';
            v_user_id := NEW.approved_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'title', NEW.title,
                'revision', NEW.revision,
                'approval_notes', NEW.approval_notes,
                'approved_at', NEW.approved_at
            );
        -- Check for reversion to draft
        ELSIF OLD.status = 'approved' AND NEW.status = 'draft' THEN
            v_event_name := v_aggregate_type || 'RevertedToDraft';
            v_user_id := NEW.modified_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'title', NEW.title,
                'previous_revision', OLD.revision,
                'modified_at', NEW.last_modified
            );
        -- Check for soft delete
        ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
            v_event_name := v_aggregate_type || 'Deleted';
            v_user_id := NEW.modified_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'title', NEW.title,
                'deleted_at', NEW.deleted_at
            );
        -- Regular update
        ELSIF OLD.deleted_at IS NULL AND (OLD.title != NEW.title OR OLD.description != NEW.description) THEN
            v_event_name := v_aggregate_type || 'Updated';
            v_user_id := NEW.modified_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'title', NEW.title,
                'description', NEW.description,
                'changes', jsonb_build_object(
                    'title', jsonb_build_object('old', OLD.title, 'new', NEW.title),
                    'description', jsonb_build_object('old', OLD.description, 'new', NEW.description)
                ),
                'modified_at', NEW.last_modified
            );
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Get user details
    IF v_user_id IS NOT NULL THEN
        SELECT email, full_name INTO v_user_email, v_user_name FROM users WHERE id = v_user_id;
    END IF;

    -- Insert audit event
    IF v_event_name IS NOT NULL THEN
        INSERT INTO audit_events (
            event_type, event_name, aggregate_type, aggregate_id,
            user_id, user_email, user_name, event_data, occurred_at
        ) VALUES (
            v_event_type, v_event_name, v_aggregate_type, COALESCE(NEW.id, OLD.id),
            v_user_id, v_user_email, v_user_name, v_event_data, NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to capture trace events
CREATE OR REPLACE FUNCTION audit_trace_event()
RETURNS TRIGGER AS $$
DECLARE
    v_event_name VARCHAR(255);
    v_event_data JSONB;
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
    v_user_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_event_name := 'TraceCreated';
        v_user_id := NEW.created_by;
        v_event_data := jsonb_build_object(
            'trace_id', NEW.id,
            'from_id', NEW.from_requirement_id,
            'from_type', NEW.from_type,
            'to_id', NEW.to_requirement_id,
            'to_type', NEW.to_type,
            'is_system_generated', NEW.is_system_generated
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_event_name := 'TraceDeleted';
        v_user_id := OLD.created_by;
        v_event_data := jsonb_build_object(
            'trace_id', OLD.id,
            'from_id', OLD.from_requirement_id,
            'from_type', OLD.from_type,
            'to_id', OLD.to_requirement_id,
            'to_type', OLD.to_type
        );
    ELSE
        RETURN NEW;
    END IF;

    -- Get user details
    IF v_user_id IS NOT NULL THEN
        SELECT email, full_name INTO v_user_email, v_user_name FROM users WHERE id = v_user_id;
    END IF;

    -- Insert audit event
    INSERT INTO audit_events (
        event_type, event_name, aggregate_type, aggregate_id,
        user_id, user_email, user_name, event_data, occurred_at
    ) VALUES (
        'Traceability', v_event_name, 'Trace', COALESCE(NEW.id::VARCHAR, OLD.id::VARCHAR),
        v_user_id, v_user_email, v_user_name, v_event_data, NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to capture test events
CREATE OR REPLACE FUNCTION audit_test_event()
RETURNS TRIGGER AS $$
DECLARE
    v_event_type VARCHAR(100);
    v_event_name VARCHAR(255);
    v_aggregate_type VARCHAR(50);
    v_event_data JSONB;
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
    v_user_id UUID;
BEGIN
    -- Determine aggregate and event type
    IF TG_TABLE_NAME = 'test_cases' THEN
        v_aggregate_type := 'TestCase';
        v_event_type := 'Testing';

        IF TG_OP = 'INSERT' THEN
            v_event_name := 'TestCaseCreated';
            v_user_id := NEW.created_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'title', NEW.title,
                'description', NEW.description,
                'status', NEW.status
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status = 'draft' AND NEW.status = 'approved' THEN
                v_event_name := 'TestCaseApproved';
                v_user_id := NEW.approved_by;
                v_event_data := jsonb_build_object(
                    'id', NEW.id,
                    'title', NEW.title,
                    'revision', NEW.revision
                );
            ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
                v_event_name := 'TestCaseDeleted';
                v_user_id := NEW.modified_by;
                v_event_data := jsonb_build_object(
                    'id', NEW.id,
                    'title', NEW.title,
                    'deleted_at', NEW.deleted_at
                );
            ELSIF OLD.title != NEW.title OR OLD.description != NEW.description THEN
                v_event_name := 'TestCaseUpdated';
                v_user_id := NEW.modified_by;
                v_event_data := jsonb_build_object(
                    'id', NEW.id,
                    'title', NEW.title,
                    'description', NEW.description
                );
            ELSE
                RETURN NEW;
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'test_runs' THEN
        v_aggregate_type := 'TestRun';
        v_event_type := 'Testing';

        IF TG_OP = 'INSERT' THEN
            v_event_name := 'TestRunCreated';
            v_user_id := NEW.created_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'name', NEW.name,
                'description', NEW.description,
                'status', NEW.status
            );
        ELSIF TG_OP = 'UPDATE' THEN
            IF OLD.status != 'complete' AND NEW.status = 'complete' THEN
                v_event_name := 'TestRunCompleted';
                v_user_id := NEW.created_by;
                v_event_data := jsonb_build_object(
                    'id', NEW.id,
                    'name', NEW.name,
                    'overall_result', NEW.overall_result
                );
            ELSIF OLD.status != 'approved' AND NEW.status = 'approved' THEN
                v_event_name := 'TestRunApproved';
                v_user_id := NEW.approved_by;
                v_event_data := jsonb_build_object(
                    'id', NEW.id,
                    'name', NEW.name,
                    'overall_result', NEW.overall_result,
                    'approved_at', NEW.approved_at
                );
            ELSE
                RETURN NEW;
            END IF;
        END IF;

    ELSIF TG_TABLE_NAME = 'test_run_cases' THEN
        v_aggregate_type := 'TestRunCase';
        v_event_type := 'Testing';

        IF TG_OP = 'UPDATE' THEN
            IF OLD.status = 'not_started' AND NEW.status = 'in_progress' THEN
                v_event_name := 'TestCaseExecutionStarted';
                v_user_id := NEW.executed_by;
                v_event_data := jsonb_build_object(
                    'test_run_id', NEW.test_run_id,
                    'test_case_id', NEW.test_case_id,
                    'started_at', NEW.started_at
                );
            ELSIF OLD.status != 'complete' AND NEW.status = 'complete' THEN
                v_event_name := 'TestCaseCompleted';
                v_user_id := NEW.executed_by;
                v_event_data := jsonb_build_object(
                    'test_run_id', NEW.test_run_id,
                    'test_case_id', NEW.test_case_id,
                    'result', NEW.result,
                    'completed_at', NEW.completed_at
                );
            ELSE
                RETURN NEW;
            END IF;
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'test_step_results' THEN
        v_aggregate_type := 'TestStep';
        v_event_type := 'Testing';

        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_event_name := 'TestStepExecuted';
            v_user_id := NEW.executed_by;
            v_event_data := jsonb_build_object(
                'test_run_case_id', NEW.test_run_case_id,
                'step_number', NEW.step_number,
                'status', NEW.status,
                'actual_result', NEW.actual_result,
                'evidence_file_id', NEW.evidence_file_id
            );
        ELSE
            RETURN NEW;
        END IF;

    ELSIF TG_TABLE_NAME = 'evidence_files' THEN
        v_aggregate_type := 'Evidence';
        v_event_type := 'Testing';

        IF TG_OP = 'INSERT' THEN
            v_event_name := 'EvidenceFileUploaded';
            v_user_id := NEW.uploaded_by;
            v_event_data := jsonb_build_object(
                'id', NEW.id,
                'file_name', NEW.file_name,
                'file_size', NEW.file_size,
                'mime_type', NEW.mime_type
            );
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- Get user details
    IF v_user_id IS NOT NULL THEN
        SELECT email, full_name INTO v_user_email, v_user_name FROM users WHERE id = v_user_id;
    END IF;

    -- Insert audit event
    IF v_event_name IS NOT NULL THEN
        INSERT INTO audit_events (
            event_type, event_name, aggregate_type, aggregate_id,
            user_id, user_email, user_name, event_data, occurred_at
        ) VALUES (
            v_event_type, v_event_name, v_aggregate_type,
            COALESCE(NEW.id::VARCHAR, NEW.test_run_id || '-' || NEW.test_case_id),
            v_user_id, v_user_email, v_user_name, v_event_data, NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to capture events
-- Authentication triggers
CREATE TRIGGER audit_users_events
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_auth_event();

CREATE TRIGGER audit_email_verification_events
    AFTER INSERT ON email_verification_tokens
    FOR EACH ROW EXECUTE FUNCTION audit_auth_event();

CREATE TRIGGER audit_token_blacklist_events
    AFTER INSERT ON token_blacklist
    FOR EACH ROW EXECUTE FUNCTION audit_auth_event();

-- Requirements triggers
CREATE TRIGGER audit_user_requirements_events
    AFTER INSERT OR UPDATE ON user_requirements
    FOR EACH ROW EXECUTE FUNCTION audit_requirement_event();

CREATE TRIGGER audit_system_requirements_events
    AFTER INSERT OR UPDATE ON system_requirements
    FOR EACH ROW EXECUTE FUNCTION audit_requirement_event();

-- Trace triggers
CREATE TRIGGER audit_traces_events
    AFTER INSERT OR DELETE ON traces
    FOR EACH ROW EXECUTE FUNCTION audit_trace_event();

-- Test triggers
CREATE TRIGGER audit_test_cases_events
    AFTER INSERT OR UPDATE ON testing.test_cases
    FOR EACH ROW EXECUTE FUNCTION audit_test_event();

CREATE TRIGGER audit_test_runs_events
    AFTER INSERT OR UPDATE ON testing.test_runs
    FOR EACH ROW EXECUTE FUNCTION audit_test_event();

CREATE TRIGGER audit_test_run_cases_events
    AFTER UPDATE ON testing.test_run_cases
    FOR EACH ROW EXECUTE FUNCTION audit_test_event();

CREATE TRIGGER audit_test_step_results_events
    AFTER INSERT OR UPDATE ON testing.test_step_results
    FOR EACH ROW EXECUTE FUNCTION audit_test_event();

CREATE TRIGGER audit_evidence_files_events
    AFTER INSERT ON testing.evidence_files
    FOR EACH ROW EXECUTE FUNCTION audit_test_event();

-- Function to manually log events (for application-level events like login)
CREATE OR REPLACE FUNCTION log_audit_event(
    p_event_type VARCHAR(100),
    p_event_name VARCHAR(255),
    p_aggregate_type VARCHAR(50),
    p_aggregate_id VARCHAR(50),
    p_user_id UUID,
    p_event_data JSONB,
    p_metadata JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_user_email VARCHAR(255);
    v_user_name VARCHAR(255);
    v_event_id UUID;
BEGIN
    -- Get user details if user_id provided
    IF p_user_id IS NOT NULL THEN
        SELECT email, full_name INTO v_user_email, v_user_name
        FROM users WHERE id = p_user_id;
    END IF;

    -- Insert audit event
    INSERT INTO audit_events (
        event_type, event_name, aggregate_type, aggregate_id,
        user_id, user_email, user_name, event_data, metadata,
        ip_address, user_agent, session_id, occurred_at
    ) VALUES (
        p_event_type, p_event_name, p_aggregate_type, p_aggregate_id,
        p_user_id, v_user_email, v_user_name, p_event_data, p_metadata,
        p_ip_address, p_user_agent, p_session_id, NOW()
    ) RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for simplified audit trail
CREATE OR REPLACE VIEW audit_trail AS
SELECT
    id,
    occurred_at,
    event_name,
    event_type,
    aggregate_type,
    aggregate_id,
    user_name,
    user_email,
    event_data,
    metadata
FROM audit_events
ORDER BY occurred_at DESC;

-- Create view for user activity
CREATE OR REPLACE VIEW user_activity AS
SELECT
    user_id,
    user_name,
    user_email,
    COUNT(*) as total_events,
    COUNT(DISTINCT DATE(occurred_at)) as active_days,
    MIN(occurred_at) as first_activity,
    MAX(occurred_at) as last_activity,
    jsonb_object_agg(event_type, event_count) as events_by_type
FROM (
    SELECT
        user_id,
        user_name,
        user_email,
        event_type,
        occurred_at,
        COUNT(*) OVER (PARTITION BY user_id, event_type) as event_count
    FROM audit_events
    WHERE user_id IS NOT NULL
) subquery
GROUP BY user_id, user_name, user_email;

-- Create view for system metrics
CREATE OR REPLACE VIEW system_metrics AS
SELECT
    DATE(occurred_at) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(CASE WHEN event_name LIKE '%Created' THEN 1 END) as items_created,
    COUNT(CASE WHEN event_name LIKE '%Approved' THEN 1 END) as items_approved,
    COUNT(CASE WHEN event_name LIKE '%Deleted' THEN 1 END) as items_deleted,
    COUNT(CASE WHEN event_type = 'Testing' THEN 1 END) as test_activities,
    COUNT(CASE WHEN event_type = 'Traceability' THEN 1 END) as trace_activities
FROM audit_events
GROUP BY DATE(occurred_at)
ORDER BY date DESC;

-- Grant appropriate permissions
GRANT SELECT ON audit_events TO reqquli;
GRANT SELECT ON audit_trail TO reqquli;
GRANT SELECT ON user_activity TO reqquli;
GRANT SELECT ON system_metrics TO reqquli;
GRANT EXECUTE ON FUNCTION log_audit_event TO reqquli;