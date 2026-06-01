import { useEffect, useState } from "react";
import { menuApi } from "../api/menuApi";
import type { MenuDto } from "../models/menuModels";

export function useMenus() {
  const [menus, setMenus] = useState<MenuDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    menuApi
      .getActive()
      .then((result) => {
        setMenus(Array.isArray(result) ? result : []);
      })
      .catch(() => setMenus([]))
      .finally(() => setLoading(false));
  }, []);

  return { menus, loading };
}
