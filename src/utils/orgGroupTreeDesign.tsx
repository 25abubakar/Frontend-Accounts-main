import { Globe2, Building2, MapPin, Users, Briefcase, Network } from "lucide-react";
import { type Variants } from "framer-motion";

// 🌟 Added the Smart Flag Dictionary here to fix the broken flags
const COUNTRY_MAP: Record<string, string> = {
  // North America
  "united states": "us", "usa": "us", "america": "us", "us": "us", "canada": "ca", "mexico": "mx",
  // Europe
  "united kingdom": "gb", "uk": "gb", "great britain": "gb", "england": "gb", "scotland": "gb",
  "germany": "de", "france": "fr", "italy": "it", "spain": "es", "netherlands": "nl", 
  "switzerland": "ch", "belgium": "be", "sweden": "se", "norway": "no", "denmark": "dk", 
  "finland": "fi", "ireland": "ie", "portugal": "pt", "greece": "gr", "russia": "ru", "ukraine": "ua",
  // Middle East
  "saudi arabia": "sa", "ksa": "sa", "uae": "ae", "united arab emirates": "ae", "dubai": "ae", 
  "qatar": "qa", "kuwait": "kw", "oman": "om", "bahrain": "bh", "egypt": "eg", "turkey": "tr",
  "israel": "il", "iran": "ir", "iraq": "iq", "jordan": "jo", "lebanon": "lb",
  // Asia
  "pakistan": "pk", "india": "in", "china": "cn", "japan": "jp", "south korea": "kr", "korea": "kr",
  "indonesia": "id", "malaysia": "my", "singapore": "sg", "philippines": "ph", "thailand": "th", 
  "vietnam": "vn", "bangladesh": "bd", "sri lanka": "lk", "nepal": "np", "afghanistan": "af",
  // Africa
  "south africa": "za", "nigeria": "ng", "kenya": "ke", "ghana": "gh", "morocco": "ma", "algeria": "dz",
  // Oceania
  "australia": "au", "aus": "au", "new zealand": "nz",
  // South America
  "brazil": "br", "argentina": "ar", "colombia": "co", "chile": "cl", "peru": "pe"
};

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.02 }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 } 
  }
};

export const getIcon = (label: string, className = "") => {
  switch (label) {
    case "Country": return <Globe2 className={className} />;
    case "Group": return <Network className={className} />; // 🌟 Added Group Icon
    case "Company": return <Building2 className={className} />;
    case "Branch": return <MapPin className={className} />;
    case "Staff": return <Users className={className} />;
    default: return <Briefcase className={className} />;
  }
};

// 🌟 Updated to use smart dictionary instead of substring
export const getFlag = (code: string | null, name: string = "") => {
  let iso = (code || "").trim().toLowerCase();

  // Fix UK specifically
  if (iso === 'uk') iso = 'gb';

  // If the code isn't a perfect 2 letters, use the dictionary!
  if (iso.length !== 2) {
    iso = COUNTRY_MAP[iso] || COUNTRY_MAP[name.toLowerCase().trim()] || "";
  }

  if (iso && iso.length === 2) {
    return (
      <img 
        src={`https://flagcdn.com/w80/${iso}.png`} 
        alt={code || name}
        className="h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }

  // Fallback if no flag is found
  return <Globe2 size={26} className="text-[#00A3FF]" />;
};

export const getCardStyle = (label: string) => {
  switch (label) {
    case "Country": return "bg-gradient-to-br from-blue-50/80 via-white to-blue-100/50 ring-blue-200/50";
    case "Group": return "bg-gradient-to-br from-purple-50/80 via-white to-fuchsia-100/50 ring-purple-200/50"; // 🌟 Added Group Style
    case "Company": return "bg-gradient-to-br from-emerald-50/80 via-white to-teal-100/50 ring-emerald-200/50";
    case "Branch": return "bg-gradient-to-br from-orange-50/80 via-white to-amber-100/50 ring-orange-200/50";
    default: return "bg-white ring-slate-200/60";
  }
};

export const getHoverShadow = (label: string) => {
  switch (label) {
    case "Country": return "0 25px 50px -12px rgba(0, 163, 255, 0.25)";
    case "Group": return "0 25px 50px -12px rgba(168, 85, 247, 0.25)"; // 🌟 Added Group Shadow
    case "Company": return "0 25px 50px -12px rgba(16, 185, 129, 0.25)";
    case "Branch": return "0 25px 50px -12px rgba(249, 115, 22, 0.25)";
    default: return "0 25px 50px -12px rgba(0, 0, 0, 0.15)";
  }
};