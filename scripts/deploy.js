async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("استقرار قرارداد با حساب:", deployer.address);
  console.log("موجودی حساب:", (await deployer.getBalance()).toString());
  
  const SecureOnlineShop = await ethers.getContractFactory("SecureOnlineShop");
  const shop = await SecureOnlineShop.deploy();
  
  await shop.deployed();
  
  console.log("قرارداد فروشگاه آنلاین امن در آدرس:", shop.address);
  
  // ذخیره آدرس قرارداد
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }
  
  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ SecureOnlineShop: shop.address }, null, 2)
  );
  
  const artifact = await artifacts.readArtifact("SecureOnlineShop");
  
  fs.writeFileSync(
    contractsDir + "/SecureOnlineShop.json",
    JSON.stringify(artifact, null, 2)
  );
  
  console.log("✅ آدرس قرارداد در frontend/contracts ذخیره شد");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ خطا در استقرار:", error);
    process.exit(1);
  });
