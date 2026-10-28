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
| **Backup** | One-click database backup to Downloads. |
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
cargo test --manifest-path src-tauri/Cargo.toml        # run the 23 backend tests
cargo check --manifest-path src-tauri/Cargo.toml       # compile-check the backend
npm run icons                                          # regenerate every icon from src-tauri/icons/app-icon.png
```

Installers are written to `src-tauri/target/release/bundle/`:

- Windows: `msi/eStock Manager_1.1.0_x64_en-US.msi` and `nsis/eStock Manager_1.1.0_x64-setup.exe`
- macOS: `dmg/eStock Manager_1.1.0_aarch64.dmg` (or `_x64.dmg` on Intel Macs) and `macos/eStock Manager.app`

Build the Windows installer on Windows and the macOS installer on a Mac. To share the macOS app beyond your own machines, sign and notarise it with an Apple Developer account.

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
| Backups | Saved to the user's **Downloads** folder as `estock-backup-YYYYMMDD-HHMMSS.sqlite3` |
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
│   ├── lib/                    dom helpers, formatting, theme engine, icons, receipt renderer, CSV
│   ├── styles/                 base.css (tokens, forms), app.css (shell), views.css, print.css
│   └── views/                  auth, recovery-ui, shell, dashboard, pos, receipts, inventory, customers, reports, staff, settings, guide (How to)
└── src-tauri/                  Backend (Rust)
    ├── Cargo.toml
    ├── tauri.conf.json         Window, CSP, bundle and icon config
    ├── icons/                  App icons for Windows (.ico), macOS (.icns), Linux/Store PNGs, plus the source app-icon.png/.svg
    ├── migrations/
    │   ├── 001_initial.sql     Original eatery schema
    │   ├── 002_universal.sql   Universal multi-user upgrade (runs once, preserves data)
    │   └── 003_recovery.sql    Recovery key, security questions, security events
    └── src/
        ├── lib.rs              App state, command registration, print
        ├── db.rs               Connection, WAL, versioned migrations, helpers
        ├── auth.rs             Roles, sessions, sign-in throttling, staff accounts
        ├── recovery.rs         Recovery key, security questions, forgot password, create owner
        ├── templates.rs        Business templates and sample inventory
        ├── inventory.rs        Items, categories, stock movements, payment methods
        ├── sales.rs            Receipts, payments, credit, voids, pickup tracking, customers
        ├── reports.rs          Dashboard, sales report, CSV save, backup
        ├── settings.rs         Validated settings, branding
        └── email.rs            SMTP (Gmail and others), HTML receipt email
```

## Security notes

- Money is stored as integer kobo, so there are no rounding errors.
- Every sale, stock change, void and payment runs in a single SQLite transaction.
- All SQL uses bound parameters. All user text is HTML-escaped before display, and CSV exports neutralise spreadsheet formulas.
- The window runs under a strict Content Security Policy. Fonts are bundled, so nothing loads from the internet.
- SMTP credentials are stored in the local database, readable only through the Owner role in the app. Protect the Windows/macOS user account with a password, use a dedicated sending mailbox, and keep backups somewhere safe, since they contain your data.

## Account recovery (offline)

- At setup the owner picks three security questions and gets a **recovery key** like `K7QM-4XPA-9TRB-2HWN`. Only scrambled (Argon2) copies of the key and answers are stored.
- **Forgot password?** on the sign-in screen resets the password of any account, after the recovery key or all three answers are given. A deactivated account is switched back on.
- **Create a new owner account** on the sign-in screen adds an Owner after the same check, for when no owner can sign in.
- Using the key replaces it with a new one, which is shown once. Answers are not case-sensitive.
- After 5 wrong recovery attempts, recovery is locked for 10 minutes. Every attempt is listed under **Settings → Security & recovery**, where the owner can also create a new key or change the questions (both need the current password).
- For databases upgraded from an earlier version, the owner sees a "Set up account recovery" notice on the Overview page until both are set.
