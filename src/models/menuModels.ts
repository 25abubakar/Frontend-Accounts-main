export interface MenuDto {
  menuCode: string;
  menuName: string;
  moduleName?: string | null;
  routePath?: string | null;
  iconCss?: string | null;
  sortOrder: number;
}
