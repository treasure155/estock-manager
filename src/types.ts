export type Role = 'owner' | 'manager' | 'cashier';
export type Kind = 'product' | 'service' | 'material';

export interface SessionInfo { token: string; user_id: number; username: string; full_name: string; role: Role }

export interface Branding { business_name: string; business_logo: string; theme_primary: string; theme_secondary: string; theme_mode: string }

export interface TemplateInfo { key: string; name: string; summary: string; categories: string[]; units: string[]; sample_count: number }

export interface Product {
  id: number; sku: string; barcode: string; name: string; category_id: number | null; category_name: string; kind: Kind; unit: string;
  selling_price_kobo: number; cost_price_kobo: number; track_stock: boolean; stock_qty: number; reorder_level: number; description: string; active: boolean;
}

export interface Category { id: number; name: string; sort_order: number; item_count: number }
export interface PaymentMethod { id: number; name: string; active: boolean; sort_order: number }

export interface Movement {
  id: number; product_id: number; product_name: string; unit: string; movement_type: string; quantity_delta: number;
  unit_cost_kobo: number; note: string; receipt_no: string; user_name: string; created_at: string;
}

export interface ReceiptLine { product_name: string; product_kind: Kind; unit: string; quantity: number; unit_price_kobo: number; line_total_kobo: number }
export interface ReceiptPayment { method: string; amount_kobo: number; reference: string; received_by: string; created_at: string }
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'void';
export type Fulfilment = 'none' | 'pending' | 'ready' | 'collected';

export interface Receipt {
  id: number; receipt_no: string; customer_id: number | null; customer_name: string; customer_phone: string; customer_email: string; cashier_name: string;
  subtotal_kobo: number; discount_kobo: number; tax_kobo: number; total_kobo: number; amount_paid_kobo: number; change_kobo: number; balance_kobo: number;
  payment_status: PaymentStatus; fulfilment_status: Fulfilment; collection_date: string; note: string; void_reason: string; voided_by: string; created_at: string;
  items: ReceiptLine[]; payments: ReceiptPayment[];
}

export interface ReceiptSummary {
  id: number; receipt_no: string; customer_name: string; customer_email: string; cashier_name: string; total_kobo: number; amount_paid_kobo: number;
  payment_status: PaymentStatus; fulfilment_status: Fulfilment; collection_date: string; created_at: string; item_count: number;
}

export interface Customer { id: number; name: string; phone: string; email: string; address: string; notes: string; receipt_count: number; total_spent_kobo: number; balance_kobo: number }

export interface UserRow { id: number; username: string; full_name: string; role: Role; active: boolean; last_login_at: string | null; created_at: string }

export interface DayPoint { date: string; total_kobo: number; receipts: number }
export interface Dashboard {
  today_sales_kobo: number; today_receipts: number; today_collected_kobo: number; yesterday_sales_kobo: number; outstanding_kobo: number; owing_receipts: number;
  pending_collections: number; ready_collections: number; product_count: number; low_stock_count: number;
  low_stock: Array<{ id: number; name: string; unit: string; stock_qty: number; reorder_level: number }>; last_7_days: DayPoint[]; scope: 'all' | 'mine';
}

export interface NamedTotal { name: string; count: number; total_kobo: number }
export interface ItemPerformance { name: string; unit: string; quantity: number; revenue_kobo: number; cost_kobo: number; profit_kobo: number }
export interface SalesReport {
  from: string; to: string; receipts: number; voided: number; gross_kobo: number; discount_kobo: number; tax_kobo: number; net_kobo: number;
  collected_kobo: number; outstanding_kobo: number; cost_kobo: number; profit_kobo: number;
  by_day: DayPoint[]; by_method: NamedTotal[]; by_cashier: NamedTotal[]; by_category: NamedTotal[]; items: ItemPerformance[];
}

export type Settings = Record<string, string>;
