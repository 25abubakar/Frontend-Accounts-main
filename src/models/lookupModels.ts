export interface LookupDto {
  lookupTypeCode: string;
  valueCode: string;
  displayText: string;
  sortOrder: number;
  isDefault: boolean;
  metadataJson?: string | null;
}

export type LookupMap = Record<string, LookupDto[]>;
