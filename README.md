# Eventora – Blockchain-Based Event Ticket Management System

Eventora is a blockchain-based event ticket management platform that allows organizers to create and manage events while enabling users to browse events, purchase tickets, and access their digital tickets.

The system uses smart contracts to manage ticket transactions transparently and securely, reducing the risk of duplicate tickets and unauthorized modifications.

## Features

- **Event Management:** Organizers can create, edit, and cancel events.
- **Ticket Booking:** Users can browse available events and purchase tickets.
- **Blockchain Integration:** Smart contracts manage event and ticket transactions.
- **QR Code Tickets:** Generates unique QR codes for booked tickets.
- **Ticket Download:** Users can download their tickets in PDF format.
- **Ticket Verification:** Ticket details can be verified through the smart contract.
- **User Profile:** Users can save their name and email address.
- **Fund Withdrawal:** Organizers can withdraw funds collected from ticket bookings.

## Technologies Used

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| CSS | User interface styling |
| Solidity | Smart contract development |
| Hardhat | Blockchain development and testing |
| Ethers.js | Blockchain interaction |
| MetaMask | Wallet connection |
| JavaScript | Application logic |
| LocalStorage | Local profile data storage |

## Project Structure

```text
Event-Ticket-Management/
│
├── contracts/
│   └── EventTicketManagement.sol
│
├── frontend/
│   ├── src/
│   │   ├── blockchain/
│   │   │   └── contract.json
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
│
├── hardhat.config.js
├── package.json
└── README.md
```

## Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd Event-Ticket-Management
```

### 2. Install Dependencies

Install the root project dependencies:

```bash
npm install
```

Navigate to the frontend folder:

```bash
cd frontend
npm install
```

### 3. Start the Local Blockchain

Open a terminal in the root project folder and run:

```bash
npx hardhat node
```

Keep this terminal running.

### 4. Deploy the Smart Contract

Open another terminal in the root folder and deploy the contract using your configured Hardhat deployment script.

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Update the deployed contract address in the frontend and ensure the ABI in `frontend/src/blockchain/contract.json` matches the newly compiled contract.

### 5. Connect MetaMask

Configure MetaMask with the local Hardhat network:

- Network Name: Hardhat Local
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency Symbol: ETH

Import a Hardhat development account into MetaMask for testing.

**Use only local development accounts. Never use real wallet private keys for this project.**

### 6. Run the Frontend

Navigate to the frontend folder:

```bash
cd frontend
npm run dev
```

Open the local URL displayed in the terminal to access Eventora.

## How It Works

1. The organizer connects their MetaMask wallet.
2. The organizer creates an event by entering its details.
3. Users connect their wallets and browse available events.
4. Users purchase tickets through blockchain transactions.
5. The smart contract records ticket ownership.
6. Users can view their tickets, generate QR codes, and download PDF tickets.
7. Organizers can manage events and withdraw collected funds.

## Future Enhancements

- QR code scanning using a camera for automated entry verification.
- Email notifications and booking confirmations.
- Database integration for persistent user profiles.
- Deployment on a public blockchain network.
- Advanced analytics for event organizers.

## Conclusion

Eventora demonstrates how blockchain technology and smart contracts can be used to simplify event ticket management. It provides a transparent way to create events, purchase tickets, manage bookings, and verify ticket ownership. The project combines frontend development with blockchain integration to provide a practical decentralized application.

---

**Project:** Eventora – Blockchain-Based Event Ticket Management System  
**Developed using:** React.js, Solidity, Hardhat, Ethers.js and MetaMask
