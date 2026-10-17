export interface Farmer {
  id: string;
  name: string;
  phone: string;
  state: string;
  acres: number;
  language: string;
  created_at: string;
}

const STORAGE_KEY = "farmer";

export const getFarmer = (): Farmer | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Farmer) : null;
  } catch {
    return null;
  }
};

export const saveFarmer = (farmer: Farmer) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(farmer));
};

export const clearFarmer = () => {
  localStorage.removeItem(STORAGE_KEY);
};
