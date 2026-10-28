//! Business templates: starter categories, units, wording and optional sample
//! inventory. Templates only ever add data (existing SKUs and categories are
//! skipped), so applying one to a live database is safe.

use crate::{auth::{self, Role}, db, AppState};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;

/// (sku, name, category, kind, unit, price ₦, cost ₦, opening stock, reorder level)
type Sample = (&'static str, &'static str, &'static str, &'static str, &'static str, i64, i64, f64, f64);

pub struct Template {
    pub key: &'static str,
    pub name: &'static str,
    pub summary: &'static str,
    pub categories: &'static [&'static str],
    pub units: &'static [&'static str],
    pub extra_payment_methods: &'static [&'static str],
    /// (setting key, value)
    pub settings: &'static [(&'static str, &'static str)],
    pub samples: &'static [Sample],
}

const COMMON_UNITS: &[&str] = &["piece", "pack", "carton", "kg", "g", "litre", "bag", "crate", "dozen", "set", "service", "hour"];

pub const TEMPLATES: &[Template] = &[
    Template {
        key: "general",
        name: "Any other business",
        summary: "A clean start for shops, boutiques, pharmacies, salons, phone accessories, building materials and more. You add your own items.",
        categories: &["General goods", "Services"],
        units: COMMON_UNITS,
        extra_payment_methods: &[],
        settings: &[("label_item", "Item"), ("label_items", "Items"), ("receipt_title", "Sales receipt"), ("receipt_prefix", "RCP"), ("receipt_footer", "Thank you for your patronage.")],
        samples: &[],
    },
    Template {
        key: "supermarket",
        name: "Supermarket / provision store",
        summary: "Groceries, beverages, toiletries and household items, with barcode scanning at the till.",
        categories: &["Beverages", "Grains & staples", "Noodles & pasta", "Cooking essentials", "Dairy & breakfast", "Snacks & confectionery", "Toiletries", "Household & cleaning", "Baby care", "Frozen foods"],
        units: &["piece", "pack", "carton", "sachet", "bottle", "can", "tin", "loaf", "tub", "paint", "kg", "bag", "roll", "dozen", "crate"],
        extra_payment_methods: &[],
        settings: &[("label_item", "Product"), ("label_items", "Products"), ("receipt_title", "Sales receipt"), ("receipt_prefix", "SPM"), ("receipt_footer", "Goods sold in good condition are not returnable. Thank you for shopping with us.")],
        samples: &[
            ("SPM-001", "Peak Milk Powder 400g refill", "Dairy & breakfast", "product", "pack", 4800, 4200, 24.0, 6.0),
            ("SPM-002", "Milo 500g refill", "Dairy & breakfast", "product", "pack", 4500, 3900, 18.0, 6.0),
            ("SPM-003", "Golden Morn 900g", "Dairy & breakfast", "product", "pack", 4200, 3650, 12.0, 4.0),
            ("SPM-004", "Indomie Chicken 70g", "Noodles & pasta", "product", "piece", 300, 240, 200.0, 40.0),
            ("SPM-005", "Indomie Chicken 70g (carton of 40)", "Noodles & pasta", "product", "carton", 11500, 9600, 10.0, 3.0),
            ("SPM-006", "Golden Penny Spaghetti 500g", "Noodles & pasta", "product", "pack", 1300, 1080, 60.0, 15.0),
            ("SPM-007", "Long grain rice 5kg", "Grains & staples", "product", "bag", 9500, 8200, 15.0, 5.0),
            ("SPM-008", "Long grain rice 50kg", "Grains & staples", "product", "bag", 82000, 74000, 6.0, 2.0),
            ("SPM-009", "Golden Penny Semovita 1kg", "Grains & staples", "product", "pack", 1900, 1600, 30.0, 8.0),
            ("SPM-010", "Garri (white) 1 paint", "Grains & staples", "product", "paint", 3500, 2800, 20.0, 5.0),
            ("SPM-011", "Kings Vegetable Oil 1L", "Cooking essentials", "product", "bottle", 3800, 3300, 24.0, 6.0),
            ("SPM-012", "Dangote Sugar 500g", "Cooking essentials", "product", "pack", 1200, 1000, 40.0, 10.0),
            ("SPM-013", "Dangote Salt 500g", "Cooking essentials", "product", "pack", 400, 300, 40.0, 10.0),
            ("SPM-014", "Knorr Chicken cubes (pack of 50)", "Cooking essentials", "product", "pack", 1500, 1250, 30.0, 8.0),
            ("SPM-015", "Gino Tomato Paste 70g", "Cooking essentials", "product", "sachet", 250, 190, 120.0, 30.0),
            ("SPM-016", "Coca-Cola 50cl PET", "Beverages", "product", "bottle", 500, 400, 96.0, 24.0),
            ("SPM-017", "Eva Table Water 75cl", "Beverages", "product", "bottle", 300, 220, 120.0, 24.0),
            ("SPM-018", "Hollandia Yoghurt 1L", "Beverages", "product", "pack", 2600, 2200, 20.0, 6.0),
            ("SPM-019", "Chivita Exotic 1L", "Beverages", "product", "pack", 2400, 2050, 20.0, 6.0),
            ("SPM-020", "Gala Sausage Roll", "Snacks & confectionery", "product", "piece", 300, 250, 60.0, 15.0),
            ("SPM-021", "Digestive biscuit 400g", "Snacks & confectionery", "product", "pack", 1800, 1500, 20.0, 5.0),
            ("SPM-022", "Close-Up Toothpaste 140g", "Toiletries", "product", "piece", 1500, 1250, 30.0, 8.0),
            ("SPM-023", "Joy Beauty Soap", "Toiletries", "product", "piece", 500, 400, 48.0, 12.0),
            ("SPM-024", "Hypo Bleach 1L", "Household & cleaning", "product", "bottle", 1300, 1050, 20.0, 6.0),
            ("SPM-025", "Ariel Detergent 900g", "Household & cleaning", "product", "pack", 3200, 2750, 20.0, 6.0),
            ("SPM-026", "Tissue paper (pack of 10)", "Household & cleaning", "product", "pack", 3500, 2900, 15.0, 5.0),
            ("SPM-027", "Molfix Diapers Size 4 (Maxi)", "Baby care", "product", "pack", 9500, 8300, 10.0, 3.0),
            ("SPM-028", "Frozen chicken 1kg", "Frozen foods", "product", "kg", 5500, 4700, 20.0, 5.0),
            ("SPM-029", "Titus fish (mackerel) 1kg", "Frozen foods", "product", "kg", 4800, 4100, 20.0, 5.0),
            ("SPM-030", "Nylon bag", "Household & cleaning", "product", "piece", 50, 20, 500.0, 100.0),
            ("SPM-031", "Pepsi 50cl PET", "Beverages", "product", "bottle", 500, 400, 96.0, 24.0),
            ("SPM-032", "Fanta Orange 50cl PET", "Beverages", "product", "bottle", 500, 400, 96.0, 24.0),
            ("SPM-033", "Malta Guinness 33cl can", "Beverages", "product", "can", 800, 650, 48.0, 12.0),
            ("SPM-034", "Lucozade Boost 40cl", "Beverages", "product", "bottle", 700, 560, 48.0, 12.0),
            ("SPM-035", "Nestlé Pure Life 75cl", "Beverages", "product", "bottle", 300, 220, 120.0, 24.0),
            ("SPM-036", "Bigi Cola 60cl", "Beverages", "product", "bottle", 350, 260, 72.0, 24.0),
            ("SPM-037", "Lipton Yellow Label tea (100 bags)", "Beverages", "product", "pack", 3200, 2700, 15.0, 5.0),
            ("SPM-038", "Nescafé Classic 50g", "Beverages", "product", "piece", 2800, 2350, 15.0, 5.0),
            ("SPM-039", "Cowbell Milk Powder 380g refill", "Dairy & breakfast", "product", "pack", 3300, 2850, 20.0, 6.0),
            ("SPM-040", "Peak Evaporated Milk 160g tin", "Dairy & breakfast", "product", "tin", 650, 520, 48.0, 12.0),
            ("SPM-041", "Quaker Oats 500g", "Dairy & breakfast", "product", "pack", 3500, 3000, 15.0, 5.0),
            ("SPM-042", "Corn flakes 350g", "Dairy & breakfast", "product", "pack", 4500, 3900, 12.0, 4.0),
            ("SPM-043", "Sliced bread (big loaf)", "Grains & staples", "product", "loaf", 1800, 1500, 20.0, 5.0),
            ("SPM-044", "Honeywell Wheat Meal 1kg", "Grains & staples", "product", "pack", 2200, 1850, 20.0, 6.0),
            ("SPM-045", "Poundo yam flour 1.8kg", "Grains & staples", "product", "pack", 6500, 5600, 10.0, 3.0),
            ("SPM-046", "Honey beans 1kg", "Grains & staples", "product", "pack", 2500, 2050, 20.0, 5.0),
            ("SPM-047", "Long grain rice 25kg", "Grains & staples", "product", "bag", 45000, 41000, 8.0, 2.0),
            ("SPM-048", "Spaghetti 500g (Dangote)", "Noodles & pasta", "product", "pack", 1200, 1000, 60.0, 15.0),
            ("SPM-049", "Indomie Belle-full 210g", "Noodles & pasta", "product", "piece", 900, 750, 60.0, 15.0),
            ("SPM-050", "Power Oil 3L", "Cooking essentials", "product", "bottle", 13500, 12000, 10.0, 3.0),
            ("SPM-051", "Palm oil 1L", "Cooking essentials", "product", "bottle", 2500, 2000, 20.0, 5.0),
            ("SPM-052", "Maggi Star cubes (pack of 50)", "Cooking essentials", "product", "pack", 1600, 1350, 30.0, 8.0),
            ("SPM-053", "Curry powder 10g", "Cooking essentials", "product", "sachet", 200, 150, 100.0, 25.0),
            ("SPM-054", "Thyme 10g", "Cooking essentials", "product", "sachet", 200, 150, 100.0, 25.0),
            ("SPM-055", "Pringles Original 165g", "Snacks & confectionery", "product", "can", 4800, 4100, 12.0, 4.0),
            ("SPM-056", "Cabin biscuit", "Snacks & confectionery", "product", "pack", 800, 650, 40.0, 10.0),
            ("SPM-057", "Plantain chips 100g", "Snacks & confectionery", "product", "pack", 700, 500, 40.0, 10.0),
            ("SPM-058", "Chewing gum (pack)", "Snacks & confectionery", "product", "pack", 300, 220, 60.0, 15.0),
            ("SPM-059", "Dettol Antiseptic Liquid 500ml", "Toiletries", "product", "bottle", 4200, 3600, 12.0, 4.0),
            ("SPM-060", "Sanitary pads (pack of 10)", "Toiletries", "product", "pack", 1800, 1500, 24.0, 6.0),
            ("SPM-061", "Body lotion 400ml", "Toiletries", "product", "bottle", 3500, 2900, 12.0, 4.0),
            ("SPM-062", "Toilet roll (single)", "Toiletries", "product", "roll", 400, 300, 60.0, 15.0),
            ("SPM-063", "Dishwashing liquid 450ml", "Household & cleaning", "product", "bottle", 1500, 1250, 24.0, 6.0),
            ("SPM-064", "Toilet cleaner 500ml", "Household & cleaning", "product", "bottle", 1600, 1300, 20.0, 6.0),
            ("SPM-065", "Insecticide spray 300ml", "Household & cleaning", "product", "can", 3200, 2750, 12.0, 4.0),
            ("SPM-066", "Candles (pack of 6)", "Household & cleaning", "product", "pack", 1200, 900, 20.0, 5.0),
            ("SPM-067", "Baby wipes (64 pcs)", "Baby care", "product", "pack", 2500, 2100, 15.0, 5.0),
            ("SPM-068", "Cerelac Wheat 400g", "Baby care", "product", "pack", 5200, 4600, 10.0, 3.0),
            ("SPM-069", "Frozen turkey wings 1kg", "Frozen foods", "product", "kg", 7500, 6500, 15.0, 5.0),
            ("SPM-070", "Ice cream 1L (vanilla)", "Frozen foods", "product", "tub", 3000, 2500, 12.0, 4.0),
        ],
    },
    Template {
        key: "eatery",
        name: "Eatery / restaurant / canteen",
        summary: "Menu items sold by plate or portion, drinks, and kitchen ingredients you restock.",
        categories: &["Rice dishes", "Swallow & soups", "Proteins", "Sides & small chops", "Drinks", "Kitchen ingredients", "Packaging"],
        units: &["plate", "bowl", "portion", "wrap", "piece", "glass", "bottle", "can", "pack", "set", "trip", "kg", "bag", "litre", "keg", "paint", "tuber", "bunch", "basket", "carton", "cylinder"],
        extra_payment_methods: &[],
        settings: &[("label_item", "Menu item"), ("label_items", "Menu items"), ("receipt_title", "Order receipt"), ("receipt_prefix", "EAT"), ("receipt_footer", "Thank you for eating with us. Please come again.")],
        samples: &[
            ("EAT-001", "Jollof rice", "Rice dishes", "product", "plate", 1500, 700, 60.0, 10.0),
            ("EAT-002", "Fried rice", "Rice dishes", "product", "plate", 1700, 800, 50.0, 10.0),
            ("EAT-003", "White rice & stew", "Rice dishes", "product", "plate", 1300, 600, 50.0, 10.0),
            ("EAT-004", "Pounded yam & egusi soup", "Swallow & soups", "product", "plate", 2500, 1200, 30.0, 6.0),
            ("EAT-005", "Amala & ewedu (gbegiri)", "Swallow & soups", "product", "plate", 2000, 950, 30.0, 6.0),
            ("EAT-006", "Eba & okra soup", "Swallow & soups", "product", "plate", 1800, 850, 30.0, 6.0),
            ("EAT-007", "Goat meat pepper soup", "Swallow & soups", "product", "bowl", 3000, 1600, 20.0, 5.0),
            ("EAT-008", "Fried chicken (quarter)", "Proteins", "product", "portion", 2500, 1500, 40.0, 8.0),
            ("EAT-009", "Beef", "Proteins", "product", "piece", 500, 280, 100.0, 20.0),
            ("EAT-010", "Fish (titus, fried)", "Proteins", "product", "piece", 1500, 850, 40.0, 8.0),
            ("EAT-011", "Boiled egg", "Proteins", "product", "piece", 300, 170, 60.0, 12.0),
            ("EAT-012", "Fried plantain (dodo)", "Sides & small chops", "product", "portion", 500, 250, 50.0, 10.0),
            ("EAT-013", "Moi moi", "Sides & small chops", "product", "wrap", 600, 300, 40.0, 10.0),
            ("EAT-014", "Coleslaw", "Sides & small chops", "product", "portion", 500, 220, 30.0, 6.0),
            ("EAT-015", "Bottled water 75cl", "Drinks", "product", "bottle", 300, 200, 96.0, 24.0),
            ("EAT-016", "Soft drink 50cl", "Drinks", "product", "bottle", 500, 380, 96.0, 24.0),
            ("EAT-017", "Malt drink (can)", "Drinks", "product", "can", 700, 520, 48.0, 12.0),
            ("EAT-018", "Chapman (glass)", "Drinks", "product", "glass", 1500, 600, 30.0, 6.0),
            ("EAT-019", "Takeaway pack", "Packaging", "product", "piece", 200, 120, 200.0, 50.0),
            ("EAT-ING-01", "Rice (50kg bag)", "Kitchen ingredients", "material", "bag", 0, 74000, 4.0, 1.0),
            ("EAT-ING-02", "Vegetable oil (25L keg)", "Kitchen ingredients", "material", "keg", 0, 72000, 2.0, 1.0),
            ("EAT-ING-03", "Fresh tomatoes", "Kitchen ingredients", "material", "basket", 0, 35000, 2.0, 1.0),
            ("EAT-ING-04", "Onions", "Kitchen ingredients", "material", "bag", 0, 45000, 1.0, 1.0),
            ("EAT-ING-05", "Tatashe & rodo pepper", "Kitchen ingredients", "material", "basket", 0, 25000, 2.0, 1.0),
            ("EAT-ING-06", "Whole chicken", "Kitchen ingredients", "material", "kg", 0, 4500, 30.0, 10.0),
            ("EAT-ING-07", "Seasoning cubes (carton)", "Kitchen ingredients", "material", "carton", 0, 28000, 2.0, 1.0),
            ("EAT-ING-08", "Cooking gas (12.5kg refill)", "Kitchen ingredients", "material", "cylinder", 0, 15000, 2.0, 1.0),
            ("EAT-020", "Ofada rice & ayamase", "Rice dishes", "product", "plate", 2500, 1300, 30.0, 6.0),
            ("EAT-021", "Coconut rice", "Rice dishes", "product", "plate", 1800, 850, 30.0, 6.0),
            ("EAT-022", "Native (palm oil) jollof", "Rice dishes", "product", "plate", 1800, 850, 30.0, 6.0),
            ("EAT-023", "Beans porridge & plantain", "Rice dishes", "product", "plate", 1500, 700, 30.0, 6.0),
            ("EAT-024", "Semo & efo riro", "Swallow & soups", "product", "plate", 2000, 950, 30.0, 6.0),
            ("EAT-025", "Fufu & afang soup", "Swallow & soups", "product", "plate", 2500, 1250, 30.0, 6.0),
            ("EAT-026", "Eba & edikang ikong", "Swallow & soups", "product", "plate", 2500, 1300, 30.0, 6.0),
            ("EAT-027", "Pounded yam & ogbono", "Swallow & soups", "product", "plate", 2300, 1150, 30.0, 6.0),
            ("EAT-028", "Fisherman soup", "Swallow & soups", "product", "bowl", 5000, 3000, 15.0, 4.0),
            ("EAT-029", "Catfish pepper soup", "Swallow & soups", "product", "bowl", 4000, 2400, 15.0, 4.0),
            ("EAT-030", "Banga soup & starch", "Swallow & soups", "product", "plate", 2800, 1400, 20.0, 5.0),
            ("EAT-031", "Wheat & oha soup", "Swallow & soups", "product", "plate", 2300, 1150, 20.0, 5.0),
            ("EAT-032", "Goat meat (piece)", "Proteins", "product", "piece", 1000, 600, 80.0, 15.0),
            ("EAT-033", "Ponmo", "Proteins", "product", "piece", 300, 150, 80.0, 15.0),
            ("EAT-034", "Shaki (tripe)", "Proteins", "product", "piece", 400, 220, 80.0, 15.0),
            ("EAT-035", "Fried turkey", "Proteins", "product", "portion", 3500, 2200, 30.0, 6.0),
            ("EAT-036", "Grilled croaker fish", "Proteins", "product", "piece", 4500, 2800, 15.0, 4.0),
            ("EAT-037", "Peppered gizzard", "Proteins", "product", "portion", 1500, 800, 30.0, 6.0),
            ("EAT-038", "Small chops pack", "Sides & small chops", "product", "pack", 2500, 1300, 30.0, 6.0),
            ("EAT-039", "Meat pie", "Sides & small chops", "product", "piece", 800, 400, 40.0, 10.0),
            ("EAT-040", "Asun (spicy goat meat)", "Sides & small chops", "product", "portion", 3500, 2000, 20.0, 5.0),
            ("EAT-041", "Beef suya", "Sides & small chops", "product", "portion", 2000, 1100, 30.0, 6.0),
            ("EAT-042", "Fried yam & pepper sauce", "Sides & small chops", "product", "portion", 1200, 550, 30.0, 6.0),
            ("EAT-043", "Akara (5 balls)", "Sides & small chops", "product", "portion", 500, 220, 40.0, 10.0),
            ("EAT-044", "Vegetable salad", "Sides & small chops", "product", "portion", 1000, 500, 20.0, 5.0),
            ("EAT-045", "Chicken shawarma", "Sides & small chops", "product", "wrap", 3500, 2000, 30.0, 6.0),
            ("EAT-046", "Zobo 50cl", "Drinks", "product", "bottle", 700, 300, 40.0, 10.0),
            ("EAT-047", "Fresh orange juice", "Drinks", "product", "glass", 1500, 700, 20.0, 5.0),
            ("EAT-048", "Energy drink (can)", "Drinks", "product", "can", 900, 700, 48.0, 12.0),
            ("EAT-049", "Yoghurt drink 50cl", "Drinks", "product", "bottle", 900, 700, 30.0, 8.0),
            ("EAT-050", "Fruit smoothie", "Drinks", "product", "glass", 2500, 1200, 15.0, 4.0),
            ("EAT-051", "Small nylon bag", "Packaging", "product", "piece", 50, 20, 300.0, 50.0),
            ("EAT-052", "Takeaway cutlery set", "Packaging", "product", "set", 100, 50, 200.0, 50.0),
            ("EAT-053", "Delivery fee (within town)", "Packaging", "service", "trip", 1000, 0, 0.0, 0.0),
            ("EAT-ING-09", "Beans", "Kitchen ingredients", "material", "paint", 0, 7000, 4.0, 1.0),
            ("EAT-ING-10", "Yam tubers", "Kitchen ingredients", "material", "tuber", 0, 2200, 20.0, 5.0),
            ("EAT-ING-11", "Garri", "Kitchen ingredients", "material", "paint", 0, 3500, 4.0, 1.0),
            ("EAT-ING-12", "Semovita 10kg", "Kitchen ingredients", "material", "bag", 0, 17000, 2.0, 1.0),
            ("EAT-ING-13", "Ground egusi", "Kitchen ingredients", "material", "paint", 0, 6000, 3.0, 1.0),
            ("EAT-ING-14", "Palm oil (25L keg)", "Kitchen ingredients", "material", "keg", 0, 55000, 1.0, 1.0),
            ("EAT-ING-15", "Crayfish", "Kitchen ingredients", "material", "paint", 0, 8000, 2.0, 1.0),
            ("EAT-ING-16", "Stockfish", "Kitchen ingredients", "material", "kg", 0, 15000, 3.0, 1.0),
            ("EAT-ING-17", "Goat meat", "Kitchen ingredients", "material", "kg", 0, 9000, 15.0, 5.0),
            ("EAT-ING-18", "Beef", "Kitchen ingredients", "material", "kg", 0, 7500, 20.0, 5.0),
            ("EAT-ING-19", "Frozen fish (carton)", "Kitchen ingredients", "material", "carton", 0, 60000, 1.0, 1.0),
            ("EAT-ING-20", "Plantain", "Kitchen ingredients", "material", "bunch", 0, 6000, 5.0, 2.0),
        ],
    },
    Template {
        key: "dry_cleaning",
        name: "Dry cleaning / laundry",
        summary: "Priced garment services, collection dates and ready-for-pickup tracking, plus the cleaning supplies you stock.",
        categories: &["Washing & ironing", "Dry cleaning", "Native & traditional wear", "Household items", "Express service", "Supplies"],
        units: &["piece", "set", "pair", "item", "kg", "sqm", "load", "carton", "litre", "pack", "roll", "can"],
        extra_payment_methods: &[],
        settings: &[("label_item", "Service"), ("label_items", "Services"), ("receipt_title", "Laundry ticket"), ("receipt_prefix", "DRY"), ("track_collection", "1"), ("receipt_footer", "Please bring this ticket at pickup. Items not collected within 30 days may be disposed of.")],
        samples: &[
            ("DRY-001", "Shirt (wash & iron)", "Washing & ironing", "service", "piece", 700, 0, 0.0, 0.0),
            ("DRY-002", "Trouser (wash & iron)", "Washing & ironing", "service", "piece", 700, 0, 0.0, 0.0),
            ("DRY-003", "T-shirt / polo", "Washing & ironing", "service", "piece", 500, 0, 0.0, 0.0),
            ("DRY-004", "Gown / dress", "Washing & ironing", "service", "piece", 1200, 0, 0.0, 0.0),
            ("DRY-005", "Iron only", "Washing & ironing", "service", "piece", 300, 0, 0.0, 0.0),
            ("DRY-006", "Suit (2-piece)", "Dry cleaning", "service", "set", 3500, 0, 0.0, 0.0),
            ("DRY-007", "Suit (3-piece)", "Dry cleaning", "service", "set", 4500, 0, 0.0, 0.0),
            ("DRY-008", "Blazer / jacket", "Dry cleaning", "service", "piece", 2000, 0, 0.0, 0.0),
            ("DRY-009", "Wedding gown", "Dry cleaning", "service", "piece", 15000, 0, 0.0, 0.0),
            ("DRY-010", "Agbada (3-piece)", "Native & traditional wear", "service", "set", 5000, 0, 0.0, 0.0),
            ("DRY-011", "Senator / kaftan", "Native & traditional wear", "service", "set", 2000, 0, 0.0, 0.0),
            ("DRY-012", "Aso-oke / gele", "Native & traditional wear", "service", "piece", 2500, 0, 0.0, 0.0),
            ("DRY-013", "Bedsheet with pillowcases", "Household items", "service", "set", 2000, 0, 0.0, 0.0),
            ("DRY-014", "Duvet", "Household items", "service", "piece", 5000, 0, 0.0, 0.0),
            ("DRY-015", "Curtain (per panel)", "Household items", "service", "piece", 2500, 0, 0.0, 0.0),
            ("DRY-016", "Rug / small carpet", "Household items", "service", "piece", 6000, 0, 0.0, 0.0),
            ("DRY-017", "Express same-day surcharge", "Express service", "service", "order", 2000, 0, 0.0, 0.0),
            ("DRY-018", "Pickup & delivery", "Express service", "service", "trip", 1500, 0, 0.0, 0.0),
            ("DRY-SUP-01", "Laundry detergent (bag)", "Supplies", "material", "bag", 0, 18000, 4.0, 1.0),
            ("DRY-SUP-02", "Liquid starch", "Supplies", "material", "litre", 0, 2500, 10.0, 3.0),
            ("DRY-SUP-03", "Stain remover", "Supplies", "material", "bottle", 0, 4500, 6.0, 2.0),
            ("DRY-SUP-04", "Wire hangers", "Supplies", "material", "pack", 0, 6000, 5.0, 2.0),
            ("DRY-SUP-05", "Garment nylon covers", "Supplies", "material", "roll", 0, 9000, 3.0, 1.0),
            ("DRY-SUP-06", "Dry-cleaning solvent", "Supplies", "material", "litre", 0, 5500, 20.0, 5.0),
            ("DRY-019", "Jeans", "Washing & ironing", "service", "piece", 800, 0, 0.0, 0.0),
            ("DRY-020", "Shorts", "Washing & ironing", "service", "piece", 500, 0, 0.0, 0.0),
            ("DRY-021", "Skirt", "Washing & ironing", "service", "piece", 800, 0, 0.0, 0.0),
            ("DRY-022", "Blouse", "Washing & ironing", "service", "piece", 800, 0, 0.0, 0.0),
            ("DRY-023", "Singlet / underwear", "Washing & ironing", "service", "piece", 300, 0, 0.0, 0.0),
            ("DRY-024", "School uniform", "Washing & ironing", "service", "set", 1200, 0, 0.0, 0.0),
            ("DRY-025", "Children's clothes", "Washing & ironing", "service", "piece", 400, 0, 0.0, 0.0),
            ("DRY-026", "Towel", "Washing & ironing", "service", "piece", 600, 0, 0.0, 0.0),
            ("DRY-027", "Wash, dry & fold", "Washing & ironing", "service", "kg", 1500, 0, 0.0, 0.0),
            ("DRY-028", "Coat / overcoat", "Dry cleaning", "service", "piece", 3500, 0, 0.0, 0.0),
            ("DRY-029", "Waistcoat", "Dry cleaning", "service", "piece", 1200, 0, 0.0, 0.0),
            ("DRY-030", "Tie", "Dry cleaning", "service", "piece", 500, 0, 0.0, 0.0),
            ("DRY-031", "Evening gown", "Dry cleaning", "service", "piece", 6000, 0, 0.0, 0.0),
            ("DRY-032", "Leather jacket", "Dry cleaning", "service", "piece", 8000, 0, 0.0, 0.0),
            ("DRY-033", "Choir or clergy robe", "Dry cleaning", "service", "piece", 3000, 0, 0.0, 0.0),
            ("DRY-034", "Graduation gown", "Dry cleaning", "service", "piece", 3000, 0, 0.0, 0.0),
            ("DRY-035", "Iro & buba", "Native & traditional wear", "service", "set", 2500, 0, 0.0, 0.0),
            ("DRY-036", "George wrapper", "Native & traditional wear", "service", "piece", 3000, 0, 0.0, 0.0),
            ("DRY-037", "Isiagu / chieftaincy top", "Native & traditional wear", "service", "piece", 2500, 0, 0.0, 0.0),
            ("DRY-038", "Babariga (3-piece)", "Native & traditional wear", "service", "set", 6000, 0, 0.0, 0.0),
            ("DRY-039", "Lace outfit", "Native & traditional wear", "service", "set", 3500, 0, 0.0, 0.0),
            ("DRY-040", "Blanket", "Household items", "service", "piece", 4000, 0, 0.0, 0.0),
            ("DRY-041", "Pillow", "Household items", "service", "piece", 2000, 0, 0.0, 0.0),
            ("DRY-042", "Sofa or cushion cover", "Household items", "service", "piece", 1500, 0, 0.0, 0.0),
            ("DRY-043", "Table cloth", "Household items", "service", "piece", 1500, 0, 0.0, 0.0),
            ("DRY-044", "Large carpet (per square metre)", "Household items", "service", "sqm", 1500, 0, 0.0, 0.0),
            ("DRY-045", "Mosquito net", "Household items", "service", "piece", 1500, 0, 0.0, 0.0),
            ("DRY-046", "Stain removal treatment", "Express service", "service", "item", 1000, 0, 0.0, 0.0),
            ("DRY-047", "Extra starching", "Express service", "service", "item", 200, 0, 0.0, 0.0),
            ("DRY-048", "Shoe or sneaker cleaning", "Express service", "service", "pair", 2500, 0, 0.0, 0.0),
            ("DRY-049", "Bag cleaning", "Express service", "service", "item", 3000, 0, 0.0, 0.0),
            ("DRY-SUP-07", "Fabric softener", "Supplies", "material", "litre", 0, 3000, 10.0, 3.0),
            ("DRY-SUP-08", "Starch spray", "Supplies", "material", "can", 0, 2500, 10.0, 3.0),
            ("DRY-SUP-09", "Garment tags", "Supplies", "material", "pack", 0, 3000, 5.0, 2.0),
            ("DRY-SUP-10", "Branded carrier bags", "Supplies", "material", "pack", 0, 5000, 5.0, 2.0),
            ("DRY-SUP-11", "Bleach", "Supplies", "material", "litre", 0, 1300, 10.0, 3.0),
            ("DRY-SUP-12", "Diesel for generator", "Supplies", "material", "litre", 0, 1300, 50.0, 20.0),
            ("DRY-SUP-13", "Pressing cloth", "Supplies", "material", "piece", 0, 2000, 4.0, 1.0),
        ],
    },
    Template {
        key: "broiler_farm",
        name: "Broiler / poultry farm",
        summary: "Live birds, dressed chicken and parts sold by bird or by kilo, plus farm inputs like chicks, feed and vaccines. Prices can be adjusted at sale.",
        categories: &["Live birds", "Dressed chicken", "Chicken parts", "Eggs", "By-products", "Day-old chicks", "Feed", "Drugs & vaccines", "Farm supplies"],
        units: &["bird", "kg", "pack", "crate", "half crate", "bag", "piece", "vial", "sachet", "litre", "carton", "load", "trip"],
        extra_payment_methods: &[],
        settings: &[("label_item", "Item"), ("label_items", "Items"), ("label_customer", "Buyer"), ("receipt_title", "Farm sales receipt"), ("receipt_prefix", "FRM"), ("allow_price_override", "1"), ("receipt_footer", "Thank you for buying from our farm.")],
        samples: &[
            ("BRL-001", "Live broiler (2.0 to 2.5kg)", "Live birds", "product", "bird", 9500, 6800, 200.0, 20.0),
            ("BRL-002", "Live broiler (2.6 to 3.0kg)", "Live birds", "product", "bird", 11500, 8200, 150.0, 20.0),
            ("BRL-003", "Live broiler (above 3kg)", "Live birds", "product", "bird", 13500, 9600, 80.0, 10.0),
            ("BRL-004", "Spent layer (old layer)", "Live birds", "product", "bird", 7000, 0, 0.0, 0.0),
            ("BRL-005", "Dressed whole chicken", "Dressed chicken", "product", "kg", 5200, 3700, 120.0, 20.0),
            ("BRL-006", "Chicken laps", "Chicken parts", "product", "kg", 5800, 4100, 50.0, 10.0),
            ("BRL-007", "Chicken wings", "Chicken parts", "product", "kg", 5000, 3500, 40.0, 10.0),
            ("BRL-008", "Gizzard", "Chicken parts", "product", "kg", 4500, 3000, 30.0, 5.0),
            ("BRL-009", "Chicken feet & head", "Chicken parts", "product", "kg", 1800, 900, 30.0, 5.0),
            ("BRL-010", "Eggs (crate of 30)", "Eggs", "product", "crate", 5500, 4300, 30.0, 10.0),
            ("BRL-011", "Poultry manure", "By-products", "product", "bag", 1500, 0, 40.0, 0.0),
            ("BRL-012", "Empty feed bags", "By-products", "product", "piece", 150, 0, 100.0, 0.0),
            ("BRL-013", "Slaughter & dressing service", "By-products", "service", "bird", 700, 0, 0.0, 0.0),
            ("BRL-IN-01", "Day-old broiler chicks", "Day-old chicks", "material", "bird", 0, 1100, 0.0, 0.0),
            ("BRL-IN-02", "Broiler starter feed 25kg", "Feed", "material", "bag", 0, 21000, 20.0, 5.0),
            ("BRL-IN-03", "Broiler finisher feed 25kg", "Feed", "material", "bag", 0, 19500, 30.0, 8.0),
            ("BRL-IN-04", "Gumboro (IBD) vaccine 1000 doses", "Drugs & vaccines", "material", "vial", 0, 6500, 4.0, 1.0),
            ("BRL-IN-05", "Lasota (ND) vaccine 1000 doses", "Drugs & vaccines", "material", "vial", 0, 5000, 4.0, 1.0),
            ("BRL-IN-06", "Multivitamin / anti-stress", "Drugs & vaccines", "material", "sachet", 0, 2500, 10.0, 3.0),
            ("BRL-IN-07", "Coccidiostat", "Drugs & vaccines", "material", "sachet", 0, 3500, 6.0, 2.0),
            ("BRL-IN-08", "Wood shavings (litter)", "Farm supplies", "material", "bag", 0, 1500, 40.0, 10.0),
            ("BRL-IN-09", "Disinfectant", "Farm supplies", "material", "litre", 0, 4500, 10.0, 3.0),
            ("BRL-014", "Live broiler (1.5 to 2.0kg)", "Live birds", "product", "bird", 7500, 5500, 100.0, 20.0),
            ("BRL-015", "Cockerel (live)", "Live birds", "product", "bird", 12000, 8000, 40.0, 10.0),
            ("BRL-016", "Turkey (live, medium)", "Live birds", "product", "bird", 45000, 32000, 10.0, 3.0),
            ("BRL-017", "Noiler (live)", "Live birds", "product", "bird", 9000, 6500, 40.0, 10.0),
            ("BRL-018", "Dressed chicken (whole, per bird)", "Dressed chicken", "product", "bird", 11000, 8000, 60.0, 10.0),
            ("BRL-019", "Frozen dressed chicken (10kg carton)", "Dressed chicken", "product", "carton", 52000, 40000, 10.0, 3.0),
            ("BRL-020", "Smoked chicken", "Dressed chicken", "product", "bird", 13500, 9500, 20.0, 5.0),
            ("BRL-021", "Chicken breast", "Chicken parts", "product", "kg", 6500, 4600, 30.0, 8.0),
            ("BRL-022", "Drumsticks", "Chicken parts", "product", "kg", 6000, 4300, 30.0, 8.0),
            ("BRL-023", "Chicken back and neck", "Chicken parts", "product", "kg", 2500, 1500, 30.0, 8.0),
            ("BRL-024", "Chicken liver", "Chicken parts", "product", "kg", 4000, 2500, 15.0, 5.0),
            ("BRL-025", "Chicken cut in 8 (per bird)", "Chicken parts", "product", "bird", 11500, 8200, 20.0, 5.0),
            ("BRL-026", "Eggs (half crate of 15)", "Eggs", "product", "half crate", 2800, 2200, 20.0, 5.0),
            ("BRL-027", "Jumbo eggs (crate)", "Eggs", "product", "crate", 6500, 5100, 15.0, 5.0),
            ("BRL-028", "Cracked eggs (crate)", "Eggs", "product", "crate", 3500, 2500, 5.0, 0.0),
            ("BRL-029", "Poultry manure (truck load)", "By-products", "product", "load", 45000, 0, 2.0, 0.0),
            ("BRL-030", "Feathers", "By-products", "product", "bag", 500, 0, 20.0, 0.0),
            ("BRL-031", "Delivery within town", "By-products", "service", "trip", 2500, 0, 0.0, 0.0),
            ("BRL-032", "Defeathering only", "By-products", "service", "bird", 400, 0, 0.0, 0.0),
            ("BRL-033", "Day-old broiler chicks (resale)", "Day-old chicks", "product", "bird", 1300, 1100, 0.0, 0.0),
            ("BRL-IN-10", "Day-old layer chicks", "Day-old chicks", "material", "bird", 0, 1300, 0.0, 0.0),
            ("BRL-IN-11", "Day-old noiler chicks", "Day-old chicks", "material", "bird", 0, 700, 0.0, 0.0),
            ("BRL-IN-12", "Broiler super starter 25kg", "Feed", "material", "bag", 0, 23000, 10.0, 3.0),
            ("BRL-IN-13", "Maize for feed (100kg)", "Feed", "material", "bag", 0, 65000, 5.0, 2.0),
            ("BRL-IN-14", "Soybean meal 50kg", "Feed", "material", "bag", 0, 48000, 5.0, 2.0),
            ("BRL-IN-15", "Broiler premix 2.5kg", "Feed", "material", "sachet", 0, 9000, 6.0, 2.0),
            ("BRL-IN-16", "Fowl pox vaccine", "Drugs & vaccines", "material", "vial", 0, 5500, 3.0, 1.0),
            ("BRL-IN-17", "Oxytetracycline (antibiotic)", "Drugs & vaccines", "material", "sachet", 0, 3000, 6.0, 2.0),
            ("BRL-IN-18", "Dewormer", "Drugs & vaccines", "material", "sachet", 0, 2500, 6.0, 2.0),
            ("BRL-IN-19", "Glucose (anti-stress)", "Drugs & vaccines", "material", "pack", 0, 1500, 10.0, 3.0),
            ("BRL-IN-20", "Drinkers (4L)", "Farm supplies", "material", "piece", 0, 3500, 20.0, 5.0),
            ("BRL-IN-21", "Feeders (round)", "Farm supplies", "material", "piece", 0, 4500, 20.0, 5.0),
            ("BRL-IN-22", "Charcoal for brooding", "Farm supplies", "material", "bag", 0, 6000, 5.0, 2.0),
            ("BRL-IN-23", "Gas for brooding", "Farm supplies", "material", "kg", 0, 1200, 25.0, 10.0),
            ("BRL-IN-24", "Egg trays", "Farm supplies", "material", "piece", 0, 200, 100.0, 30.0),
            ("BRL-IN-25", "Diesel for generator", "Farm supplies", "material", "litre", 0, 1300, 50.0, 20.0),
            ("BRL-IN-26", "Lime for disinfection", "Farm supplies", "material", "bag", 0, 3000, 5.0, 2.0),
        ],
    },
    Template {
        key: "farm_produce",
        name: "Farm produce / market sales",
        summary: "Crops, tubers, fish and livestock sold by bag, basket, tuber or kilo, with negotiable prices for wholesale buyers.",
        categories: &["Tubers", "Grains & legumes", "Vegetables", "Fruits", "Fish", "Livestock", "Processed products", "Farm inputs"],
        units: &["tuber", "bag", "basket", "bunch", "kg", "paint", "mudu", "crate", "head", "piece", "cob", "keg", "bottle", "tonne"],
        extra_payment_methods: &[],
        settings: &[("label_item", "Produce"), ("label_items", "Produce"), ("label_customer", "Buyer"), ("receipt_title", "Farm sales receipt"), ("receipt_prefix", "FRM"), ("allow_price_override", "1"), ("receipt_footer", "Thank you for your patronage.")],
        samples: &[
            ("FPR-001", "Yam (big tuber)", "Tubers", "product", "tuber", 3500, 2200, 200.0, 30.0),
            ("FPR-002", "Yam (medium tuber)", "Tubers", "product", "tuber", 2200, 1400, 300.0, 40.0),
            ("FPR-003", "Cassava tubers", "Tubers", "product", "bag", 18000, 12000, 20.0, 5.0),
            ("FPR-004", "Sweet potatoes", "Tubers", "product", "basket", 12000, 8000, 10.0, 3.0),
            ("FPR-005", "Maize (dry, 100kg)", "Grains & legumes", "product", "bag", 65000, 52000, 15.0, 3.0),
            ("FPR-006", "Beans (oloyin)", "Grains & legumes", "product", "paint", 9000, 7000, 30.0, 5.0),
            ("FPR-007", "Fresh tomatoes", "Vegetables", "product", "basket", 40000, 30000, 10.0, 2.0),
            ("FPR-008", "Fresh pepper (rodo)", "Vegetables", "product", "basket", 30000, 22000, 8.0, 2.0),
            ("FPR-009", "Ugwu (pumpkin leaves)", "Vegetables", "product", "bunch", 500, 250, 100.0, 20.0),
            ("FPR-010", "Plantain", "Fruits", "product", "bunch", 6000, 4000, 40.0, 10.0),
            ("FPR-011", "Pineapple", "Fruits", "product", "piece", 1500, 900, 60.0, 10.0),
            ("FPR-012", "Catfish (table size)", "Fish", "product", "kg", 4500, 3200, 100.0, 20.0),
            ("FPR-013", "Smoked catfish", "Fish", "product", "kg", 12000, 8500, 20.0, 5.0),
            ("FPR-014", "Goat", "Livestock", "product", "head", 85000, 60000, 10.0, 2.0),
            ("FPR-IN-01", "NPK fertiliser 50kg", "Farm inputs", "material", "bag", 0, 42000, 10.0, 2.0),
            ("FPR-IN-02", "Fish feed 15kg", "Farm inputs", "material", "bag", 0, 24000, 15.0, 4.0),
            ("FPR-IN-03", "Herbicide", "Farm inputs", "material", "litre", 0, 7500, 10.0, 3.0),
            ("FPR-015", "Yam (small tuber)", "Tubers", "product", "tuber", 1200, 700, 300.0, 40.0),
            ("FPR-016", "Cocoyam", "Tubers", "product", "basket", 9000, 6000, 10.0, 3.0),
            ("FPR-017", "Water yam", "Tubers", "product", "tuber", 2500, 1500, 60.0, 10.0),
            ("FPR-018", "Irish potatoes (50kg)", "Tubers", "product", "bag", 60000, 45000, 5.0, 2.0),
            ("FPR-019", "Local rice paddy (100kg)", "Grains & legumes", "product", "bag", 70000, 55000, 8.0, 2.0),
            ("FPR-020", "Groundnut", "Grains & legumes", "product", "paint", 4500, 3300, 30.0, 5.0),
            ("FPR-021", "Soybeans (100kg)", "Grains & legumes", "product", "bag", 70000, 58000, 6.0, 2.0),
            ("FPR-022", "Millet (100kg)", "Grains & legumes", "product", "bag", 55000, 44000, 6.0, 2.0),
            ("FPR-023", "Egusi (melon seed)", "Grains & legumes", "product", "paint", 9000, 7000, 20.0, 5.0),
            ("FPR-024", "Garri (white, 50kg)", "Grains & legumes", "product", "bag", 45000, 36000, 10.0, 3.0),
            ("FPR-025", "Fresh corn", "Grains & legumes", "product", "cob", 300, 150, 200.0, 30.0),
            ("FPR-026", "Onions", "Vegetables", "product", "bag", 90000, 70000, 4.0, 1.0),
            ("FPR-027", "Okra", "Vegetables", "product", "basket", 15000, 10000, 6.0, 2.0),
            ("FPR-028", "Bitter leaf", "Vegetables", "product", "bunch", 500, 250, 60.0, 10.0),
            ("FPR-029", "Waterleaf", "Vegetables", "product", "bunch", 300, 150, 60.0, 10.0),
            ("FPR-030", "Scent leaf", "Vegetables", "product", "bunch", 300, 150, 60.0, 10.0),
            ("FPR-031", "Cucumber", "Vegetables", "product", "piece", 300, 150, 100.0, 20.0),
            ("FPR-032", "Cabbage", "Vegetables", "product", "head", 1500, 900, 40.0, 10.0),
            ("FPR-033", "Garden egg", "Vegetables", "product", "basket", 12000, 8000, 6.0, 2.0),
            ("FPR-034", "Carrot", "Vegetables", "product", "kg", 2000, 1300, 30.0, 8.0),
            ("FPR-035", "Watermelon", "Fruits", "product", "piece", 3500, 2000, 40.0, 10.0),
            ("FPR-036", "Oranges (bag of 100)", "Fruits", "product", "bag", 12000, 8000, 10.0, 3.0),
            ("FPR-037", "Pawpaw", "Fruits", "product", "piece", 1500, 800, 30.0, 8.0),
            ("FPR-038", "Banana", "Fruits", "product", "bunch", 3000, 1800, 30.0, 8.0),
            ("FPR-039", "Avocado", "Fruits", "product", "piece", 800, 450, 60.0, 10.0),
            ("FPR-040", "Mango", "Fruits", "product", "basket", 10000, 6500, 8.0, 2.0),
            ("FPR-041", "Catfish fingerlings", "Fish", "product", "piece", 50, 25, 2000.0, 300.0),
            ("FPR-042", "Catfish juveniles", "Fish", "product", "piece", 120, 70, 1000.0, 200.0),
            ("FPR-043", "Tilapia", "Fish", "product", "kg", 4000, 2800, 40.0, 10.0),
            ("FPR-044", "Dried catfish (big)", "Fish", "product", "piece", 6000, 4200, 20.0, 5.0),
            ("FPR-045", "Ram", "Livestock", "product", "head", 180000, 130000, 4.0, 1.0),
            ("FPR-046", "Pig (live)", "Livestock", "product", "head", 150000, 110000, 4.0, 1.0),
            ("FPR-047", "Rabbit (live)", "Livestock", "product", "head", 12000, 7500, 15.0, 4.0),
            ("FPR-048", "Giant snail", "Livestock", "product", "piece", 800, 450, 100.0, 20.0),
            ("FPR-049", "Honey (75cl)", "Processed products", "product", "bottle", 6000, 3500, 20.0, 5.0),
            ("FPR-050", "Palm oil (25L keg)", "Processed products", "product", "keg", 55000, 45000, 6.0, 2.0),
            ("FPR-051", "Plantain flour", "Processed products", "product", "kg", 3000, 1800, 20.0, 5.0),
            ("FPR-IN-04", "Seed yams", "Farm inputs", "material", "piece", 0, 500, 200.0, 50.0),
            ("FPR-IN-05", "Improved maize seed (10kg)", "Farm inputs", "material", "bag", 0, 18000, 4.0, 1.0),
            ("FPR-IN-06", "Urea fertiliser 50kg", "Farm inputs", "material", "bag", 0, 40000, 6.0, 2.0),
            ("FPR-IN-07", "Poultry manure", "Farm inputs", "material", "bag", 0, 1500, 30.0, 10.0),
            ("FPR-IN-08", "Pesticide", "Farm inputs", "material", "litre", 0, 9000, 6.0, 2.0),
            ("FPR-IN-09", "Jute sacks", "Farm inputs", "material", "piece", 0, 600, 100.0, 30.0),
            ("FPR-IN-10", "Diesel for pump", "Farm inputs", "material", "litre", 0, 1300, 50.0, 20.0),
        ],
    },
];

