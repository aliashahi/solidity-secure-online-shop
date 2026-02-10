// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SecureOnlineShop {
    address public admin;
    
    enum OrderStatus { Created, Paid, Shipped, Delivered, Cancelled, Disputed }
    enum DisputeResolution { Pending, BuyerWins, SellerWins }
    
    struct Product {
        uint256 id;
        address seller;
        string name;
        string description;
        uint256 price;
        uint256 stock;
        bool isActive;
    }
    
    struct Order {
        uint256 orderId;
        uint256 productId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalAmount;
        OrderStatus status;
        uint256 createdAt;
        uint256 paidAt;
        uint256 shippedAt;
        uint256 deliveredAt;
        DisputeResolution disputeResolution;
        address disputeResolver;
    }
    
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public buyerOrders;
    mapping(address => uint256[]) public sellerOrders;
    
    uint256 public productCount;
    uint256 public orderCount;
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlySeller(uint256 productId) {
        require(products[productId].seller == msg.sender, "Only seller can modify this product");
        _;
    }
    
    modifier validProduct(uint256 productId) {
        require(productId > 0 && productId <= productCount, "Invalid product ID");
        require(products[productId].isActive, "Product is not active");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    // 1. Register product by seller
    function registerProduct(
        string memory _name,
        string memory _description,
        uint256 _price,
        uint256 _stock
    ) external returns (uint256) {
        require(_price > 0, "Price must be greater than 0");
        require(_stock > 0, "Stock must be greater than 0");
        
        productCount++;
        products[productCount] = Product({
            id: productCount,
            seller: msg.sender,
            name: _name,
            description: _description,
            price: _price,
            stock: _stock,
            isActive: true
        });
        
        return productCount;
    }
    
    // 2. View product list
    function getActiveProducts() external view returns (Product[] memory) {
        uint256 activeCount = 0;
        
        for (uint256 i = 1; i <= productCount; i++) {
            if (products[i].isActive) {
                activeCount++;
            }
        }
        
        Product[] memory activeProducts = new Product[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= productCount; i++) {
            if (products[i].isActive) {
                activeProducts[index] = products[i];
                index++;
            }
        }
        
        return activeProducts;
    }
    
    // 3. Purchase product (Escrow Service method)
    function purchaseProduct(uint256 productId, uint256 quantity) 
        external 
        payable 
        validProduct(productId) 
    {
        Product storage product = products[productId];
        
        require(quantity > 0, "Quantity must be greater than 0");
        require(quantity <= product.stock, "Insufficient stock");
        require(msg.value == product.price * quantity, "Incorrect payment amount");
        
        product.stock -= quantity;
        
        orderCount++;
        orders[orderCount] = Order({
            orderId: orderCount,
            productId: productId,
            buyer: msg.sender,
            seller: product.seller,
            quantity: quantity,
            totalAmount: msg.value,
            status: OrderStatus.Paid,
            createdAt: block.timestamp,
            paidAt: block.timestamp,
            shippedAt: 0,
            deliveredAt: 0,
            disputeResolution: DisputeResolution.Pending,
            disputeResolver: address(0)
        });
        
        buyerOrders[msg.sender].push(orderCount);
        sellerOrders[product.seller].push(orderCount);
    }
    
    // Mark as shipped by seller
    function markAsShipped(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        require(msg.sender == order.seller, "Only seller can mark as shipped");
        require(order.status == OrderStatus.Paid, "Order must be paid first");
        
        order.status = OrderStatus.Shipped;
        order.shippedAt = block.timestamp;
    }
    
    // Confirm delivery by buyer
    function confirmDelivery(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        require(msg.sender == order.buyer, "Only buyer can confirm delivery");
        require(order.status == OrderStatus.Shipped, "Order must be shipped first");
        
        order.status = OrderStatus.Delivered;
        order.deliveredAt = block.timestamp;
        
        payable(order.seller).transfer(order.totalAmount);
    }
    
    // 4. View invoices
    function getBuyerOrders(address buyer) external view returns (Order[] memory) {
        uint256[] memory orderIds = buyerOrders[buyer];
        Order[] memory buyerOrderList = new Order[](orderIds.length);
        
        for (uint256 i = 0; i < orderIds.length; i++) {
            buyerOrderList[i] = orders[orderIds[i]];
        }
        
        return buyerOrderList;
    }
    
    function getAllOrders() external view returns (Order[] memory) {
        Order[] memory allOrders = new Order[](orderCount);
        
        for (uint256 i = 1; i <= orderCount; i++) {
            allOrders[i-1] = orders[i];
        }
        
        return allOrders;
    }
    
    // Dispute resolution system (admin)
    function resolveDispute(uint256 orderId, bool buyerWins) external onlyAdmin {
        Order storage order = orders[orderId];
        
        require(order.status == OrderStatus.Disputed, "Order must be in dispute");
        
        if (buyerWins) {
            order.disputeResolution = DisputeResolution.BuyerWins;
            payable(order.buyer).transfer(order.totalAmount);
        } else {
            order.disputeResolution = DisputeResolution.SellerWins;
            payable(order.seller).transfer(order.totalAmount);
        }
    }
    
    // Cancel order (if not delivered)
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        require(msg.sender == order.buyer, "Only buyer can cancel");
        require(order.status == OrderStatus.Paid, "Only paid orders can be cancelled");
        require(block.timestamp > order.paidAt + 7 days, "Can only cancel after 7 days of no shipment");
        
        order.status = OrderStatus.Cancelled;
        payable(order.buyer).transfer(order.totalAmount);
    }
    
    // Report dispute (for buyer or seller)
    function reportDispute(uint256 orderId) external {
        Order storage order = orders[orderId];
        
        require(msg.sender == order.buyer || msg.sender == order.seller, "Only buyer or seller can report dispute");
        require(order.status == OrderStatus.Paid || order.status == OrderStatus.Shipped, "Order must be paid or shipped");
        
        order.status = OrderStatus.Disputed;
    }
    
    // Update product (seller only)
    function updateProduct(
        uint256 productId,
        string memory _name,
        string memory _description,
        uint256 _price,
        uint256 _stock
    ) external onlySeller(productId) {
        require(_price > 0, "Price must be greater than 0");
        require(_stock >= 0, "Stock cannot be negative");
        
        Product storage product = products[productId];
        product.name = _name;
        product.description = _description;
        product.price = _price;
        product.stock = _stock;
    }
    
    // Deactivate product (seller only)
    function deactivateProduct(uint256 productId) external onlySeller(productId) {
        products[productId].isActive = false;
    }
    
    // Get product details
    function getProduct(uint256 productId) external view returns (Product memory) {
        require(productId > 0 && productId <= productCount, "Invalid product ID");
        return products[productId];
    }
    
    // Get order details
    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orderId > 0 && orderId <= orderCount, "Invalid order ID");
        return orders[orderId];
    }
    
    // Check if user has any orders
    function hasOrders(address user) external view returns (bool) {
        return buyerOrders[user].length > 0;
    }
    
    // Get total sales for seller
    function getSellerSales(address seller) external view returns (uint256) {
        uint256 totalSales = 0;
        
        for (uint256 i = 1; i <= orderCount; i++) {
            if (orders[i].seller == seller && orders[i].status == OrderStatus.Delivered) {
                totalSales += orders[i].totalAmount;
            }
        }
        
        return totalSales;
    }
    
    // Emergency withdrawal (admin only - for stuck funds)
    function emergencyWithdraw() external onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(admin).transfer(balance);
    }
    
    // Transfer admin role
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }
    
    // Contract balance (for testing)
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}