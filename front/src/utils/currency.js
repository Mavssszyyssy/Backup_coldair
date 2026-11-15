const pesoAmount = new Intl.NumberFormat("en-PH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPesoAmount = (value) => pesoAmount.format(value);
