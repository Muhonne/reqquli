import { testRunApi } from './api';
import { CreateTestCaseRequest, UpdateTestCaseRequest } from '../../types/test-runs';

/**
 * Test Case Approval Service
 *
 * This service handles ALL test case operations that involve password validation.
 * These operations bypass the store entirely to ensure proper error encapsulation
 * in the PasswordConfirmModal.
 *
 * CRITICAL: These functions should NEVER set store error state.
 * They should only throw errors to be caught by PasswordConfirmModal.
 */

export const testCaseApprovalService = {
  // Create Test Case with Approval
  createTestCaseWithApproval: async (
    title: string,
    description: string,
    steps: { action: string; expectedResult: string }[],
    linkedRequirements: string[],
    password: string
  ) => {
    // First create the test case
    const createData: CreateTestCaseRequest = {
      title,
      description,
      steps,
      linkedRequirements
    };

    const createResponse = await testRunApi.createTestCase(createData);

    // Then approve it
    const approveResponse = await testRunApi.approveTestCase(createResponse.testCase.id, {
      password
    });

    return approveResponse.testCase;
  },

  // Update Test Case with Approval
  updateTestCaseWithApproval: async (
    id: string,
    title: string,
    description: string,
    steps: { action: string; expectedResult: string }[],
    linkedRequirements: string[],
    password: string,
    wasApproved: boolean
  ) => {
    const updateData: UpdateTestCaseRequest = {
      title,
      description,
      steps,
      linkedRequirements
    };

    // If it was already approved, include password in update to revert to draft
    if (wasApproved) {
      updateData.password = password;
    }

    // Update the test case (will revert to draft if was approved)
    await testRunApi.updateTestCase(id, updateData);

    // Always approve after update (this is "Save & Approve" operation)
    const approveResponse = await testRunApi.approveTestCase(id, {
      password
    });
    
    return approveResponse.testCase;
  },

  // Approve Test Case Only
  approveTestCase: async (
    id: string,
    password: string
  ) => {
    const response = await testRunApi.approveTestCase(id, {
      password
    });
    return response.testCase;
  },


  // Delete Test Case with Password
  deleteTestCaseWithPassword: async (
    id: string,
    password: string
  ) => {
    // Pass password in request body for delete
    const response = await testRunApi.deleteTestCase(id, password);
    return response;
  }
};