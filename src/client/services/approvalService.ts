import { userRequirementApi, systemRequirementApi } from './api';
import { CreateUserRequirementRequest, UpdateUserRequirementRequest } from '../../types/user-requirements';
import { CreateSystemRequirementRequest, UpdateSystemRequirementRequest } from '../../types/system-requirements';

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
    const data: UpdateUserRequirementRequest = {
      title,
      description,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await userRequirementApi.update(id, data);
    return response.requirement;
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
    const data: UpdateSystemRequirementRequest = {
      title,
      description,
      status: 'approved',
      password,
      approvalNotes
    };
    
    const response = await systemRequirementApi.update(id, data);
    return response.requirement;
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
  }
};