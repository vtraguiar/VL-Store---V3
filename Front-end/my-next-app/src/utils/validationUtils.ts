export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidCpf = (value: string): boolean => {
  if (!/^\d{11}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (const length of [9, 10]) {
    const sum = [...value.slice(0, length)].reduce(
      (total, digit, i) => total + Number(digit) * (length + 1 - i),
      0,
    );
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(value[length])) return false;
  }
  return true;
};

export const isValidCnpj = (value: string): boolean => {
  if (!/^\d{14}$/.test(value) || /^(\d)\1+$/.test(value)) return false;
  for (const length of [12, 13]) {
    const sum = [...value.slice(0, length)].reduce(
      (total, digit, i) => total + Number(digit) * (((length - 1 - i) % 8) + 2),
      0,
    );
    const remainder = sum % 11;
    if ((remainder < 2 ? 0 : 11 - remainder) !== Number(value[length]))
      return false;
  }
  return true;
};

export const isValidCpfCnpj = (value: string): boolean => {
  const digits = extractDigitsOnly(value);
  return isValidCpf(digits) || isValidCnpj(digits);
};

export const isValidPhone = (digits: string): boolean =>
  /^\d{10,11}$/.test(digits);

export const isValidDateBR = (value: string): boolean => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  if (year < 1) return false;
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date()
  );
};

export const PASSWORD_RULE_TEXT =
  "A senha deve ter pelo menos 8 caracteres, com letra maiúscula, minúscula, número e um destes símbolos: @$!%*?&.";

export const focusFirstError = (errors: Record<string, string>) => {
  requestAnimationFrame(() =>
    document.getElementById(Object.keys(errors)[0])?.focus(),
  );
};

export const isValidPassword = (password: string): boolean => {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const extractDigitsOnly = (value: string): string => {
  return value.replace(/\D/g, "");
};

export const convertToISODate = (date: string): string => {
  const [day, month, year] = date.split("/");
  if (!isValidDateBR(date) || !day || !month || !year) {
    throw new Error("Data inválida");
  }
  return `${year}-${month}-${day}`;
};
