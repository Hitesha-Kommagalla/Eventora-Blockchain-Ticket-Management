
 // SPDX-License-Identifier: MIT
 pragma solidity ^0.8.24;

 contract EventTicketManagement {
     struct Event {
         uint256 id;
         string name;
         string venue;
         uint256 eventDate;
         uint256 ticketPrice;
         uint256 totalTickets;
         uint256 ticketsSold;
         address organizer;
         bool active;
     }

     struct Ticket {
         uint256 eventId;
         address owner;
         bool used;
     }

     uint256 public eventCount;
     uint256 public ticketCount;

     mapping(uint256 => Event) public events;
     mapping(uint256 => Ticket) public tickets;
     mapping(address => uint256[]) private ownedTickets;
     mapping(address => uint256) public pendingWithdrawals;

     event EventCreated(
         uint256 indexed eventId,
         string name,
         address indexed organizer
     );

     event TicketPurchased(
         uint256 indexed ticketId,
         uint256 indexed eventId,
         address indexed buyer
     );

     event TicketUsed(uint256 indexed ticketId);

     constructor() {}

     function createEvent(
         string calldata _name,
         string calldata _venue,
         uint256 _eventDate,
         uint256 _ticketPrice,
         uint256 _totalTickets
     ) external {
         require(bytes(_name).length > 0, "Event name required");
         require(bytes(_venue).length > 0, "Venue required");
         require(_eventDate > block.timestamp, "Date must be in future");
         require(_totalTickets > 0, "Tickets must be greater than zero");

         eventCount++;

         events[eventCount] = Event({
             id: eventCount,
             name: _name,
             venue: _venue,
             eventDate: _eventDate,
             ticketPrice: _ticketPrice,
             totalTickets: _totalTickets,
             ticketsSold: 0,
             organizer: msg.sender,
             active: true
         });

         emit EventCreated(eventCount, _name, msg.sender);
     }

     function getEvent(uint256 _eventId)
         external
         view
         returns (Event memory)
     {
         require(_eventId > 0 && _eventId <= eventCount, "Event not found");
         return events[_eventId];
     }

     function buyTicket(uint256 _eventId) external payable {
         require(_eventId > 0 && _eventId <= eventCount, "Event not found");

         Event storage e = events[_eventId];

         require(e.active, "Event is inactive");
         require(e.ticketsSold < e.totalTickets, "Sold out");
         require(msg.value == e.ticketPrice, "Incorrect ticket payment");
         require(block.timestamp < e.eventDate, "Event has started");

         ticketCount++;
         e.ticketsSold++;
         pendingWithdrawals[e.organizer] += msg.value;

         tickets[ticketCount] = Ticket({
             eventId: _eventId,
             owner: msg.sender,
             used: false
         });

         ownedTickets[msg.sender].push(ticketCount);

         emit TicketPurchased(ticketCount, _eventId, msg.sender);
     }

     function getMyTickets()
         external
         view
         returns (uint256[] memory)
     {
         return ownedTickets[msg.sender];
     }

     function verifyTicket(uint256 _ticketId)
         external
         view
         returns (
             bool valid,
             address ticketOwner,
             uint256 eventId,
             bool used
         )
     {
         Ticket memory t = tickets[_ticketId];

         if (t.owner == address(0)) {
             return (false, address(0), 0, false);
         }

         Event memory e = events[t.eventId];

         return (
             t.owner != address(0) && e.active && !t.used,
             t.owner,
             t.eventId,
             t.used
         );
     }

     function useTicket(uint256 _ticketId) external {
         Ticket storage t = tickets[_ticketId];

         require(t.owner != address(0), "Ticket does not exist");
         require(!t.used, "Ticket already used");

         Event storage e = events[t.eventId];

         require(msg.sender == e.organizer, "Only organizer can verify");
         require(e.active, "Event is inactive");

         t.used = true;

         emit TicketUsed(_ticketId);
     }


function updateEvent(
    uint256 _eventId,
    string memory _name,
    string memory _venue,
    uint256 _eventDate,
    uint256 _ticketPrice,
    uint256 _totalTickets
) external {
    Event storage existingEvent = events[_eventId];

    require(existingEvent.id != 0, "Event does not exist");
    require(existingEvent.organizer == msg.sender, "Only organizer can edit");
    require(existingEvent.active, "Event is cancelled");
    require(_eventDate > block.timestamp, "Event date must be in future");
    require(_ticketPrice > 0, "Ticket price must be greater than zero");
    require(
        _totalTickets >= existingEvent.ticketsSold,
        "Cannot reduce below tickets sold"
    );

    existingEvent.name = _name;
    existingEvent.venue = _venue;
    existingEvent.eventDate = _eventDate;
    existingEvent.ticketPrice = _ticketPrice;
    existingEvent.totalTickets = _totalTickets;
}

     function cancelEvent(uint256 _eventId) external {
         require(_eventId > 0 && _eventId <= eventCount, "Event not found");

         Event storage e = events[_eventId];

         require(msg.sender == e.organizer, "Only organizer can cancel");
         require(e.active, "Event already inactive");

         e.active = false;
     }

    function withdrawFunds() external {
    uint256 amount = pendingWithdrawals[msg.sender];
    require(amount > 0, "No funds available");

    pendingWithdrawals[msg.sender] = 0;

    (bool success, ) = payable(msg.sender).call{value: amount}("");
    require(success, "Withdrawal failed");
}
 }
