import { call } from './api';
import type { Category, PaymentMethod, Product, Settings, TemplateInfo } from './types';

/** Shared, cached reference data. Views call the loaders after any change. */
export const store = {
  settings: {} as Settings,
  products: [] as Product[],
  categories: [] as Category[],
  paymentMethods: [] as PaymentMethod[],
  templates: [] as TemplateInfo[],

  async loadSettings() { this.settings = await call<Settings>('get_settings'); },
  async loadProducts(includeInactive = false) { this.products = await call<Product[]>('list_products', { includeInactive }); },
  async loadCategories() { this.categories = await call<Category[]>('list_categories'); },
  async loadPaymentMethods() { this.paymentMethods = await call<PaymentMethod[]>('list_payment_methods'); },
  async loadTemplates() { if (!this.templates.length) this.templates = await call<TemplateInfo[]>('list_templates'); },

  label(key: 'item' | 'items' | 'customer'): string {
    const fallback = { item: 'Item', items: 'Items', customer: 'Customer' }[key];
    return this.settings[`label_${key}`] || fallback;
  },
  flag(key: string): boolean { return this.settings[key] === '1'; },
  units(): string[] {
    const t = this.templates.find((x) => x.key === this.settings.business_type);
    const base = t?.units ?? ['piece', 'pack', 'carton', 'kg', 'litre', 'bag', 'crate', 'set', 'service'];
    const used = this.products.map((p) => p.unit);
    return [...new Set([...base, ...used])].sort();
  },
};
