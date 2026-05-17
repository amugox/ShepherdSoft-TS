export const isSuperAdminRole = (role: string | number | null | undefined): boolean => {
  const normalized = String(role ?? '').trim().toLowerCase();
  return normalized === '0' || normalized.includes('super');
};

export const isAdminRole = (role: string | number | null | undefined): boolean => {
  const normalized = String(role ?? '').trim().toLowerCase();
  return isSuperAdminRole(normalized) || normalized.includes('admin') || normalized === '1';
};
