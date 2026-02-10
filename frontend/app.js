class SecureOnlineShopApp {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.userAddress = null;
        this.contractAddress = null;
        this.contractABI = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadContract();
        this.checkWalletConnection();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });
        
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        
        document.getElementById('registerProductForm').addEventListener('submit', (e) => this.registerProduct(e));
        
        document.querySelector('.btn-search').addEventListener('click', () => this.searchProducts());
        document.getElementById('searchProduct').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchProducts();
        });
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterOrders(e));
        });
        
        document.getElementById('viewAllOrders').addEventListener('click', () => this.viewAllOrders());
        document.getElementById('viewDisputes').addEventListener('click', () => this.viewDisputes());
        
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9d6bb65d-d76f-4d4a-91bb-07d2d0c1b4f4', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runId: 'multi-account-debug-1',
                hypothesisId: 'H3',
                location: 'frontend/app.js:setupEventListeners',
                message: 'admin handlers setup',
                data: {
                    viewAllOrdersType: typeof this.viewAllOrders,
                    viewDisputesType: typeof this.viewDisputes
                },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion

        const confirmBtn = document.getElementById('confirmPurchase');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                const productId = parseInt(confirmBtn.dataset.productId || '0', 10);
                const quantityInput = document.getElementById('purchaseQuantity');
                const quantity = quantityInput ? parseInt(quantityInput.value || '1', 10) : 1;

                if (!productId || quantity <= 0) {
                    this.showNotification('Please enter a valid quantity', 'error');
                    return;
                }

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/6378f3b2-3085-499c-8ba9-fef6d1382474', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        runId: 'pre-fix-1',
                        hypothesisId: 'H2',
                        location: 'frontend/app.js:confirmPurchaseHandler',
                        message: 'confirmPurchase clicked',
                        data: { productId, quantity },
                        timestamp: Date.now()
                    })
                }).catch(() => {});
                // #endregion

                this.purchaseProduct(productId, quantity);
            });
        }
    }
    
    async loadContract() {
        try {
            const response = await fetch('contracts/contract-address.json');
            const addressData = await response.json();
            this.contractAddress = addressData.SecureOnlineShop;
            
            const abiResponse = await fetch('contracts/SecureOnlineShop.json');
            const contractData = await abiResponse.json();
            this.contractABI = contractData.abi;
            
            console.log('Contract loaded successfully');
        } catch (error) {
            console.error('Error loading contract:', error);
            this.showNotification('Failed to load contract', 'error');
        }
    }
    
    async connectWallet() {
        try {
            this.showLoading();
            
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                this.userAddress = accounts[0];
                this.web3 = new Web3(window.ethereum);
                
                this.contract = new this.web3.eth.Contract(
                    this.contractABI,
                    this.contractAddress
                );

                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/9d6bb65d-d76f-4d4a-91bb-07d2d0c1b4f4', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        runId: 'multi-account-debug-1',
                        hypothesisId: 'H1',
                        location: 'frontend/app.js:connectWallet',
                        message: 'wallet connected',
                        data: { userAddress: this.userAddress },
                        timestamp: Date.now()
                    })
                }).catch(() => {});
                // #endregion
                
                this.updateWalletInfo();
                await this.loadProducts();
                await this.loadUserOrders();
                
                this.showNotification('Wallet connected successfully', 'success');
                
                window.ethereum.on('accountsChanged', (accounts) => {
                    this.userAddress = accounts[0];

                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/9d6bb65d-d76f-4d4a-91bb-07d2d0c1b4f4', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            runId: 'multi-account-debug-1',
                            hypothesisId: 'H1',
                            location: 'frontend/app.js:accountsChanged',
                            message: 'accountsChanged fired',
                            data: { userAddress: this.userAddress, accountsLength: accounts.length },
                            timestamp: Date.now()
                        })
                    }).catch(() => {});
                    // #endregion

                    this.updateWalletInfo();
                    this.loadProducts();
                    this.loadUserOrders();
                });
                
            } else {
                this.showNotification('Please install MetaMask', 'error');
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            this.showNotification('Failed to connect wallet', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    updateWalletInfo() {
        const addressElement = document.getElementById('accountAddress');
        const connectBtn = document.getElementById('connectWallet');
        
        if (this.userAddress) {
            const shortAddress = `${this.userAddress.substring(0, 6)}...${this.userAddress.substring(38)}`;
            addressElement.textContent = shortAddress;
            addressElement.title = this.userAddress;
            connectBtn.innerHTML = '<i class="fas fa-check"></i> Connected';
            connectBtn.classList.add('connected');
            
            this.getBalance();
        }
    }
    
    async getBalance() {
        if (!this.web3 || !this.userAddress) return;
        
        try {
            const balance = await this.web3.eth.getBalance(this.userAddress);
            const ethBalance = this.web3.utils.fromWei(balance, 'ether');
            document.getElementById('balance').textContent = `Balance: ${parseFloat(ethBalance).toFixed(4)} ETH`;
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    }
    
    async loadProducts() {
        if (!this.contract) return;
        
        try {
            this.showLoading();
            
            const products = await this.contract.methods.getActiveProducts().call();
            this.displayProducts(products);
            
            if (this.userAddress) {
                await this.updateSellerStats();
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            this.showNotification('Failed to fetch products', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    displayProducts(products) {
        const container = document.getElementById('productsList');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-data">No products have been added yet.</div>';
            return;
        }
        
        container.innerHTML = products.map((product, index) => `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc">${product.description}</p>
                    <div class="product-meta">
                        <span class="product-price">${this.web3.utils.fromWei(product.price, 'ether')} ETH</span>
                        <span class="product-stock">Stock: ${product.stock}</span>
                    </div>
                    <div class="product-actions">
                        <button class="btn-buy" onclick="app.showBuyModal(${product.id})">
                            <i class="fas fa-shopping-cart"></i> Buy
                        </button>
                        <button class="btn-view" onclick="app.viewProductDetails(${product.id})">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    async registerProduct(e) {
        e.preventDefault();
        
        if (!this.contract || !this.userAddress) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            const name = document.getElementById('productName').value;
            const description = document.getElementById('productDescription').value;
            const price = document.getElementById('productPrice').value;
            const stock = document.getElementById('productStock').value;
            
            const priceInWei = this.web3.utils.toWei(price, 'ether');
            
            const receipt = await this.contract.methods.registerProduct(
                name,
                description,
                priceInWei,
                stock
            ).send({
                from: this.userAddress,
                gas: 3000000
            });
            
            e.target.reset();
            
            await this.loadProducts();
            
            this.showNotification('Product registered successfully', 'success');
            
        } catch (error) {
            console.error('Error registering product:', error);
            this.showNotification('Failed to register product', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async showBuyModal(productId) {
        if (!this.userAddress) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        await this.viewProductDetails(productId);
    }

    async viewProductDetails(productId) {
        if (!this.contract) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6378f3b2-3085-499c-8ba9-fef6d1382474', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                runId: 'pre-fix-1',
                hypothesisId: 'H1',
                location: 'frontend/app.js:viewProductDetails',
                message: 'viewProductDetails called',
                data: { productId },
                timestamp: Date.now()
            })
        }).catch(() => {});
        // #endregion

        try {
            this.showLoading();

            const product = await this.contract.methods.products(productId).call();
            const modal = document.getElementById('productModal');
            const modalBody = document.getElementById('modalBody');
            const confirmBtn = document.getElementById('confirmPurchase');

            if (!modal || !modalBody || !confirmBtn) {
                this.showNotification('Failed to load product details', 'error');
                return;
            }

            modalBody.innerHTML = `
                <div class="modal-product-details">
                    <h4>${product.name}</h4>
                    <p>${product.description}</p>
                    <p>Unit price: ${this.web3.utils.fromWei(product.price, 'ether')} ETH</p>
                    <p>Stock: ${product.stock}</p>
                    <div class="form-group">
                        <label for="purchaseQuantity">Quantity</label>
                        <input type="number" id="purchaseQuantity" min="1" max="${product.stock}" value="1" />
                    </div>
                </div>
            `;

            confirmBtn.dataset.productId = productId;

            modal.style.display = 'block';
        } catch (error) {
            console.error('Error showing product details:', error);
            this.showNotification('Failed to load product details', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async purchaseProduct(productId, quantity) {
        try {
            this.showLoading();
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6378f3b2-3085-499c-8ba9-fef6d1382474', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: 'pre-fix-1',
                    hypothesisId: 'H3',
                    location: 'frontend/app.js:purchaseProduct',
                    message: 'purchaseProduct called',
                    data: { productId, quantity },
                    timestamp: Date.now()
                })
            }).catch(() => {});
            // #endregion

            const product = await this.contract.methods.products(productId).call();
            const totalPrice = this.web3.utils.toBN(product.price).mul(this.web3.utils.toBN(quantity));
            
            const receipt = await this.contract.methods.purchaseProduct(
                productId,
                quantity
            ).send({
                from: this.userAddress,
                value: totalPrice.toString(),
                gas: 3000000
            });
            
            this.closeModal();
            await this.loadProducts();
            await this.loadUserOrders();
            
            this.showNotification('Purchase completed successfully', 'success');
            
        } catch (error) {
            console.error('Error purchasing product:', error);
            this.showNotification('Failed to purchase product', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadUserOrders() {
        if (!this.contract || !this.userAddress) return;
        
        try {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/9d6bb65d-d76f-4d4a-91bb-07d2d0c1b4f4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: 'multi-account-debug-1',
                    hypothesisId: 'H2',
                    location: 'frontend/app.js:loadUserOrders',
                    message: 'loadUserOrders called',
                    data: { userAddress: this.userAddress },
                    timestamp: Date.now()
                })
            }).catch(() => {});
            // #endregion

            const orders = await this.contract.methods.getBuyerOrders(this.userAddress).call();

            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/9d6bb65d-d76f-4d4a-91bb-07d2d0c1b4f4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    runId: 'multi-account-debug-1',
                    hypothesisId: 'H2',
                    location: 'frontend/app.js:loadUserOrders',
                    message: 'orders fetched',
                    data: {
                        userAddress: this.userAddress,
                        orderCount: orders.length,
                        buyersSample: orders.slice(0, 3).map(o => o.buyer)
                    },
                    timestamp: Date.now()
                })
            }).catch(() => {});
            // #endregion

            this.displayOrders(orders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }
    
    displayOrders(orders) {
        const container = document.getElementById('ordersList');
        
        if (!orders || orders.length === 0) {
            container.innerHTML = '<div class="no-data">You do not have any orders yet.</div>';
            return;
        }
        
        container.innerHTML = orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">Order #${order.orderId}</span>
                    <span class="order-status status-${this.getStatusText(order.status).toLowerCase()}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                <div class="order-details">
                    <div class="detail-item">
                        <span class="detail-label">Product ID:</span>
                        <span class="detail-value">${order.productId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Quantity:</span>
                        <span class="detail-value">${order.quantity}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total amount:</span>
                        <span class="detail-value">${this.web3.utils.fromWei(order.totalAmount, 'ether')} ETH</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Created at:</span>
                        <span class="detail-value">${new Date(order.createdAt * 1000).toLocaleString('en-US')}</span>
                    </div>
                </div>
                <div class="order-actions">
                    ${order.status == 1 ? `
                        <button class="btn-buy" onclick="app.cancelOrder(${order.orderId})">
                            Cancel order
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }
    
    getStatusText(statusCode) {
        const statusMap = {
            0: 'Created',
            1: 'Paid',
            2: 'Shipped',
            3: 'Delivered',
            4: 'Canceled',
            5: 'Disputed'
        };
        return statusMap[statusCode] || 'Unknown';
    }

    async cancelOrder(orderId) {
        if (!this.contract || !this.userAddress) {
            this.showNotification('Please connect your wallet first', 'error');
            return;
        }

        try {
            this.showLoading();

            await this.contract.methods.cancelOrder(orderId).send({
                from: this.userAddress,
                gas: 300000
            });

            await this.loadUserOrders();
            this.showNotification('Order canceled successfully', 'success');
        } catch (error) {
            console.error('Error cancelling order:', error);
            this.showNotification('Failed to cancel order', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    async updateSellerStats() {
        if (!this.contract || !this.userAddress) return;
        
        try {
            const products = await this.contract.methods.getActiveProducts().call();
            const myProducts = products.filter(p => p.seller.toLowerCase() === this.userAddress.toLowerCase());
            
            document.getElementById('myProductsCount').textContent = myProducts.length;
            
            this.displaySellerProducts(myProducts);
            
        } catch (error) {
            console.error('Error updating seller stats:', error);
        }
    }
    
    displaySellerProducts(products) {
        const container = document.getElementById('sellerProducts');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="no-data">You have not registered any products yet.</div>';
            return;
        }
        
        container.innerHTML = `
            <h3>Your products</h3>
            <div class="products-grid">
                ${products.map(product => `
                    <div class="product-card">
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <p>${this.web3.utils.fromWei(product.price, 'ether')} ETH</p>
                            <p>Stock: ${product.stock}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    switchTab(e) {
        const tabId = e.currentTarget.dataset.tab;
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to the selected tab
        e.currentTarget.classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        switch(tabId) {
            case 'products':
                this.loadProducts();
                break;
            case 'orders':
                this.loadUserOrders();
                break;
            case 'seller':
                this.updateSellerStats();
                break;
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    
    closeModal() {
        document.getElementById('productModal').style.display = 'none';
    }
    
    checkWalletConnection() {
        if (window.ethereum && window.ethereum.selectedAddress) {
            this.connectWallet();
        }
    }
}

let app;
window.addEventListener('load', () => {
    app = new SecureOnlineShopApp();
});

window.app = {
    showBuyModal: (productId) => app.showBuyModal(productId),
    viewProductDetails: (productId) => app.viewProductDetails(productId),
    cancelOrder: (orderId) => app.cancelOrder(orderId)
};
