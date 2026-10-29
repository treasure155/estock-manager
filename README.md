# eStock Manager

Offline-first inventory, point of sale and receipt app for **any business that sells goods or services**: supermarkets and provision stores, eateries, dry cleaners and laundries, broiler and poultry farms, farm produce sellers, boutiques, pharmacies, salons and more.

Built with **Tauri 2 + Rust + SQLite** (backend) and **TypeScript + Vite** (frontend). It runs as a desktop app on Windows and macOS, keeps all data on the computer, and works without internet. Internet is needed only for emailing receipts.

## What it does

| Area | Features |
|---|---|
| **Staff and security** | Owner, Manager and Cashier roles with per-role menus and backend permission checks. Argon2 password hashing, 12-hour idle sessions, lockout after 5 failed sign-ins, and every sale and stock change records who did it. |
| **Offline account recovery** | **Forgot password** and **Create a new owner account** on the sign-in screen, verified by a one-time 16-character recovery key or three security questions. The key rotates after each use, recovery locks for 10 minutes after 5 wrong tries, and every attempt is logged in Settings → Security & recovery. |
| **Any business** | Six business templates with categories, units and receipt wording. Supermarket (70 items), Eatery (73), Dry cleaning (62), Broiler farm (59) and Farm produce (68) load their starting inventory automatically, with typical Nigerian prices that can be edited. Any other business starts empty. Templates can be mixed. |
| **Inventory** | Products (stocked), services (no stock, e.g. "Shirt, wash & iron") and internal materials (feed, detergent, ingredients). Categories, barcodes, units, reorder levels, weighted-average cost, receive/remove/count stock with reasons (e.g. mortality, spoilt), full stock history and CSV export. |
| **Point of sale** | Item grid with category filter, barcode scanner support (a scan adds the product; an unknown barcode lets a manager create the product on the spot, and it joins the sale), live receipt ticket, quantity stepper with decimals (kg), discounts (amount or %), optional price change at the till, VAT. |
| **Payments** | Split payments, cash change calculator, custom payment methods (OPay, Moniepoint, etc.), credit and part-paid sales against a named customer, later payments recorded from Receipts. |
| **Receipts** | 58 mm / 80 mm thermal or A4 printing, custom title, number prefix, footer and logo. Void with reason (restocks automatically). Pickup tracking (In progress → Ready → Collected) with collection dates, for dry cleaning, tailoring and repairs. |
| **Email** | Gmail, Outlook / Microsoft 365, Yahoo, Zoho or any SMTP server. Branded HTML receipt with plain-text fallback, inline logo, reply-to, optional copy to self, and a test-email button. |
| **Reports** | Sales, gross profit, money received by method (for till balancing), by category, by staff, items sold with profit, outstanding balances, and CSV exports. |
| **Customise** | Business colours (two-colour theme with 6 presets or any custom colours), light/dark mode, wording ("Product", "Menu item", "Service"; "Customer", "Buyer", "Client"), currency symbol and logo. |
| **Cartons & wholesale** | Sell one item as single units or whole packs (carton, crate, bag) with its own pack price. Wholesale price kicks in automatically from a set quantity. Stock is always kept in base units. |
| **Returns & refunds** | Partial returns by line and quantity. Returned value comes off what the customer owes first; anything paid beyond the new total is refunded. Optional restock (untick for spoilt goods). Reports subtract returns on the day they happen. |
| **Shifts & cash-up** | Open a shift with the float, close it with a cash count. Expected cash = float + cash taken − cash refunds − cash expenses. Short/over shown per shift; printable Z report. Owner can make shifts compulsory. |
| **Purchases & suppliers** | Receive goods by unit or carton, with batch and expiry. Weighted-average cost updates automatically. Track what is owed to each supplier and record payments. |
| **Expenses & net profit** | Expense book with categories. Reports show gross profit, expenses and net profit. |
| **Expiry & batches** | Per-item expiry tracking. Sales and write-offs use the earliest-expiring batch first (FEFO). Overview warns about expired and soon-to-expire batches. |
| **Recipes** | Meals or services linked to ingredients. Each sale deducts the ingredients and uses their cost for profit. |
| **Broiler flocks** | Flocks with daily mortality, culls, feed and weight; costs (optionally issued from stock); bird sales. Shows birds alive, mortality %, FCR, cost per bird/kg and profit. |
| **WhatsApp & statements** | Send receipts and customer statements of account on WhatsApp (number auto-converted to +234). Printable statements with running balance. |
| **Held sales & labels** | Park and resume sales. Print price labels with EAN-13 / Code 128 barcodes on A4 label sheets or a label printer. |
| **Backup** | Automatic daily backup (default `Documents/eStock Backups`, newest 14 kept), custom folder (flash drive, Drive/OneDrive folder), Back up now. |
| **Licensing** | 14-day free trial per computer, then a licence key made for that computer's Install ID. Keys are Ed25519-signed; only the admin's private key can create them. |
| **Auto-update** | Signed updates from GitHub Releases. Owners/managers see a banner when a new version is out and install it from Settings → Updates. |
| **How to** | The full user guide inside the app (Help → How to), with search and printing. It works offline. |

