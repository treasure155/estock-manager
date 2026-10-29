export type Role = 'owner' | 'manager' | 'cashier';
export type Kind = 'product' | 'service' | 'material';

export interface SessionInfo { token: string; user_id: number; username: string; full_name: string; role: Role }

export interface Branding { business_name: string; business_logo: string; theme_primary: string; theme_secondary: string; theme_mode: string }

export interface TemplateInfo { key: string; name: string; summary: string; categories: string[]; units: string[]; sample_count: number }

export interface Product {
  id: number; sku: string; barcode: string; name: string; category_id: number | null; category_name: string; kind: Kind; unit: string;
  selling_price_kobo: number; cost_price_kobo: number; track_stock: boolean; stock_qty: number; reorder_level: number; description: string; active: boolean;
  pack_unit: string; pack_size: number; pack_price_kobo: number; wholesale_price_kobo: number; wholesale_min_qty: number; track_expiry: boolean;
  has_recipe: boolean; recipe_cost_kobo: number;
}

export interface Category { id: number; name: string; sort_order: number; item_count: number }
export interface PaymentMethod { id: number; name: string; active: boolean; sort_order: number }

export interface Movement {
  id: number; product_id: number; product_name: string; unit: string; movement_type: string; quantity_delta: number;
  unit_cost_kobo: number; note: string; receipt_no: string; user_name: string; created_at: string;
}

export interface ReceiptLine { id: number; returned_qty: number; sold_as: string; product_name: string; product_kind: Kind; unit: string; quantity: number; unit_price_kobo: number; line_total_kobo: number }
export interface ReceiptPayment { method: string; amount_kobo: number; reference: string; received_by: string; created_at: string }
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'void';
export type Fulfilment = 'none' | 'pending' | 'ready' | 'collected';

export interface Receipt {
  id: number; receipt_no: string; customer_id: number | null; customer_name: string; customer_phone: string; customer_email: string; cashier_name: string;
  subtotal_kobo: number; discount_kobo: number; tax_kobo: number; total_kobo: number; amount_paid_kobo: number; change_kobo: number; balance_kobo: number;
  payment_status: PaymentStatus; fulfilment_status: Fulfilment; collection_date: string; note: string; void_reason: string; voided_by: string; created_at: string;
  returned_kobo: number; refunded_kobo: number;
  items: ReceiptLine[]; payments: ReceiptPayment[]; returns: ReturnInfo[];
}
export interface ReturnInfo { return_no: string; value_kobo: number; refund_paid_kobo: number; refund_method: string; reason: string; user_name: string; created_at: string }

export interface ReceiptSummary {
  id: number; receipt_no: string; customer_name: string; customer_email: string; cashier_name: string; total_kobo: number; amount_paid_kobo: number;
  returned_kobo: number; refunded_kobo: number; payment_status: PaymentStatus; fulfilment_status: Fulfilment; collection_date: string; created_at: string; item_count: number;
}

export interface Customer { id: number; name: string; phone: string; email: string; address: string; notes: string; receipt_count: number; total_spent_kobo: number; balance_kobo: number }

export interface UserRow { id: number; username: string; full_name: string; role: Role; active: boolean; last_login_at: string | null; created_at: string }

export interface DayPoint { date: string; total_kobo: number; receipts: number }
export interface Dashboard {
  today_sales_kobo: number; today_receipts: number; today_collected_kobo: number; yesterday_sales_kobo: number; outstanding_kobo: number; owing_receipts: number;
  pending_collections: number; ready_collections: number; product_count: number; low_stock_count: number;
  expiring_count: number; expired_count: number; today_expenses_kobo: number; today_returns_kobo: number;
  low_stock: Array<{ id: number; name: string; unit: string; stock_qty: number; reorder_level: number }>; last_7_days: DayPoint[]; scope: 'all' | 'mine';
}

export interface NamedTotal { name: string; count: number; total_kobo: number }
export interface ItemPerformance { name: string; unit: string; quantity: number; revenue_kobo: number; cost_kobo: number; profit_kobo: number }
export interface SalesReport {
  from: string; to: string; receipts: number; voided: number; gross_kobo: number; discount_kobo: number; tax_kobo: number; net_kobo: number;
  collected_kobo: number; outstanding_kobo: number; cost_kobo: number; profit_kobo: number;
  returns_kobo: number; refunds_kobo: number; expenses_kobo: number; net_profit_kobo: number; by_expense: NamedTotal[];
  by_day: DayPoint[]; by_method: NamedTotal[]; by_cashier: NamedTotal[]; by_category: NamedTotal[]; items: ItemPerformance[];
}

