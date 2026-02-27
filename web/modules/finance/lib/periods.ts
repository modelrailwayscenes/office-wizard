export const UK_TAX_YEAR_START_MONTH = 4; // April
export const UK_TAX_YEAR_START_DAY = 6;

export const getUkTaxYearLabel = (date = new Date()) => {
  const year = date.getFullYear();
  const start = new Date(year, UK_TAX_YEAR_START_MONTH - 1, UK_TAX_YEAR_START_DAY);
  const taxStartYear = date >= start ? year : year - 1;
  const taxEndYear = taxStartYear + 1;
  return `${taxStartYear}-${String(taxEndYear).slice(-2)}`;
};
