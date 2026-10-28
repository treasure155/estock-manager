/** The user guide shown on the How to page. Plain HTML, written for shop owners and staff. */

export interface GuideSection { id: string; title: string; who?: string; html: string }

const table = (head: string[], rows: string[][]) =>
  `<div class="table-scroll"><table class="table guide-table"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export const GUIDE: GuideSection[] = [
  {
    id: 'about', title: 'What eStock Manager does',
    html: `<p class="guide-lead">eStock Manager keeps track of your stock, lets you sell at the counter, and gives customers printed or emailed receipts. It works on this computer without internet.</p>
    ${table(['Area', 'What you can do'], [
      ['Selling', 'Tap items or scan barcodes, change quantities (including 2.5 kg), give discounts, add a customer and take payment.'],
      ['Payments', 'Split one sale across cash, transfer, POS and others. The app works out change, and allows credit or part payment from a named customer.'],
      ['Receipts', 'Print on 58 mm or 80 mm thermal paper or on A4, email them, record later payments and void sales with a reason.'],
      ['Pickup orders', 'Collection dates and In progress, Ready and Collected stages for dry cleaning, tailoring and repairs.'],
      ['Inventory', 'Products, services and internal materials, with barcodes, categories, reorder warnings, stock in and out, counts and full history.'],
      ['Customers', 'Contact details, what each customer has bought and what each owes.'],
      ['Reports', 'Sales, profit, money received by method, and best sellers for any period. Export to spreadsheets.'],
      ['Staff', 'Owner, Manager and Cashier accounts, each with its own sign-in and permissions.'],
      ['Your look', 'Your colours, logo, wording, currency and receipt layout.'],
      ['Recovery', 'Forgot password and Create a new owner account, protected by a recovery key and security questions. No internet needed.'],
    ])}
    <h3>Who it is for</h3>
    ${table(['Business', 'Starter type', 'Starting items'], [
      ['Supermarket, provision store, mini mart', 'Supermarket / provision store', '70 groceries, drinks, toiletries and household items'],
      ['Eatery, restaurant, canteen, bukka', 'Eatery / restaurant / canteen', '73 menu items, drinks, packaging and kitchen ingredients'],
      ['Dry cleaner, laundry, tailor, repair shop', 'Dry cleaning / laundry', '62 garment services and cleaning supplies'],
      ['Broiler or poultry farm', 'Broiler / poultry farm', '59 birds, chicken parts, eggs, feed, drugs and farm supplies'],
      ['Crop, fish and livestock farms, market sellers', 'Farm produce / market sales', '68 tubers, grains, vegetables, fruits, fish, livestock and inputs'],
      ['Boutique, pharmacy, phone shop, salon, others', 'Any other business', 'Starts empty: you add your own'],
    ])}
    <p>Starting items come with typical Nigerian prices. Change any name, price or stock count in Inventory, or delete items you do not sell.</p>`,
  },
  {
    id: 'setup', title: 'First-time setup',
    html: `<p class="guide-lead">The first time the app opens it asks three short sets of questions. This is done once per computer.</p>
    <ol>
      <li><b>Your business:</b> type the business name and choose what the business sells. Its starting items are added for you.</li>
      <li><b>Owner account:</b> your full name, a username (letters, numbers, dots, dashes or underscores) and a password of at least 8 characters.</li>
      <li><b>Account recovery:</b> choose three security questions (or write your own) and answer them.</li>
      <li><b>Save your recovery key:</b> the app shows a 16-character key such as <code>K7QM-4XPA-9TRB-2HWN</code>. Print it or write it down, tick the box, then continue.</li>
    </ol>
    <div class="guide-note"><b>Keep the recovery key private.</b> Anyone holding it can reset passwords and create an owner account. Store it away from the shop counter.</div>
    <h3>Before the first sale</h3>
    <ul class="guide-checks">
      <li><b>Settings → Business profile:</b> address, phone, email and logo.</li>
      <li><b>Settings → Receipts &amp; tax:</b> receipt title, footer, paper size and VAT.</li>
      <li><b>Settings → Payment methods:</b> turn off the ones you do not accept, and add OPay, Moniepoint and so on.</li>
      <li><b>Staff:</b> add an account for each manager and cashier.</li>
      <li><b>Inventory:</b> correct the starting prices and stock counts.</li>
    </ul>`,
  },
  {
    id: 'signin', title: 'Signing in, forgot password and new owner',
    html: `<p class="guide-lead">Everyone signs in with their own username and password. If a password is forgotten, the sign-in screen can reset it without internet.</p>
    <h3>Signing in and out</h3>
    <ul>
      <li>Type your username and password and click <b>Sign in</b>. <b>Show</b> reveals the password as you type.</li>
      <li>Sign out with the arrow beside your name at the bottom of the menu.</li>
      <li>After 5 wrong passwords, that username is blocked for 1 minute. After 12 hours without use, the app signs out by itself.</li>
    </ul>
    <h3>Forgot password</h3>
    <ol>
      <li>On the sign-in screen, click <b>Forgot password?</b></li>
      <li>Choose how to prove it is you: the <b>Recovery key</b>, or the answers to your three <b>Security questions</b>.</li>
      <li>Type the username of the account to reset. It can be any account: owner, manager or cashier.</li>
      <li>Choose a new password, type it twice, and click <b>Reset password and sign in</b>.</li>
    </ol>
    <p>If you used the recovery key, the app now shows a <b>new key</b>, because the old one has been used. Save the new key before you continue.</p>
    <h3>Create a new owner account</h3>
    <p>Use this when nobody can sign in as owner, for example when the owner has left or the account is lost.</p>
    <ol>
      <li>Click <b>Create a new owner account</b> on the sign-in screen.</li>
      <li>Prove ownership with the recovery key or the security answers.</li>
      <li>Enter the new owner's full name, username and password, then click <b>Create owner and sign in</b>.</li>
    </ol>
    <div class="guide-note">A cashier cannot use these screens to take over the business, because both need the recovery key or all three security answers. After 5 wrong tries, recovery is locked for 10 minutes, and every attempt is listed under <b>Settings → Security &amp; recovery</b>.</div>
    <h3>Changing the key or questions (Owner)</h3>
    <p>Open <b>Settings → Security &amp; recovery</b>. You can create a new recovery key (the old one stops working at once) or change the security questions. Both need your current password. The same page lists recent recovery activity, including failed attempts.</p>`,
  },
  {
    id: 'staff', title: 'Staff accounts and roles', who: 'Owner',
    html: `<p class="guide-lead">Give every person their own account, so each sale and stock change shows who did it.</p>
    ${table(['What they can do', 'Cashier', 'Manager', 'Owner'], [
      ['Make sales, print and email receipts, add customers', '✓', '✓', '✓'],
      ['Record payments on their own receipts', '✓', '✓', '✓'],
      ['Change prices at the till', 'If allowed', '✓', '✓'],
      ['See all receipts and void receipts', '', '✓', '✓'],
      ['Inventory, cost prices, reports and exports', '', '✓', '✓'],
      ['Staff, settings, email, recovery, backups', '', '', '✓'],
    ])}
    <h3>Adding staff</h3>
    <ol><li>Open <b>Staff</b> and click <b>Add staff</b>.</li><li>Enter their full name and a username, and choose the role.</li><li>Set a password of at least 8 characters and tell them privately.</li></ol>
    <h3>Changes</h3>
    <ul>
      <li><b>Reset a staff password:</b> Staff → Edit → type a new password → Save changes.</li>
      <li><b>Change a role:</b> Staff → Edit → choose the role. They are signed out and must sign in again.</li>
      <li><b>Someone leaves:</b> Staff → Edit → untick <b>Account active</b>. Their sales stay on record.</li>
    </ul>
    <p>Each person changes their own password under <b>Settings → My account</b>.</p>`,
  },
  {
    id: 'sale', title: 'Making a sale',
    html: `<p class="guide-lead">Open <b>New sale</b> from the menu or press <kbd>F2</kbd> anywhere. Items are on the left and the current sale is on the right.</p>
    <figure class="guide-shot"><img src="/guide/new-sale.jpg" alt="The New sale screen with items on the left and the receipt strip on the right"><figcaption>The New sale screen. The sale builds up on the receipt strip on the right.</figcaption></figure>
    <h3>Adding items</h3>
    <ul>
      <li><b>Tap an item</b> to add one. The small number on it shows how many are in the sale.</li>
      <li><b>Scan a barcode.</b> The item is added as soon as the scan finishes (see Barcode scanning).</li>
      <li><b>Search</b> by name or code and press <kbd>Enter</kbd>. If only one item matches, it is added.</li>
      <li>Use the <b>category buttons</b> to show one group, such as Beverages.</li>
    </ul>
    <p>Items running low show their stock in orange. Out-of-stock items are greyed out.</p>
    <h3>Changing the sale</h3>
    <ul>
      <li><b>Quantity:</b> the − and + buttons, or click the number and type, for example 2.5.</li>
      <li><b>Remove:</b> the × beside the line.</li>
      <li><b>Price:</b> click the price on the line (managers and owners, or cashiers if the owner allows it).</li>
      <li><b>Discount:</b> <b>Add discount</b>, then enter an amount or a percentage.</li>
      <li><b>Customer:</b> <b>Add customer</b> to choose or add one. This is needed for credit sales.</li>
      <li><b>Clear sale</b> at the top right starts over.</li>
    </ul>
    <p>The sale is kept if you move to another page. When ready, click <b>Take payment</b> or press <kbd>F9</kbd>.</p>`,
  },
  {
    id: 'barcode', title: 'Barcode scanning',
    html: `<p class="guide-lead">Any USB or Bluetooth barcode scanner that types like a keyboard works. Most do this out of the box, and send Enter after each scan.</p>
    <h3>Selling with a scanner</h3>
    <ol><li>Open <b>New sale</b>. The search box is ready for scanning.</li><li>Scan the product. It is added to the sale straight away.</li><li>Scan again to add another one.</li></ol>
    <h3>Giving products their barcodes</h3>
    <ul>
      <li><b>From Inventory:</b> open the item, click in the <b>Barcode</b> box and scan the product. Save.</li>
      <li><b>From the till (Manager or Owner):</b> scan a product that has no barcode saved yet. The app asks <b>Add it as a new item now?</b> Click it, fill in the name and price (the barcode is already filled in), and save. It is added to the sale at once.</li>
    </ul>
    <div class="guide-note">When adding a new stocked item from the till, enter its <b>opening stock</b>. With zero stock the app will not sell it unless the owner allows selling at zero stock.</div>
    <p>If a cashier scans an unknown code, the app says no item has that code. A manager can then add it.</p>`,
  },
  {
    id: 'payment', title: 'Taking payment',
    html: `<p class="guide-lead">The payment window shows the amount due. The first payment method is already filled in with the full amount.</p>
    <h3>A normal sale</h3>
    <ol><li>Click the method the customer is paying with, for example <b>Bank transfer</b>. The full amount moves to it.</li><li>Optionally type a reference, such as the last digits of the transfer.</li><li>Click <b>Complete sale</b>.</li></ol>
    <h3>Cash and change</h3>
    <ol><li>Choose <b>Cash</b>.</li><li>Click an amount under <b>Cash received</b> (Exact, ₦7,000, ₦10,000…) or type what the customer gave you.</li><li>The app shows <b>Change to give</b>. It also prints on the receipt.</li></ol>
    <h3>Split payment</h3>
    <p>For example, ₦5,000 cash and the rest by transfer: click <b>Cash</b> and type 5000, then click <b>Bank transfer</b>, which fills in what is left. Click <b>Complete sale</b>.</p>
    <h3>Credit and part payment</h3>
    <ul>
      <li>Take less than the total, or remove all payment lines. The app shows <b>Balance owed</b>.</li>
      <li>A sale that is not fully paid needs a named customer.</li>
      <li>Record later payments from the receipt (see Receipts).</li>
    </ul>
    <h3>After the sale</h3>
    <p>Click <b>Print receipt</b> and choose your receipt printer, or type the customer's email and click <b>Send</b>. <b>Start next sale</b> closes the window.</p>`,
  },
  {
    id: 'receipts', title: 'Receipts',
    html: `<p class="guide-lead">The <b>Receipts</b> page lists every sale, newest first. Cashiers see only their own.</p>
    <ul>
      <li><b>Search</b> by receipt number, customer name, phone or email, and filter by payment status, pickup status and dates.</li>
      <li>Click a receipt to open it on the right, where you can <b>Print</b> or <b>Email</b> it again.</li>
    </ul>
    ${table(['Status', 'Meaning'], [['Paid', 'Fully paid.'], ['Part paid', 'Some money received. A balance is owed.'], ['Owing', 'Nothing paid yet.'], ['Void', 'Cancelled. Stock was returned and the sale is left out of reports.']])}
    <h3>Collecting a balance</h3>
    <ol><li>Open the receipt and click <b>Record payment</b>.</li><li>Enter the amount, choose the method and click <b>Save payment</b>.</li></ol>
    <h3>Pickup orders</h3>
    <p>With pickup tracking on (Settings → Selling rules), each receipt has <b>In progress</b>, <b>Ready</b> and <b>Collected</b> buttons. Mark orders Ready when done, and Collected when the customer takes them.</p>
    <h3>Voiding (Manager or Owner)</h3>
    <p>Open the receipt, click <b>Void receipt</b>, type a reason and confirm. Stock goes back and the sale leaves the reports. Receipts are never deleted.</p>`,
  },
  {
    id: 'inventory', title: 'Inventory', who: 'Manager or Owner',
    html: `<p class="guide-lead">The <b>Inventory</b> page holds your items, categories and stock history.</p>
    ${table(['Kind', 'Use it for', 'Sold?', 'Stock counted?'], [
      ['For sale', 'Goods, meals, birds, produce', 'Yes', 'Yes'],
      ['Service', 'Washing a shirt, delivery, dressing a bird', 'Yes', 'No'],
      ['Internal use', 'Feed, detergent, kitchen ingredients, vaccines', 'No', 'Yes'],
    ])}
    <h3>Adding or editing an item</h3>
    <ol>
      <li>Click <b>Add item</b> (or the pencil beside an item to edit it).</li>
      <li>Choose the kind, then enter the name, category and unit (piece, pack, kg, plate, bird, bag…).</li>
      <li>Optionally scan its <b>barcode</b> into the Barcode box.</li>
      <li>Enter the selling price and the cost price. The app shows your margin.</li>
      <li>For a new stocked item, enter the opening stock and a reorder level.</li>
      <li>Click <b>Save</b>, or <b>Save and add another</b>.</li>
    </ol>
    <p><b>Delete</b> removes an item that was never sold. Items that have been sold are archived instead, so old receipts stay correct.</p>
    <h3>Changing stock</h3>
    ${table(['Action', 'When', 'You enter'], [
      ['Receive', 'A delivery arrives or a batch is ready', 'Quantity, and optionally the cost per unit (updates your average cost)'],
      ['Remove', 'Damaged, expired, spoilt, used in the kitchen, mortality', 'Quantity and a reason (required)'],
      ['Count', 'After counting the shelf', 'The exact amount counted'],
    ])}
    <p>Click <b>Stock</b> beside the item. The <b>Stock history</b> tab lists every change with who made it.</p>`,
  },
  {
    id: 'customers', title: 'Customers and money owed',
    html: `<ul>
      <li>Add customers on the <b>Customers</b> page or during a sale. Only a name is required.</li>
      <li>Tick <b>Only those who owe</b> to see debtors and the total owed.</li>
      <li>Click <b>Receipts</b> on a customer's row to see every sale to them and record payments.</li>
      <li>Managers and owners can edit or export the list. A customer who owes money cannot be deleted.</li>
    </ul>`,
  },
  {
    id: 'reports', title: 'Overview and reports',
    html: `<figure class="guide-shot"><img src="/guide/overview.jpg" alt="The Overview page"><figcaption>Overview: today's sales, money received, money owed, low stock and the last 7 days.</figcaption></figure>
    <p><b>Overview</b> opens after sign-in. Cashiers see their own figures only.</p>
    <h3>Reports (Manager or Owner)</h3>
    <p>Choose Today, Yesterday, This week, This month, Last month, Last 90 days, or your own dates. You get sales, gross profit and margin, money received, money still owed, sales by day, money received by method, sales by category and by staff, and every item sold with its profit. <b>Export items</b> saves a spreadsheet file to Downloads.</p>
    <h3>Balancing the till at closing</h3>
    <ol><li>Open Reports and choose <b>Today</b>.</li><li>Compare <b>Money received by method</b> with the cash in the drawer, your bank app and the POS terminal.</li></ol>`,
  },
  {
    id: 'settings', title: 'Making it your own', who: 'Owner',
    html: `<ul>
      <li><b>Business profile:</b> name, address, phone, email, currency symbol and logo.</li>
      <li><b>Receipts &amp; tax:</b> receipt title, number prefix, footer, paper size (58 mm, 80 mm or A4) and VAT, with a live preview.</li>
      <li><b>Selling rules &amp; wording:</b> allow cashiers to change prices, allow selling at zero stock, track pickup orders, and rename Item, Items and Customer to your own words.</li>
      <li><b>Colours &amp; theme:</b> six ready-made colour pairs or your own two colours, plus light or dark mode. Preview before you save.</li>
      <li><b>Payment methods:</b> rename, reorder, turn off, or add OPay, Moniepoint, PalmPay, Cheque and others.</li>
      <li><b>Business type:</b> add another type's categories and starting items at any time. Nothing you have is removed.</li>
      <li><b>Security &amp; recovery:</b> recovery key, security questions and recent security activity.</li>
    </ul>`,
  },
  {
    id: 'email', title: 'Email setup', who: 'Owner',
    html: `<p class="guide-lead">Receipts are sent from your own email account. Set it up in <b>Settings → Email</b>. It needs internet only when sending.</p>
    <h3>Gmail</h3>
    <ol>
      <li>Turn on <b>2-Step Verification</b> in your Google Account.</li>
      <li>Open <b>myaccount.google.com/apppasswords</b>, create one named <code>eStock</code> and copy the 16 letters.</li>
      <li>In Settings → Email, choose <b>Gmail / Google Workspace</b>, enter your Gmail address and paste the 16 letters as the App password.</li>
      <li>Click <b>Save email settings</b>, then <b>Send test</b> to your own address.</li>
    </ol>
    ${table(['Provider', 'Password to use'], [
      ['Outlook / Microsoft 365', 'Mailbox password. Business accounts may need the admin to allow Authenticated SMTP.'],
      ['Yahoo Mail', 'A Yahoo app password'],
      ['Zoho Mail', 'Password or an application-specific password'],
      ['Your domain email', 'Mailbox password. Ask your web host for the server and port.'],
    ])}`,
  },
  {
    id: 'backup', title: 'Backups and your data', who: 'Owner',
    html: `<p class="guide-lead">All records are in one file on this computer. <b>Back up at least once a week.</b></p>
    <ol><li>Open <b>Settings → Backup</b> and click <b>Save a backup to Downloads</b>.</li><li>Copy the file to a flash drive, Google Drive or your email.</li></ol>
    <h3>Restoring</h3>
    <ol>
      <li>Close the app.</li>
      <li>Open the data folder: on Windows <code>%APPDATA%\\online.techalphahub.eaterymanager</code>, on Mac <code>~/Library/Application Support/online.techalphahub.eaterymanager</code>.</li>
      <li>Rename the backup to <code>eatery-manager.sqlite3</code> and use it to replace the file there.</li>
      <li>Open the app.</li>
    </ol>
    <p>A restored backup also brings back the recovery key and security questions that were set when it was made.</p>`,
  },
  {
    id: 'shortcuts', title: 'Shortcuts and tips',
    html: `${table(['Key', 'What it does'], [['<kbd>F2</kbd>', 'Open New sale, or jump to its search box'], ['<kbd>Enter</kbd>', 'Add the scanned or typed item'], ['<kbd>F9</kbd>', 'Take payment'], ['<kbd>Esc</kbd>', 'Close a pop-up window']])}
    <ul>
      <li><b>Supermarket:</b> save every product's barcode once. After that, scanning is the fastest way to sell.</li>
      <li><b>Eatery:</b> record what the kitchen uses each day with Stock → Remove, reason "Used in kitchen".</li>
      <li><b>Dry cleaning:</b> turn on pickup tracking and put the tag number in the receipt note.</li>
      <li><b>Broiler farm:</b> record dead birds with Stock → Remove, reason "Mortality".</li>
      <li><b>Farm produce:</b> sell to regular buyers on credit, and check Customers → Only those who owe each week.</li>
    </ul>`,
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting',
    html: table(['Problem', 'What to do'], [
      ['Forgot my password', 'Click <b>Forgot password?</b> on the sign-in screen, or ask the owner to reset it under Staff.'],
      ['Lost the recovery key', 'Use the security questions instead. Then, once signed in, create a new key under Settings → Security &amp; recovery.'],
      ['"Too many failed attempts"', 'Wait 1 minute (sign-in) or 10 minutes (recovery) and try again.'],
      ['"This account has been deactivated"', 'The owner ticks Account active under Staff → Edit.'],
      ['I cannot see Inventory or Reports', 'Your account is a Cashier. Ask the owner.'],
      ['An item is greyed out at the till', 'It is out of stock. Receive stock in Inventory.'],
      ['The scanner types the code but nothing is added', 'No item has that barcode yet. A manager can add it from the till, or in Inventory.'],
      ['"This sale is not fully paid"', 'Add a customer to the sale, or take the full amount.'],
      ['The receipt prints too wide or small', 'Match the paper size in Settings → Receipts &amp; tax to your roll, and choose the same size in the print dialog with margins set to None.'],
      ['Gmail did not accept the sign-in', 'Use an App Password, not your Gmail password.'],
      ['"Could not reach the server" when emailing', 'Check the internet connection and the server and port in Settings → Email.'],
    ]),
  },
];
