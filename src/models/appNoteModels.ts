export interface AppNoteDto {
  noteId: number;
  title: string;
  noteBody: string;
  noteTypeCode: string;
  sourceTypeCode: string;
  categoryCode?: string | null;
  priorityCode: string;
  visibilityTypeCode: string;
  menuCode?: string | null;
  moduleName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isPublished: boolean;
  isPinned: boolean;
  isPopup: boolean;
  requireAcknowledgement: boolean;
  allowDismiss: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
  isDismissed: boolean;
  createdBy?: string | null;
  createdOnUtc: string;
  targets?: AppNoteTargetRequest[];
}

export interface AppNoteTargetRequest {
  targetTypeCode: string; // "ALL" | "STAFF" | "DEPARTMENT" | "ROLE"
  targetValue: string;    // staffId | deptId | jobTitle | "*"
}

export interface CreateAppNoteRequest {
  title: string;
  noteBody: string;
  noteTypeCode: string;
  sourceTypeCode: string;
  categoryCode?: string | null;
  priorityCode: string;
  visibilityTypeCode: string;
  menuCode?: string | null;
  moduleName?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  startDateUtc?: string | null;
  endDateUtc?: string | null;
  isPublished: boolean;
  isPinned: boolean;
  isPopup: boolean;
  requireAcknowledgement: boolean;
  allowDismiss: boolean;
  targets: AppNoteTargetRequest[];
}
