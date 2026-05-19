/**
 * Permission utility functions
 * Used to check user permissions throughout the app
 */

export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

export const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: string[]
): boolean => {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

/**
 * Permission keys used throughout the application
 */
export const PERMISSIONS = {
  // Department Permissions
  DEPT_VIEW: 'DEPT_VIEW',
  DEPT_VIEW_ALL: 'DEPT_VIEW_ALL',
  DEPT_CREATE: 'DEPT_CREATE',
  DEPT_EDIT: 'DEPT_EDIT',
  DEPT_DELETE: 'DEPT_DELETE',

  // Employee Permissions
  EMPLOYEE_VIEW: 'EMPLOYEE_VIEW',
  EMPLOYEE_VIEW_ALL: 'EMPLOYEE_VIEW_ALL',
  EMPLOYEE_EDIT: 'EMPLOYEE_EDIT',
  EMPLOYEE_DELETE: 'EMPLOYEE_DELETE',

  // Person Permissions
  PERSON_VIEW: 'PERSON_VIEW',
  PERSON_VIEW_ALL: 'PERSON_VIEW_ALL',
  PERSON_REGISTER: 'PERSON_REGISTER',
  PERSON_EDIT: 'PERSON_EDIT',

  // Access Group Permissions
  ACCESS_GROUP_VIEW: 'ACCESS_GROUP_VIEW',
  ACCESS_GROUP_CREATE: 'ACCESS_GROUP_CREATE',
  ACCESS_GROUP_EDIT: 'ACCESS_GROUP_EDIT',
  ACCESS_GROUP_ASSIGN: 'ACCESS_GROUP_ASSIGN',

  // Vacancy Permissions
  VACANCY_VIEW: 'VACANCY_VIEW',
  VACANCY_CREATE: 'VACANCY_CREATE',
  VACANCY_EDIT: 'VACANCY_EDIT',
  VACANCY_DELETE: 'VACANCY_DELETE',
} as const;
