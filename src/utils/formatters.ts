// Currency formatter in INR (₹)
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// Compact currency formatter (e.g. ₹1.5L, ₹50k)
export function formatCompactCurrency(amount: number): string {
  if (isNaN(amount)) return '₹0';
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return formatCurrency(amount);
}

// Date formatter YYYY-MM-DD to "DD MMM YYYY"
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

// Percentage formatter
export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
}
