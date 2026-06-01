import { useEffect, useMemo, useState } from "react";
import { lookupApi } from "../api/lookupApi";
import type { LookupDto, LookupMap } from "../models/lookupModels";

export function useLookups() {
  const [lookups, setLookups] = useState<LookupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lookupApi
      .getAll()
      .then((result) => {
        // Guard: API may return wrapped { success, data } or raw array
        const arr = Array.isArray(result) ? result : [];
        setLookups(arr);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load lookups");
        setLookups([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const lookupMap = useMemo<LookupMap>(() => {
    if (!Array.isArray(lookups) || lookups.length === 0) return {};
    return lookups.reduce((acc, item) => {
      if (!acc[item.lookupTypeCode]) acc[item.lookupTypeCode] = [];
      acc[item.lookupTypeCode].push(item);
      return acc;
    }, {} as LookupMap);
  }, [lookups]);

  const getByType = (typeCode: string): LookupDto[] => lookupMap[typeCode] || [];

  const getText = (typeCode: string, valueCode?: string | null): string => {
    if (!valueCode) return "";
    return getByType(typeCode).find((x) => x.valueCode === valueCode)?.displayText || valueCode;
  };

  const getDefault = (typeCode: string): string =>
    getByType(typeCode).find((x) => x.isDefault)?.valueCode || "";

  return { loading, error, lookups, lookupMap, getByType, getText, getDefault };
}
