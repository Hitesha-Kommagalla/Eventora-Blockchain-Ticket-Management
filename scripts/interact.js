
const hre = require("hardhat");

async function main() {
  const [organizer, buyer] = await hre.ethers.getSigners();

  // Replace this with the address printed during deployment.
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const EventTicketManagement = await hre.ethers.getContractFactory(
    "EventTicketManagement"
  );

  const contract = EventTicketManagement.attach(contractAddress);

  // Create an event scheduled one day in the future.
  const eventDate = Math.floor(Date.now() / 1000) + 86400;
  const ticketPrice = hre.ethers.parseEther("0.01");

  const tx = await contract.connect(organizer).createEvent(
    "College Tech Fest",
    "VESIT Auditorium",
    eventDate,
    ticketPrice,
    100
  );

  await tx.wait();

  console.log("Event created successfully!");

  // Buy a ticket using a second test account.
  const buyTx = await contract.connect(buyer).buyTicket(1, {
    value: ticketPrice,
  });

  await buyTx.wait();

  console.log("Ticket purchased successfully!");

const event = await contract.getFunction("getEvent")(1);
  console.log("Event name:", event.name);
  console.log("Tickets sold:", event.ticketsSold.toString());

  const myTickets = await contract.connect(buyer).getMyTickets();
  console.log("Buyer ticket IDs:", myTickets.map((id) => id.toString()));

  const verification = await contract.verifyTicket(1);
  console.log("Ticket valid:", verification.valid);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