## Requirements

- **Rust** stable: install from https://rustup.rs
- **Node.js** 20 LTS or newer, with npm
- **Windows:** Microsoft C++ Build Tools ("Desktop development with C++") and the WebView2 runtime (already on Windows 10/11)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)

## Run commands

From the project folder (`estock-manager/`):

```bash
# 1. Install frontend dependencies (first time, and after updates)
npm install

# 2. Run the desktop app in development mode (hot reload)
npm run tauri dev

# 3. Build the installer for this computer's OS
npm run tauri build
```

Other useful commands:

```bash
npm run build                                         # type-check and build the frontend only
cargo test --manifest-path src-tauri/Cargo.toml        # run the 36 backend tests
cargo check --manifest-path src-tauri/Cargo.toml       # compile-check the backend
npm run icons                                          # regenerate every icon from src-tauri/icons/app-icon.png
```

Installers are written to `src-tauri/target/release/bundle/`:

- Windows: `msi/eStock Manager_2.0.0_x64_en-US.msi` and `nsis/eStock Manager_2.0.0_x64-setup.exe`
- macOS: `dmg/eStock Manager_2.0.0_aarch64.dmg` (or `_x64.dmg` on Intel Macs) and `macos/eStock Manager.app`

A local build without the licence public key cannot be activated (it shows a 14-day trial, then locks). Official installers come from GitHub Actions, see **Keys and releases** below.

## Keys and releases (admin only)

Two key pairs protect the app. Their **private halves live only on the admin's computer** in `~/.estock-keys/` (Windows: `C:\Users\<you>\.estock-keys\`). Never put that folder in the project or on GitHub, and back it up to a flash drive: if it is lost you can no longer issue licences or ship updates to existing installs.

| Key | Private file (admin computer) | Public half (committed) | Used for |
|---|---|---|---|
| Licence signing (Ed25519) | `~/.estock-keys/license-private.pem` | `src-tauri/license_public_key.txt` | Making licence keys |
| Update signing (minisign) | `~/.estock-keys/updater.key` + `updater-password.txt` | `plugins.updater.pubkey` in `src-tauri/tauri.conf.json` | Signing installers so installed apps accept updates |

### One-time setup (admin computer)

```bash
npm install
npm run setup-keys
```

This creates both key pairs (never overwrites existing ones), writes the two public keys into the project and, if the GitHub CLI (`gh`) is signed in, stores `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` as repository secrets. Without `gh`, it prints the two values to paste under GitHub → repo → Settings → Secrets and variables → Actions.

### Issue a licence (one per computer)

The customer opens **Settings → Licence** (or the activation screen) and sends you the Install ID.

```bash
npm run license -- issue G147-RQYW-Y4VJ-4EQK                          # never expires
npm run license -- issue G147-RQYW-Y4VJ-4EQK --days 365 --note "Iya Bisi, Ikot Ekpene"
npm run license -- list                                               # everything issued
```

Send back the `ESTK-…` key. It only works on the computer with that Install ID. Issued keys are logged in `~/.estock-keys/issued-licences.csv`.

### Release a version (one push)

1. Raise the version in `package.json`, `src-tauri/tauri.conf.json` and `src-tauri/Cargo.toml` (all three must match).
2. Run:

```bash
npm run release
```

It checks the versions and keys, commits, tags `vX.Y.Z` and pushes the branch and tag together. GitHub Actions builds the Windows (`.exe`, `.msi`) and macOS (universal `.dmg`) installers, signs the update files and **publishes the release** (not a draft) with `latest.json`. Installed copies offer the update automatically. The workflow stops with a clear error if a key or secret is missing.

The macOS app is not notarised, so first-time Mac users right-click the app → Open (or System Settings → Privacy & Security → Open Anyway).

## First run

