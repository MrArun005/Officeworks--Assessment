const formatters = new Map<string, Intl.NumberFormat>();

/** The currency comes with the product from the API; the client assumes none. */
export function formatPrice(amount: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", { style: "currency", currency });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** "men's clothing" -> "Men's clothing" */
export function formatCategoryName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}
