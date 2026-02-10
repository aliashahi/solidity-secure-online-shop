const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SecureOnlineShop Contract", function () {
  let shop;
  let owner, seller, buyer, admin;
  
  beforeEach(async function () {
    [owner, seller, buyer, admin] = await ethers.getSigners();
    
    const SecureOnlineShop = await ethers.getContractFactory("SecureOnlineShop");
    shop = await SecureOnlineShop.deploy();
    await shop.deployed();
  });
  
  describe("Product registration", function () {
    it("should register a new product", async function () {
      await shop.connect(seller).registerProduct(
        "Laptop",
        "Gaming laptop with 16GB RAM",
        ethers.utils.parseEther("1.5"),
        10
      );
      
      const product = await shop.products(1);
      expect(product.name).to.equal("Laptop");
      expect(product.price).to.equal(ethers.utils.parseEther("1.5"));
    });
  });
  
  describe("Product purchase", function () {
    beforeEach(async function () {
      await shop.connect(seller).registerProduct(
        "Mobile phone",
        "Smartphone with 128GB storage",
        ethers.utils.parseEther("0.5"),
        5
      );
    });
    
    it("should allow purchasing a product", async function () {
      const productPrice = ethers.utils.parseEther("0.5");
      const quantity = 2;
      const totalPrice = productPrice.mul(quantity);
      
      await shop.connect(buyer).purchaseProduct(1, quantity, {
        value: totalPrice
      });
      
      const order = await shop.orders(1);
      expect(order.totalAmount).to.equal(totalPrice);
      expect(order.status).to.equal(1); // Paid status
    });
  });
  
  describe("Products list", function () {
    it("should return the list of active products", async function () {
      await shop.connect(seller).registerProduct(
        "Tablet",
        "10-inch tablet",
        ethers.utils.parseEther("0.3"),
        8
      );
      
      await shop.connect(seller).registerProduct(
        "Headphones",
        "Wireless headphones",
        ethers.utils.parseEther("0.1"),
        15
      );
      
      const products = await shop.getActiveProducts();
      expect(products.length).to.equal(2);
    });
  });
});