1. Open the app. The setup screen asks for your **business name** and **what the business sells**. That type's starting items load automatically.
2. Create the **owner account** (full name, username, password of 8+ characters).
3. Choose and answer **three security questions**, then **print or write down the recovery key** the app shows. It is shown only once.
4. Go to **Settings** to set the address, phone, logo, receipt wording, paper size, colours and email.
5. Go to **Staff** to add managers and cashiers. Each person signs in with their own account.
6. Go to **Inventory** to edit the sample items or add your own, then sell from **New sale** (shortcut **F2**; **F9** takes payment).

### Role permissions

| | Cashier | Manager | Owner |
|---|:-:|:-:|:-:|
| Make sales, print and email receipts, add customers | ✓ | ✓ | ✓ |
| Record payments on receipts they issued | ✓ | ✓ | ✓ |
| See all receipts, void receipts | | ✓ | ✓ |
| Inventory, stock, categories, reports, exports | | ✓ | ✓ |
| Staff accounts, settings, email, payment methods, templates, backup | | | ✓ |

Cashiers never see cost prices or other staff's receipts. Every rule is enforced in the Rust backend, not just hidden in the UI.

## Email setup

Open **Settings → Email**, pick the provider and click **Send test** after saving.

| Provider | Server | Port | Security | Password to use |
|---|---|---|---|---|
| **Gmail / Google Workspace** | smtp.gmail.com | 587 | STARTTLS | A 16-letter **App Password**: turn on 2-Step Verification, then create one at myaccount.google.com/apppasswords. Your normal Gmail password will be rejected. |
| Outlook / Microsoft 365 | smtp.office365.com | 587 | STARTTLS | Mailbox password (the admin must allow Authenticated SMTP) |
| Outlook.com (personal) | smtp-mail.outlook.com | 587 | STARTTLS | Account password or app password |
| Yahoo Mail | smtp.mail.yahoo.com | 465 | SSL/TLS | Yahoo app password |
| Zoho Mail | smtp.zoho.com (.eu / .in) | 465 | SSL/TLS | Password or application-specific password |
| Domain email (cPanel etc.) | mail.yourdomain.com | 465 or 587 | SSL/TLS or STARTTLS | Mailbox password |

Notes:
- Gmail app passwords can be pasted with or without spaces.
- Gmail sends from the signed-in address or an alias added under Gmail → Settings → Accounts → "Send mail as". The limit is about 500 emails a day.
- Passwords are never sent over an unencrypted connection (security "None" is allowed only for a mail server on `localhost`).
- The saved SMTP password is never sent back to the screen. Leave the field blank to keep it.

## Where files go

This is a desktop app, so nothing is uploaded to a server. Place the project files like this:

| File or folder | Destination |
|---|---|
| Whole project | Any folder on the build computer, e.g. `C:\Projects\estock-manager` or `~/Projects/estock-manager` |
| `src-tauri/icons/*` | Stay where they are. Tauri reads them during `npm run tauri build`. |
| Built installer (`.msi` / `-setup.exe` / `.dmg`) | Copy to each shop computer and run it |
| Database (created automatically) | Windows: `%APPDATA%\online.techalphahub.eaterymanager\eatery-manager.sqlite3`. macOS: `~/Library/Application Support/online.techalphahub.eaterymanager/eatery-manager.sqlite3` |
| Automatic backups | `Documents/eStock Backups/estock-backup-YYYYMMDD-HHMMSS.sqlite3` (or the folder chosen in Settings → Backup) |
| Trial marker | `.estock-install` in the app config folder (same folder as the database) |
| Admin signing keys | `~/.estock-keys/` on the admin's computer only |
| CSV exports | Saved to **Downloads** |

**Upgrading from Eatery Manager:** the app identifier and database file name are unchanged, so installing this version over the old one upgrades the existing database in place. Users, products, receipts and settings are kept. The old admin becomes the Owner, finished products become "For sale" items and ingredients become "Internal use" materials. Back up the old database first (close the app and copy the `.sqlite3` file).

**Restoring a backup:** close the app, rename the backup file to `eatery-manager.sqlite3` and replace the file in the database folder above.

## Environment variables

None are required. All configuration (business details, SMTP, theme) lives in the app's Settings and is stored in the local database. If your workflow keeps a `.env` file, the app neither reads nor changes it.

## Project structure

