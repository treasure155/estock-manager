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
      ['Cartons and wholesale', 'Sell single pieces or whole cartons of the same item, with a cheaper wholesale price from a set quantity.'],
      ['Returns and refunds', 'Take back part of a sale, put the goods back on the shelf and pay back the right amount.'],
      ['Shifts and cash-up', 'Open a shift with the cash in the drawer, close it with a count and see if anything is short.'],
      ['Purchases and suppliers', 'Record deliveries, what you still owe each supplier, and keep cost prices correct.'],
      ['Expenses and net profit', 'Record diesel, salaries and other costs; reports show profit after expenses.'],
      ['Expiry dates', 'Record batches with expiry dates, sell the oldest first, and get warned before stock expires.'],
      ['Recipes', 'Selling a meal takes its ingredients out of kitchen stock and shows its true cost.'],
      ['Broiler flocks', 'Track each batch of birds: deaths, feed, weights, FCR, costs and profit.'],
      ['WhatsApp and statements', 'Send receipts and customer statements of account on WhatsApp, or print them.'],
      ['Held sales and labels', 'Park a sale and serve the next customer; print shelf labels with barcodes.'],
      ['Backups and updates', 'Automatic daily backups and safe updates from your provider.'],
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
    id: 'licence', title: 'Free trial and licence', who: 'Owner',
    html: `<p class="guide-lead">Every new computer gets a <b>14-day free trial</b> with all features. To keep using eStock Manager after that, each computer needs its own licence key.</p>
    <ol>
      <li>Open <b>Settings → Licence</b> (or click <b>Activate</b> in the blue strip at the top).</li>
      <li>Copy the <b>Install ID</b>, for example <code>G147-RQYW-Y4VJ-4EQK</code>, and send it to your eStock Manager provider.</li>
      <li>The provider sends back a licence key starting with <code>ESTK-</code>. Paste it into the box and click <b>Activate</b>.</li>
    </ol>
    <p>A key only works on the computer whose Install ID it was made for. A second shop computer needs its own key. If the trial or a dated licence ends, the app shows the activation screen; your sales, stock and customers are kept safe and come back as soon as you activate.</p>
    <p class="guide-note">Setting the computer clock backwards does not extend the trial, and reinstalling the app does not restart it.</p>`,
  },
  {
    id: 'packs', title: 'Cartons, packs and wholesale prices', who: 'Manager or Owner',
    html: `<p class="guide-lead">One item can be sold as a single piece or as a whole carton, and big buyers can get a wholesale price automatically.</p>
    <ol>
      <li>In <b>Inventory</b>, edit the item and open <b>Cartons, packs and wholesale prices</b>.</li>
      <li>Fill in the pack name (carton, crate, bag), how many single units are in one pack, and the pack price.</li>
      <li>For wholesale, enter the wholesale price per unit and the quantity from which it applies, for example ₦280 from 10 pieces.</li>
    </ol>
    <p>At the till, the item's tile shows a small <b>+ carton</b> button. Tap the tile for one piece, or the button for one carton. On the ticket, tap the unit (for example <b>pack ⇄</b>) to switch a line between pieces and cartons. Stock is always counted in single units, so selling one carton of 40 takes 40 pieces off.</p>
    <p>When a line reaches the wholesale quantity, the price changes by itself and the line is marked <b>Wholesale</b>.</p>`,
  },
  {
    id: 'held', title: 'Holding a sale', 
    html: `<p class="guide-lead">Park a sale to serve someone else, then bring it back later. Useful for a table at an eatery, or a customer who went to get more money.</p>
    <ol><li>On the ticket, click <b>Hold this sale</b> and give it a name, such as "Table 4" or "Mrs Bello".</li>
    <li>To continue it, click <b>Held sales</b> at the top of New sale and choose it.</li></ol>
    <p>Stock is only taken when the held sale is finally completed. Held sales can be seen by every cashier on this computer.</p>`,
  },
  {
    id: 'shifts', title: 'Shifts and cash-up',
    html: `<p class="guide-lead">A shift tells you whether the cash in the drawer is right at the end of the day.</p>
    <ol>
      <li><b>Open a shift:</b> New sale → <b>Open shift</b>, or the <b>Shifts &amp; cash-up</b> page. Count the change (float) already in the drawer and enter it.</li>
      <li>Sell as usual. Cash refunds and cash expenses paid during the shift are counted automatically.</li>
      <li><b>Close the shift:</b> Shifts &amp; cash-up → <b>Close shift &amp; count cash</b>. Count all the cash in the drawer and enter it. The app shows <b>Balanced</b>, <b>Short</b> or <b>Over</b>.</li>
      <li>A shift report (Z report) opens. Print it and keep it with the cash.</li>
    </ol>
    ${table(['Expected cash is', ''], [['Opening float', '+'], ['Cash taken in sales and old balances', '+'], ['Cash refunds given', '−'], ['Cash expenses paid', '−']])}
    <p>Managers see every cashier's shifts on the same page, with shortages in red. The owner can make shifts compulsory in <b>Settings → Selling rules &amp; wording → Cashiers must open a shift before selling</b>.</p>`,
  },
  {
    id: 'returns', title: 'Returns and refunds', who: 'Manager or Owner',
    html: `<p class="guide-lead">Take back some or all of the items on a receipt, without cancelling the whole sale.</p>
    <ol>
      <li>Open the receipt in <b>Receipts</b> and click <b>Return items</b>.</li>
      <li>Enter how many of each item came back, choose how the refund is paid, and give a reason.</li>
      <li>Leave <b>Put the goods back in stock</b> ticked if they can be sold again. Untick it for spoilt or damaged goods.</li>
    </ol>
    <p>If the customer still owed money on the receipt, the returned value comes off what they owe first. Only money they had already paid beyond the new total is refunded. The app tells you the exact amount to pay back.</p>
    <p><b>Void</b> is still there for a sale entered by mistake, but once anything on a receipt has been returned, use Return for the rest.</p>`,
  },
  {
    id: 'whatsapp', title: 'WhatsApp receipts and statements',
    html: `<p class="guide-lead">Send a receipt or a statement of account straight to a customer's WhatsApp.</p>
    <ul>
      <li>After a sale, click <b>Send on WhatsApp</b>. On an old receipt, click <b>WhatsApp</b>.</li>
      <li>In <b>Customers</b>, click <b>Statement</b>, choose the dates, then <b>WhatsApp</b> or <b>Print</b>. The statement lists sales, payments, returns and the balance due.</li>
    </ul>
    <p>WhatsApp (or WhatsApp Web) opens with the message ready; you press Send. If the customer has a phone number saved, their chat opens directly. Numbers like 0803 123 4567 are changed to +234 803 123 4567 automatically; change the country code in Settings → Selling rules &amp; wording.</p>`,
  },
  {
    id: 'purchases', title: 'Purchases and suppliers', who: 'Manager or Owner',
    html: `<p class="guide-lead">Record goods received from suppliers. Stock goes up, cost prices stay correct and you can see what you still owe.</p>
    <ol>
      <li>Open <b>Purchases</b> and click <b>Receive goods</b>.</li>
      <li>Type the supplier's name (new suppliers are saved for you) and the invoice or waybill number.</li>
      <li>Add each item with its quantity and cost. Items with cartons can be received by the carton. Items that track expiry ask for a batch number and expiry date.</li>
      <li>Enter how much you paid now. Anything less than the total is recorded as owed to the supplier.</li>
    </ol>
    <p>To pay a supplier later, open the purchase and use <b>Record payment</b>. The <b>Suppliers</b> tab shows what you have bought from each one and what you owe.</p>
    <p class="guide-note">The cost price becomes the average of old and new stock, so profit in reports stays right when buying prices change.</p>`,
  },
  {
    id: 'expenses', title: 'Expenses and net profit', who: 'Manager or Owner',
    html: `<p class="guide-lead">Record what the business spends to see your real profit.</p>
    <ol><li>Open <b>Expenses</b> and click <b>Record expense</b>.</li><li>Enter the date, amount and category (diesel, salaries, rent…), and who it was paid to.</li></ol>
    <p>Reports show <b>Gross profit</b> (sales minus the cost of goods sold) and <b>Net profit</b> (gross profit minus expenses). Cash expenses paid during a shift are taken off the cash expected in the drawer.</p>`,
  },
  {
    id: 'expiry', title: 'Expiry dates and batches', who: 'Manager or Owner',
    html: `<p class="guide-lead">For milk, drugs, vaccines, frozen food and anything else that expires.</p>
    <ol>
      <li>Edit the item and tick <b>Track expiry dates</b>.</li>
      <li>When stock arrives (Stock → Receive, or Purchases), enter the batch number and expiry date.</li>
      <li>Sales take from the batch that expires first.</li>
    </ol>
    <p>The Overview warns you about batches expiring within 30 days (change the number in Settings → Selling rules &amp; wording). <b>Inventory → Expiry dates</b> lists every batch; expired batches have a <b>Remove from stock</b> button.</p>`,
  },
  {
    id: 'recipes', title: 'Recipes for meals', who: 'Manager or Owner',
    html: `<p class="guide-lead">Link a meal to the ingredients it uses, so kitchen stock goes down with every plate sold.</p>
    <ol>
      <li>Turn on <b>Recipes</b> in Settings → Selling rules &amp; wording (it is on already for eateries).</li>
      <li>In Inventory, click <b>Recipe</b> next to a meal and add each ingredient with the quantity used for one plate, for example 0.35 kg of chicken.</li>
      <li>Untick <b>Track stock</b> on meals cooked to order, so only the ingredients are counted.</li>
    </ol>
    <p>The meal's cost becomes the cost of its ingredients, so reports show the profit per plate. A meal is never refused because an ingredient count is behind; the count simply goes below zero until you receive stock.</p>`,
  },
  {
    id: 'flocks', title: 'Broiler flocks', who: 'Farm staff, Manager or Owner',
    html: `<p class="guide-lead">Follow each batch of birds from day-old chicks to sale.</p>
    <ol>
      <li>Turn on <b>Broiler flock tracking</b> in Settings → Selling rules &amp; wording (on already for broiler farms).</li>
      <li>On the <b>Flocks</b> page click <b>New flock</b>: code, date placed, number of chicks and what they cost.</li>
      <li>Every day, open the flock and add a <b>Daily record</b>: deaths, culls, feed given and, when you weigh a sample, the average weight.</li>
      <li>Add <b>costs</b> (feed, vaccines, labour). Choose a stock item to take it out of inventory at the same time.</li>
      <li>Record <b>Birds sold</b> with the number, total live weight and amount received.</li>
    </ol>
    ${table(['Figure', 'What it means'], [['Mortality', 'Dead birds as a share of chicks placed. Watch for anything above 5%.'], ['FCR', 'Feed used ÷ live weight produced. Lower is better; about 1.6 to 1.9 at 5 to 6 weeks is good.'], ['Cost per bird', 'All costs ÷ birds sold and still alive'], ['Profit', 'Money from birds sold minus chick cost and all other costs']])}
    <p>Close the flock when the last birds are sold.</p>`,
  },
  {
    id: 'labels', title: 'Printing barcode labels', who: 'Manager or Owner',
    html: `<p class="guide-lead">Print price labels with barcodes for shelves and for items that came without one.</p>
    <ol><li>Inventory → <b>Print labels</b>.</li><li>Enter how many labels you need for each item.</li><li>Choose A4 sheets (24 labels, the common 63.5 × 33.9 mm label paper) or a label printer roll (50 × 30 mm), then print.</li></ol>
    <p>Items without a barcode get a shop code starting with 20, and it is saved to the item, so scanning the label at the till adds that item.</p>`,
  },
  {
    id: 'updates', title: 'Updates', who: 'Owner',
    html: `<p class="guide-lead">When your provider releases a new version, a strip appears at the top for owners and managers.</p>
    <ol><li>Click <b>See update</b>, or open <b>Settings → Updates</b>.</li><li>Click <b>Download and install</b>. The app restarts by itself.</li></ol>
    <p>Your data stays in place. Only updates signed by your provider are accepted.</p>`,
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
    html: `<p class="guide-lead">All records are in one file on this computer. eStock Manager now copies it <b>automatically once a day</b>.</p>
    <ul>
      <li>Backups go to <b>Documents → eStock Backups</b>. The newest 14 are kept.</li>
      <li>In <b>Settings → Backup</b> you can choose another folder (a flash drive, or a Google Drive or OneDrive folder on this computer so copies leave the machine), change how many to keep, or click <b>Back up now</b>.</li>
      <li>If an automatic backup fails, Settings → Backup says why.</li>
    </ul>
    <h3>Restoring</h3>
    <ol>
      <li>Close the app.</li>
      <li>Open the data folder: on Windows <code>%APPDATA%\\online.techalphahub.eaterymanager</code>, on Mac <code>~/Library/Application Support/online.techalphahub.eaterymanager</code>.</li>
      <li>Rename the backup to <code>eatery-manager.sqlite3</code> and use it to replace the file there.</li>
      <li>Open the app.</li>
    </ol>
    <p>A restored backup also brings back the recovery key and security questions that were set when it was made. The licence is tied to the computer, not the backup.</p>`,
  },
  {
    id: 'shortcuts', title: 'Shortcuts and tips',
    html: `${table(['Key', 'What it does'], [['<kbd>F2</kbd>', 'Open New sale, or jump to its search box'], ['<kbd>Enter</kbd>', 'Add the scanned or typed item'], ['<kbd>F9</kbd>', 'Take payment'], ['<kbd>Esc</kbd>', 'Close a pop-up window']])}
    <ul>
      <li><b>Supermarket:</b> save every product's barcode once (or print labels for those without one). Set carton prices for items you sell in bulk.</li>
      <li><b>Eatery:</b> give meals a recipe so ingredients come out of stock as you sell; hold a table's order with Hold this sale.</li>
      <li><b>Dry cleaning:</b> turn on pickup tracking and put the tag number in the receipt note.</li>
      <li><b>Broiler farm:</b> keep a daily record on the Flocks page; it works out mortality, FCR and profit for you.</li>
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
      ['"Open your shift before selling"', 'Click Open shift on New sale and count the float. The owner can switch this rule off.'],
      ['The activation screen appeared', 'The trial or licence has ended. Send the Install ID shown to your provider and enter the key they send. Nothing has been deleted.'],
      ['"This licence key was made for a different computer"', 'Each computer needs its own key. Send this computer\'s Install ID to your provider.'],
      ['WhatsApp did not open', 'Install WhatsApp Desktop, or sign in to web.whatsapp.com in your browser, and try again.'],
      ['A cashier cannot return items', 'Returns need a Manager or the Owner.'],
    ]),
  },
];
