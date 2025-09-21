-- Migration to add test results and system-generated traces
-- Run this on existing databases to add the new functionality

-- Create sequence for test result numbering
CREATE SEQUENCE IF NOT EXISTS test_result_seq START WITH 1;

-- Test Results table to store execution results
CREATE TABLE IF NOT EXISTS testing.test_results (
    id VARCHAR(20) PRIMARY KEY, -- Format: TRES-N
    test_run_id VARCHAR(20) REFERENCES testing.test_runs(id),
    test_case_id VARCHAR(20) REFERENCES testing.test_cases(id),
    result VARCHAR(20) NOT NULL CHECK (result IN ('pass', 'fail')),
    executed_by UUID REFERENCES users(id),
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure one result per test case per test run
    UNIQUE(test_run_id, test_case_id)
);

-- Indexes for test results
CREATE INDEX IF NOT EXISTS idx_test_results_test_case ON testing.test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_run ON testing.test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_result ON testing.test_results(result);

-- Add testresult to traces type constraints
ALTER TABLE traces
DROP CONSTRAINT IF EXISTS traces_from_type_check,
ADD CONSTRAINT traces_from_type_check
CHECK (from_type IN ('user', 'system', 'testcase', 'testresult'));

ALTER TABLE traces
DROP CONSTRAINT IF EXISTS traces_to_type_check,
ADD CONSTRAINT traces_to_type_check
CHECK (to_type IN ('user', 'system', 'testcase', 'testresult'));

-- Add is_system_generated column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'traces'
                   AND column_name = 'is_system_generated') THEN
        ALTER TABLE traces ADD COLUMN is_system_generated BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Function to prevent deletion of system-generated traces
CREATE OR REPLACE FUNCTION prevent_system_trace_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_system_generated = TRUE THEN
        RAISE EXCEPTION 'Cannot delete system-generated traces';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS protect_system_traces ON traces;

-- Trigger to protect system traces
CREATE TRIGGER protect_system_traces
BEFORE DELETE ON traces
FOR EACH ROW EXECUTE FUNCTION prevent_system_trace_deletion();

-- Verify the migration
SELECT
    'Test Results Table' as component,
    EXISTS(SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'testing' AND table_name = 'test_results') as exists
UNION ALL
SELECT
    'Is System Generated Column' as component,
    EXISTS(SELECT 1 FROM information_schema.columns
           WHERE table_name = 'traces' AND column_name = 'is_system_generated') as exists
UNION ALL
SELECT
    'Test Result Sequence' as component,
    EXISTS(SELECT 1 FROM pg_sequences WHERE sequencename = 'test_result_seq') as exists;