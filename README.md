## Secure Online Shop (Blockchain Project)

Decentralized e‑commerce demo built on Ethereum using Solidity, Hardhat, Web3.js, and MetaMask. Buyers can purchase products with ETH, sellers manage products and shipments, and an admin can resolve disputes.

### Tech Stack

- **Smart contracts**: Solidity, Hardhat
- **Frontend**: Vanilla JS, Web3.js, Font Awesome
- **Wallet**: MetaMask (or any injected `window.ethereum` provider)

### Project Structure

- `contracts/SecureOnlineShop.sol` – main marketplace contract (products, orders, disputes)
- `scripts/deploy.js` – deploys the contract and writes ABI/address to `frontend/contracts/`
- `frontend/index.html` – single‑page app UI
- `frontend/app.js` – dApp logic (wallet, products, orders, seller/admin views)
- `frontend/style.css` – black & red theme styling

### Prerequisites

- Node.js (LTS)
- MetaMask browser extension

### Install Dependencies

```bash
npm install
```

### Start Local Blockchain & Deploy

In the project root:

```bash
# 1) Start local Hardhat node
npx hardhat node

# 2) In another terminal, deploy the contract to localhost
npx hardhat run scripts/deploy.js --network localhost
```

Deployment writes:

- `frontend/contracts/contract-address.json`
- `frontend/contracts/SecureOnlineShop.json`

### Run the Frontend

From the project root:

```bash
cd frontend
npx http-server -p 8085
```

Then open `http://localhost:8085/` in your browser.

### Configure MetaMask

1. Add a custom network pointing to `http://127.0.0.1:8545`.
2. Import one or more private keys from the Hardhat node output.
3. Use different accounts for:
   - **Admin** – the account that deployed the contract.
   - **Seller(s)** – accounts that register products.
   - **Buyer(s)** – accounts that purchase products.

### Using the DApp

- **Connect Wallet**  
  Click **Connect Wallet** in the header and select an account in MetaMask.

- **Products tab**
  - Browse available products.
  - Click **Buy** to purchase a product (opens a modal where you choose quantity).

- **Add Product tab**
  - As a seller, register a new product (name, description, price in ETH, stock).

- **My Orders tab**
  - Shows orders **for the currently connected account** (buyer view).
  - Filter by status: All / Paid / Shipped / Delivered.

- **Seller Dashboard**
  - Must connect with an account that registered products.
  - **My products**: number of products created by this account.
  - **Pending orders**: count of `Paid` orders for your products.
  - **Total revenue**: ETH received from `Delivered` orders.
  - Orders for your products are listed; for `Paid` orders you can click **Mark as shipped** (calls `markAsShipped`).

- **Admin Panel**
  - Must connect with the **deployer/admin** account.
  - **View all orders**: lists all orders in the system.
  - **View disputes**: lists orders in `Disputed` status.  
    For each disputed order:
    - **Buyer wins** – refunds buyer (calls `resolveDispute(orderId, true)`).
    - **Seller wins** – pays seller (calls `resolveDispute(orderId, false)`).

### Typical Flow

1. Admin deploys contract (becomes `admin` in the contract).
2. Seller account connects and **Adds Product**.
3. Buyer account connects and **Buys** the product.
4. Seller opens **Seller Dashboard** and clicks **Mark as shipped**.
5. Buyer confirms delivery (once implemented in the UI) and funds are released to the seller.
6. If there is a problem, buyer or seller can put the order into dispute (via contract), and admin resolves it in **Admin Panel**.

### Notes

- All blockchain state (products, orders, balances) lives in the Solidity contract; the frontend only reads and sends transactions via Web3.js.
- For testing with multiple roles, keep at least three MetaMask accounts imported from Hardhat and switch accounts as needed before opening each tab.

