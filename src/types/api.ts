export interface SidebarItem {
  id: number;
  title: string;
  icon: string;
  route: string | null;
  sortOrder: number;
  children: SidebarItem[];
}

export interface AppNoteDto {
  noteId: number;
  title: string;
  noteBody: string;
  noteTypeCode: string;
  sourceTypeCode: string;
  priorityCode: string;
  visibilityTypeCode: string;
  isPublished: boolean;
  isPinned: boolean;
  isPopup: boolean;
  requireAcknowledgement: boolean;
  allowDismiss: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
  isDismissed: boolean;
  isReadOnly: boolean;
  createdBy: string;
  createdOnUtc: string;
}

export interface UserSessionDto {
  isFullAccess: boolean;
  staffId: string | null;
  identityUserId: string;
  sidebar: SidebarItem[];
  permissions: string[];
  loginInstructions: AppNoteDto[];
  unreadInstructionCount: number;
}

export interface AuthResponseDto {
  success: boolean;
  message?: string;
  username?: string;
  email?: string;
  roles: string[];
}

export interface OrganizationVacancyPerson {
  organizationId: number;
  organizationName: string;
  organizationCode?: string;
  vacancyId: string;
  vacancyCode: string;
  jobTitle: string;
  department?: string;
  isFilled: boolean;
  personId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}
