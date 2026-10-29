export const formatPhoneNumber = (value) => {
  if (!value) return '';
  const num = value.replace(/[^0-9]/g, '');
  if (num.length <= 3) return num;
  if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
};

export const readLocalFlag = (key) => {
  try {
    const v = localStorage.getItem(key);
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
};

export const writeLocalFlag = (key, value) => {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
};

export const hasAccountOnList = (userAccountNumber) =>
  typeof userAccountNumber === 'string' && userAccountNumber.startsWith('기재');

