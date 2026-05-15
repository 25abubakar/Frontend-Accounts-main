const fs = require('fs');
const out = `// src/pages/staff/RegisterPersonPage.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, Phone, Shield, ChevronRight, ChevronLeft, Eye, EyeOff,
  Upload, Check, Loader2, AlertCircle, Building2, MapPin,
  ChevronDown, Briefcase, Search, X, CheckCircle2,
} from "lucide-react";
import { locationApi } from "../../api/locationApi";
import { personsApi } from "../../api/personsApi";
import type { RegisterPersonDto, OrgTreeNodeDto } from "../../api/personsApi";
import { staffApi } from "../../api/staffApi";
import { positionApi } from "../../api/positionApi";
import RegistrationSuccessModal from "../../components/staff/RegistrationSuccessModal";
import type { CountryDto, ProvinceDto, VacancyDto } from "../../types";
`;
fs.writeFileSync('C:/Users/ubaidullah/Desktop/Accounts/src/pages/staff/RegisterPersonPage.tsx', out, 'utf8');
console.log('chunk1 written, length=' + out.length);