export type Settings = Record<string, string>;

export interface LicenseStatus {
  state: 'licensed' | 'trial' | 'expired'; install_id: string; trial_days_left: number; trial_days: number;
  expires_on: string; licensed_since: string; can_activate: boolean; message: string;
}

export interface MethodTotal { method: string; amount_kobo: number }
export interface ShiftReport {
  id: number; user_name: string; status: 'open' | 'closed'; opened_at: string; closed_at: string | null;
  opening_float_kobo: number; cash_sales_kobo: number; cash_refunds_kobo: number; cash_expenses_kobo: number;
  expected_cash_kobo: number; counted_cash_kobo: number; difference_kobo: number; receipts: number; sales_kobo: number; by_method: MethodTotal[]; note: string;
}
export interface ShiftRow { id: number; user_name: string; status: 'open' | 'closed'; opened_at: string; closed_at: string | null; opening_float_kobo: number; expected_cash_kobo: number; counted_cash_kobo: number; difference_kobo: number }

export interface Expense { id: number; expense_date: string; category: string; description: string; amount_kobo: number; method: string; paid_to: string; user_name: string; created_at: string }
export interface ExpenseList { items: Expense[]; total_kobo: number; by_category: Array<[string, number]>; categories: string[] }

export interface Supplier { id: number; name: string; phone: string; email: string; address: string; notes: string; purchase_count: number; total_bought_kobo: number; owed_kobo: number }
export interface PurchaseLine { product_name: string; unit: string; quantity: number; base_quantity: number; unit_cost_kobo: number; line_total_kobo: number; batch_no: string; expiry_date: string }
export interface Purchase {
  id: number; purchase_no: string; supplier_id: number | null; supplier_name: string; invoice_ref: string; total_kobo: number; amount_paid_kobo: number; balance_kobo: number;
  note: string; user_name: string; created_at: string; lines: PurchaseLine[]; payments: Array<{ amount_kobo: number; method: string; reference: string; user_name: string; created_at: string }>;
}
export interface PurchaseSummary { id: number; purchase_no: string; supplier_name: string; invoice_ref: string; total_kobo: number; amount_paid_kobo: number; balance_kobo: number; item_count: number; user_name: string; created_at: string }

export interface Batch { id: number; product_id: number; product_name: string; unit: string; batch_no: string; expiry_date: string; quantity_left: number; days_left: number }
export interface RecipeLine { material_id: number; material_name: string; unit: string; quantity: number; cost_kobo: number }
export interface HeldSale { id: number; label: string; item_count: number; total_kobo: number; cart_json: string; user_name: string; created_at: string }

export interface StatementLine { date: string; kind: string; reference: string; description: string; debit_kobo: number; credit_kobo: number; balance_kobo: number }
export interface Statement { customer_name: string; customer_phone: string; customer_email: string; customer_address: string; from: string; to: string; opening_kobo: number; closing_kobo: number; lines: StatementLine[] }

export interface Flock {
  id: number; code: string; breed: string; house: string; placed_date: string; chicks_placed: number; chick_cost_kobo: number; status: 'active' | 'closed'; closed_date: string; notes: string;
  age_days: number; dead: number; culled: number; sold: number; alive: number; mortality_pct: number; feed_kg: number; latest_weight_kg: number; sold_weight_kg: number; fcr: number;
  costs_kobo: number; revenue_kobo: number; profit_kobo: number; cost_per_bird_kobo: number; cost_per_kg_kobo: number;
}
export interface FlockEntry { id: number; kind: 'log' | 'cost' | 'sale'; date: string; description: string; quantity: number; amount_kobo: number; mortality: number; culls: number; feed_kg: number; avg_weight_kg: number; user_name: string }

export interface BackupStatus { auto: boolean; dir: string; default_dir: string; keep: number; last_auto: string; last_error: string; files: Array<{ name: string; size: number; modified: string }> }
