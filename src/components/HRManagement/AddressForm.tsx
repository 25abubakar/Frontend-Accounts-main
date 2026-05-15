import { useState, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { locationApi } from "../../api/locationApi";
import type { CountryDto, ProvinceDto } from "../../types";

const INP = "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";
const DIS = "w-full rounded-xl border-2 border-slate-100 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed";
const LBL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

export interface AddressState {
  addressLine: string;
  country: string;
  province: string;
  city: string;
  district: string;
  postalCode: string;
}

export const emptyAddress = (): AddressState => ({
  addressLine: "", country: "", province: "", city: "", district: "", postalCode: "",
});

interface AddressFormProps {
  prefix: string;
  value: AddressState;
  onChange: (val: AddressState) => void;
  countries: CountryDto[];
}

export default function AddressForm({ prefix, value, onChange, countries }: AddressFormProps) {
  const [provinces, setProvinces] = useState<ProvinceDto[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);

  useEffect(() => {
    if (!value.country) {
      setProvinces([]);
      setCities([]);
      onChange({ ...value, province: "", city: "" });
      return;
    }
    setLoadingProv(true);
    locationApi.getProvinces(value.country)
      .then(setProvinces)
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProv(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.country]);

  useEffect(() => {
    if (!value.country || !value.province) {
      setCities([]);
      onChange({ ...value, city: "" });
      return;
    }
    setLoadingCity(true);
    locationApi.getCities(value.country, value.province)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoadingCity(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.province]);

  const set = (field: keyof AddressState, val: string) => onChange({ ...value, [field]: val });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={LBL}>{prefix} Address Line</label>
        <textarea
          rows={2}
          className={INP + " resize-none"}
          value={value.addressLine}
          onChange={e => set("addressLine", e.target.value)}
          placeholder="Street / building / area"
        />
      </div>

      <div>
        <label className={LBL}>Country</label>
        <div className="relative">
          <select
            className={INP + " appearance-none pr-10"}
            value={value.country}
            onChange={e => {
              onChange({ ...value, country: e.target.value, province: "", city: "" });
            }}
          >
            <option value="">Select country</option>
            {countries.map(c => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div>
        <label className={LBL}>Province / State</label>
        <div className="relative">
          {loadingProv ? (
            <div className={DIS + " flex items-center gap-2"}>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <select
                className={value.country ? INP + " appearance-none pr-10" : DIS}
                disabled={!value.country}
                value={value.province}
                onChange={e => onChange({ ...value, province: e.target.value, city: "" })}
              >
                <option value="">Select province</option>
                {provinces.map(p => (
                  <option key={p.stateCode} value={p.name}>{p.name}</option>
                ))}
              </select>
              {value.country && (
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <label className={LBL}>City</label>
        <div className="relative">
          {loadingCity ? (
            <div className={DIS + " flex items-center gap-2"}>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <select
                className={value.province ? INP + " appearance-none pr-10" : DIS}
                disabled={!value.province}
                value={value.city}
                onChange={e => set("city", e.target.value)}
              >
                <option value="">Select city</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {value.province && (
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <label className={LBL}>District</label>
        <input
          type="text"
          className={INP}
          value={value.district}
          onChange={e => set("district", e.target.value)}
          placeholder="District (optional)"
        />
      </div>

      <div className="sm:col-span-2">
        <label className={LBL}>Postal Code</label>
        <input
          type="text"
          className={INP}
          value={value.postalCode}
          onChange={e => set("postalCode", e.target.value)}
          placeholder="Postal / ZIP code (optional)"
        />
      </div>
    </div>
  );
}