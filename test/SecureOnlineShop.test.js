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
  
  describe("ثبت محصول", function () {
    it("باید یک محصول جدید ثبت کند", async function () {
      await shop.connect(seller).registerProduct(
        "لپ‌تاپ",
        "لپ‌تاپ گیمینگ 16 گیگابایت رم",
        ethers.utils.parseEther("1.5"),
        10
      );
      
      const product = await shop.products(1);
      expect(product.name).to.equal("لپ‌تاپ");
      expect(product.price).to.equal(ethers.utils.parseEther("1.5"));
    });
  });
  
  describe("خرید محصول", function () {
    beforeEach(async function () {
      await shop.connect(seller).registerProduct(
        "موبایل",
        "موبایل هوشمند 128 گیگابایت",
        ethers.utils.parseEther("0.5"),
        5
      );
    });
    
    it("باید امکان خرید محصول را فراهم کند", async function () {
      const productPrice = ethers.utils.parseEther("0.5");
      const quantity = 2;
      const totalPrice = productPrice.mul(quantity);
      
      await shop.connect(buyer).purchaseProduct(1, quantity, {
        value: totalPrice
      });
      
      const order = await shop.orders(1);
      expect(order.totalAmount).to.equal(totalPrice);
      expect(order.status).to.equal(1); // وضعیت Paid
    });
  });
  
  describe("لیست محصولات", function () {
    it("باید لیست محصولات فعال را برگرداند", async function () {
      await shop.connect(seller).registerProduct(
        "تبلت",
        "تبلت 10 اینچی",
        ethers.utils.parseEther("0.3"),
        8
      );
      
      await shop.connect(seller).registerProduct(
        "هدفون",
        "هدفون بی‌سیم",
        ethers.utils.parseEther("0.1"),
        15
      );
      
      const products = await shop.getActiveProducts();
      expect(products.length).to.equal(2);
    });
  });
});
