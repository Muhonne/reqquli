import { userRequirementApi, systemRequirementApi, riskApi } from './api';
import { CreateUserRequirementRequest, UpdateUserRequirementRequest } from '../../types/user-requirements';
import { CreateSystemRequirementRequest, UpdateSystemRequirementRequest } from '../../types/system-requirements';
import { CreateRiskRecordRequest, UpdateRiskRecordRequest } from '../../types/risks';

/**
 * Approval Service
 * 
 * This service handles ALL operations that involve password validation.
 * These operations bypass the store entirely to ensure proper error encapsulation
 * in the PasswordConfirmModal. 
 * 
 * CRITICAL: These functions should NEVER set store error state.
 * They should only throw errors to be caught by PasswordConfirmModal.
 */

export const approvalService = {
  // User Requirements with Approval
  createUserRequirementWithApproval: async (
    title: string,
    description: string,
    password: string,
    approvalNotes?: string
  ) => {
    const data: CreateUserRequirementRequest = {
      title,
      description,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await userRequirementApi.create(data);
    return response.requirement;
  },

  updateUserRequirementWithApproval: async (
    id: string,
    title: string,
    description: string,
    password: string,
    approvalNotes?: string
  ) => {
    // First, get the current requirement to check if it's already approved
    const currentRequirement = await userRequirementApi.get(id);
    const wasApproved = currentRequirement.requirement.status === 'approved';
    
    // If it was already approved, we need to update it first (which resets to draft)
    // then approve it separately
    if (wasApproved) {
      // Update the requirement (resets to draft)
      await userRequirementApi.update(id, {
        title,
        description,
        password
      });
      
      // Then approve it
      const approveResponse = await userRequirementApi.approve(id, {
        password,
        approvalNotes
      });
      return approveResponse.requirement;
    } else {
      // If it wasn't approved, update with status: 'approved' in one operation
      const data: UpdateUserRequirementRequest = {
        title,
        description,
        status: 'approved',
        password,
        approvalNotes
      };
      
      const response = await userRequirementApi.update(id, data);
      return response.requirement;
    }
  },

  approveUserRequirement: async (
    id: string,
    password: string,
    approvalNotes?: string
  ) => {
    const response = await userRequirementApi.approve(id, {
      password,
      approvalNotes
    });
    return response.requirement;
  },

  // System Requirements with Approval
  createSystemRequirementWithApproval: async (
    title: string,
    description: string,
    password: string,
    approvalNotes?: string
  ) => {
    const data: CreateSystemRequirementRequest = {
      title,
      description,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await systemRequirementApi.create(data);
    return response.requirement;
  },

  updateSystemRequirementWithApproval: async (
    id: string,
    title: string,
    description: string,
    password: string,
    approvalNotes?: string
  ) => {
    // First, get the current requirement to check if it's already approved
    const currentRequirement = await systemRequirementApi.get(id);
    const wasApproved = currentRequirement.requirement.status === 'approved';
    
    // If it was already approved, we need to update it first (which resets to draft)
    // then approve it separately
    if (wasApproved) {
      // Update the requirement (resets to draft)
      await systemRequirementApi.update(id, {
        title,
        description,
        password
      });
      
      // Then approve it
      const approveResponse = await systemRequirementApi.approve(id, {
        password,
        approvalNotes
      });
      return approveResponse.requirement;
    } else {
      // If it wasn't approved, update with status: 'approved' in one operation
      const data: UpdateSystemRequirementRequest = {
        title,
        description,
        status: 'approved',
        password,
        approvalNotes
      };
      
      const response = await systemRequirementApi.update(id, data);
      return response.requirement;
    }
  },

  approveSystemRequirement: async (
    id: string,
    password: string,
    approvalNotes?: string
  ) => {
    const response = await systemRequirementApi.approve(id, {
      password,
      approvalNotes
    });
    return response.requirement;
  },

  // Delete operations with password
  deleteUserRequirement: async (
    id: string,
    password: string
  ) => {
    // Pass password in request body for delete
    const response = await userRequirementApi.delete(id, password);
    return response;
  },

  deleteSystemRequirement: async (
    id: string,
    password: string
  ) => {
    // Pass password in request body for delete
    const response = await systemRequirementApi.delete(id, password);
    return response;
  },

  // Risk Records with Approval
  createRiskWithApproval: async (
    title: string,
    description: string,
    hazard: string,
    harm: string,
    foreseeableSequence: string | undefined,
    severity: number,
    probabilityP1: number,
    probabilityP2: number,
    pTotalCalculationMethod: string,
    password: string,
    approvalNotes?: string
  ) => {
    const data: CreateRiskRecordRequest = {
      title,
      description,
      hazard,
      harm,
      foreseeableSequence,
      severity,
      probabilityP1,
      probabilityP2,
      pTotalCalculationMethod,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await riskApi.create(data);
    return response.requirement;
  },

  updateRiskWithApproval: async (
    id: string,
    title: string,
    description: string,
    hazard: string,
    harm: string,
    foreseeableSequence: string | undefined,
    severity: number,
    probabilityP1: number,
    probabilityP2: number,
    pTotalCalculationMethod: string,
    password: string,
    approvalNotes?: string
  ) => {
    const data: UpdateRiskRecordRequest = {
      title,
      description,
      hazard,
      harm,
      foreseeableSequence,
      severity,
      probabilityP1,
      probabilityP2,
      pTotalCalculationMethod,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await riskApi.update(id, data);
    return response.requirement;
  },

  approveRisk: async (
    id: string,
    password: string,
    approvalNotes?: string
  ) => {
    const response = await riskApi.approve(id, {
      password,
      approvalNotes
    });
    return response.requirement;
  },

  deleteRisk: async (
    id: string,
    password: string
  ) => {
    // Pass password in request body for delete
    const response = await riskApi.delete(id, password);
    return response;
  }
};