pub fn find(key: &str) -> Option<&'static Template> {
    TEMPLATES.iter().find(|t| t.key == key)
}

/// Adds the template's categories, payment methods, wording and (optionally)
/// sample items. Existing SKUs and categories are left untouched.
pub fn apply_template(conn: &Connection, key: &str, load_samples: bool, user_name: &str) -> Result<usize, String> {
    let t = find(key).ok_or("Unknown business type")?;
    db::set_setting(conn, "business_type", t.key)?;
    for (k, v) in t.settings {
        db::set_setting(conn, k, v)?;
    }
    for (i, name) in t.categories.iter().enumerate() {
        conn.execute("INSERT OR IGNORE INTO categories(name,sort_order) VALUES(?1,?2)", params![name, i as i64 + 1]).map_err(|e| e.to_string())?;
    }
    for name in t.extra_payment_methods {
        conn.execute("INSERT OR IGNORE INTO payment_methods(name,sort_order) VALUES(?1,99)", [name]).map_err(|e| e.to_string())?;
    }
    let mut added = 0;
    if load_samples {
        for (sku, name, category, kind, unit, price, cost, stock, reorder) in t.samples {
            let exists: Option<i64> = conn.query_row("SELECT id FROM products WHERE sku=?1", [sku], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
            if exists.is_some() { continue; }
            let category_id: Option<i64> = conn.query_row("SELECT id FROM categories WHERE name=?1", [category], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
            let track = if *kind == "service" { 0 } else { 1 };
            let stock = if track == 1 { *stock } else { 0.0 };
            conn.execute(
                "INSERT INTO products(sku,name,category_id,kind,unit,selling_price_kobo,cost_price_kobo,track_stock,stock_qty,reorder_level) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                params![sku, name, category_id, kind, unit, price * 100, cost * 100, track, stock, reorder],
            )
            .map_err(|e| e.to_string())?;
            let id = conn.last_insert_rowid();
            if stock > 0.0 {
                conn.execute(
                    "INSERT INTO stock_movements(product_id,movement_type,quantity_delta,unit_cost_kobo,note,user_name) VALUES(?1,'opening',?2,?3,'Opening stock (sample data)',?4)",
                    params![id, stock, cost * 100, user_name],
                )
                .map_err(|e| e.to_string())?;
            }
            added += 1;
        }
    }
    Ok(added)
}

// ------------------------------------------------------------------ commands

#[derive(Serialize)]
pub struct TemplateInfo {
    key: &'static str,
    name: &'static str,
    summary: &'static str,
    categories: Vec<&'static str>,
    units: Vec<&'static str>,
    sample_count: usize,
}

#[tauri::command]
pub fn list_templates() -> Vec<TemplateInfo> {
    TEMPLATES
        .iter()
        .map(|t| TemplateInfo { key: t.key, name: t.name, summary: t.summary, categories: t.categories.to_vec(), units: t.units.to_vec(), sample_count: t.samples.len() })
        .collect()
}

#[tauri::command]
pub fn apply_business_template(state: tauri::State<'_, AppState>, session_token: String, key: String, load_samples: bool) -> Result<usize, String> {
    let me = auth::require(&state, &session_token, Role::Owner)?;
    let mut conn = state.db()?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let added = apply_template(&tx, &key, load_samples, &me.display_name())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(added)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_template_applies_and_is_idempotent() {
        for t in TEMPLATES {
            let conn = db::test_conn();
            let first = apply_template(&conn, t.key, true, "Test").unwrap();
            assert_eq!(first, t.samples.len(), "template {}", t.key);
            if t.key != "general" { assert!(t.samples.len() >= 50, "template {} has only {} items", t.key, t.samples.len()); }
            let skus: std::collections::HashSet<_> = t.samples.iter().map(|x| x.0).collect();
            assert_eq!(skus.len(), t.samples.len(), "duplicate codes in {}", t.key);
            assert_eq!(apply_template(&conn, t.key, true, "Test").unwrap(), 0);
            // Every sample landed in a declared category.
            let orphans: i64 = conn.query_row("SELECT COUNT(*) FROM products WHERE category_id IS NULL", [], |r| r.get(0)).unwrap();
            assert_eq!(orphans, 0, "template {} has samples in undeclared categories", t.key);
        }
    }
}
