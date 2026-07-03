function parseDate(value) {
    if (!value || value === "TBD" || value === "-")
        return null;
    if (value instanceof Date)
        return Number.isNaN(value.getTime()) ? null : value;
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (dateOnly) {
        const [, year, month, day] = dateOnly;
        return new Date(Number(year), Number(month) - 1, Number(day), 0, 0);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export function formatDateTimeCompact(value) {
    const date = parseDate(value);
    if (!date)
        return value ? String(value) : "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = MONTHS[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year} ${hours}:${minutes}`;
}

export const formatDateToDDMMYYYY = (dateInput) => {
  if (!dateInput) return "";

  let date;

  if (typeof dateInput === "string") {
    const trimmedDate = dateInput.trim();

    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(trimmedDate)) {
      const [day, month, year] = trimmedDate.split(/[-/]/).map(Number);
      date = new Date(year, month - 1, day);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      const [year, month, day] = trimmedDate.split("-").map(Number);
      date = new Date(year, month - 1, day);
    } else {
      date = new Date(trimmedDate);
    }
  } else {
    date = new Date(dateInput);
  }

  if (isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};