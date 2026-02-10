async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contract with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  const SecureOnlineShop = await ethers.getContractFactory("SecureOnlineShop");
  const shop = await SecureOnlineShop.deploy();
  
  await shop.deployed();
  
  console.log("SecureOnlineShop contract deployed at address:", shop.address);
  
  // Save contract address and ABI for frontend
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
  
  console.log("✅ Contract address saved to frontend/contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment error:", error);
    process.exit(1);
  });
