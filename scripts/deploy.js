
const hre = require("hardhat");

async function main() {
  const EventTicketManagement = await hre.ethers.getContractFactory(
    "EventTicketManagement"
  );

  const eventTicketManagement = await EventTicketManagement.deploy();

  await eventTicketManagement.waitForDeployment();

  const address = await eventTicketManagement.getAddress();

  console.log("EventTicketManagement deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
