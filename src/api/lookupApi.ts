import { httpClient } from "./httpClient";
import type { LookupDto } from "../models/lookupModels";

export const lookupApi = {
  getAll: () => httpClient.get<LookupDto[]>("/api/app-lookups/all"),
  getByType: (typeCode: string) => httpClient.get<LookupDto[]>(`/api/app-lookups/${encodeURIComponent(typeCode)}`),
};