```
estock-manager/
├── .github/workflows/release.yml  Builds the Windows and Mac installers on GitHub
├── index.html                  App shell and print area
├── package.json                Frontend scripts and dependencies
├── vite.config.ts
├── public/logo-mark.svg        Logo used in the app UI
├── public/guide/               Screenshots used on the How to page
├── src/                        Frontend (TypeScript, no framework)
│   ├── main.ts                 Boot, fonts, session lifecycle
│   ├── api.ts                  Backend command wrapper (attaches session token)
│   ├── store.ts                Cached settings, items, categories, payment methods
│   ├── types.ts                Shared types mirroring the Rust structs
│   ├── lib/                    dom, format, theme, icons, receipt, CSV, barcode (EAN-13/Code 128), whatsapp, updater, license-ui
│   ├── styles/                 base.css (tokens, forms), app.css (shell), views.css, print.css, v2.css
│   └── views/                  auth, recovery-ui, shell, dashboard, pos, receipts, inventory, customers, shifts, purchases, expenses, flocks, reports, staff, settings, guide
├── tools/                      Admin-only scripts: setup-keys.mjs, license-admin.mjs, release.mjs, common.mjs
└── src-tauri/                  Backend (Rust)
    ├── Cargo.toml
    ├── tauri.conf.json         Window, CSP, bundle, icon and updater config
    ├── tauri.updater.conf.json Turns on signed update artifacts (used by the release workflow)
    ├── license_public_key.txt  Licence public key (written by npm run setup-keys)
    ├── capabilities/           Window permissions (dialog, WhatsApp links, updater, restart)
    ├── icons/                  App icons for Windows (.ico), macOS (.icns), Linux/Store PNGs, plus the source app-icon.png/.svg
    ├── migrations/
    │   ├── 001_initial.sql     Original eatery schema
    │   ├── 002_universal.sql   Universal multi-user upgrade (runs once, preserves data)
    │   ├── 003_recovery.sql    Recovery key, security questions, security events
    │   └── 004_v2.sql          Packs, wholesale, returns, shifts, expenses, suppliers, purchases, batches, recipes, held sales, flocks
    └── src/
        ├── lib.rs              App state, command registration, print
        ├── db.rs               Connection, WAL, versioned migrations, helpers
        ├── auth.rs             Roles, sessions, sign-in throttling, staff accounts
        ├── recovery.rs         Recovery key, security questions, forgot password, create owner
        ├── templates.rs        Business templates and sample inventory
        ├── inventory.rs        Items, categories, stock movements, payment methods
        ├── sales.rs            Receipts, packs/wholesale, recipes, payments, voids, returns, held sales, customers, statements
        ├── shifts.rs           Cash shifts and Z reports
        ├── expenses.rs         Expense book
        ├── purchases.rs        Suppliers, purchases, supplier payments
        ├── flocks.rs           Broiler flocks and metrics
        ├── license.rs          Install ID, trial, Ed25519 licence keys
        ├── backup.rs           Automatic and manual backups
        ├── reports.rs          Dashboard, sales report (returns, expenses, net profit), CSV save
        ├── settings.rs         Validated settings, branding
        └── email.rs            SMTP (Gmail and others), HTML receipt email
```

## Security notes

- Money is stored as integer kobo, so there are no rounding errors.
- Every sale, stock change, void and payment runs in a single SQLite transaction.
- All SQL uses bound parameters. All user text is HTML-escaped before display, and CSV exports neutralise spreadsheet formulas.
- The window runs under a strict Content Security Policy. Fonts are bundled, so nothing loads from the internet.
- Licence keys are verified offline with an embedded Ed25519 public key; the private key never ships. The trial start is stored in two places and a clock-rollback guard stops trial extension by changing the date.
- Updates are accepted only when signed with the release key (minisign), and are downloaded over HTTPS from GitHub Releases.
- WhatsApp links are the only URLs the app may open (`https://wa.me/*`), plus the project's GitHub page.
- SMTP credentials are stored in the local database, readable only through the Owner role in the app. Protect the Windows/macOS user account with a password, use a dedicated sending mailbox, and keep backups somewhere safe, since they contain your data.

## Account recovery (offline)

- At setup the owner picks three security questions and gets a **recovery key** like `K7QM-4XPA-9TRB-2HWN`. Only scrambled (Argon2) copies of the key and answers are stored.
- **Forgot password?** on the sign-in screen resets the password of any account, after the recovery key or all three answers are given. A deactivated account is switched back on.
- **Create a new owner account** on the sign-in screen adds an Owner after the same check, for when no owner can sign in.
- Using the key replaces it with a new one, which is shown once. Answers are not case-sensitive.
- After 5 wrong recovery attempts, recovery is locked for 10 minutes. Every attempt is listed under **Settings → Security & recovery**, where the owner can also create a new key or change the questions (both need the current password).
- For databases upgraded from an earlier version, the owner sees a "Set up account recovery" notice on the Overview page until both are set.
