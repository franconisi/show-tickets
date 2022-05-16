// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/ITokenTickets.sol";
import "hardhat/console.sol";


/// @title Core of show operations (new show, new tickets)
contract TicketsCore is Ownable {
    struct Show {
        string name;
        uint256 startDate;
        uint256 duration;
    }

    struct Ticket {
        uint256 ticketsQuantity;
        bool emitted;
        bool accessed;
    }

    event NewShowCreated(
        uint256 id,
        string name,
        uint256 startDate,
        uint256 duration
    );

    event TicketSold(
        uint256 showId,
        uint256 ticketsQuantity,
        address ticketOwner
    );

    event TicketConsumed(
        uint256 showId,
        uint256 ticketsQuantity
    );

    address tokenAddress;
    uint256 public ticketPrice;
    Show[] shows;

    mapping(address => mapping(uint256 => Ticket)) ownerToShowIdAndTickets;

    constructor(address _tokenContractAddress) {
        ticketPrice = 1 ether;
        tokenAddress = _tokenContractAddress;
    }

    modifier showExists(uint _showId) {
        require(_showId < shows.length, "Show does not exists");
        _;
    }

    /// @notice Change price of tickets
    function changeTicketPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "The new price should be positive");
        // change ticketPrice to _newPrice received, available only for the owner
        ticketPrice = _newPrice;
    }

    /// @notice Withdraw contract funds to owner
    function withdrawFunds() external onlyOwner returns(bool success) {
        (success, ) = msg.sender.call{value: address(this).balance}("");
    }

    /// @notice Get tickets to a show
    /// @param _showId show's id you want to buy tickets for
    function buyTickets(uint256 _showId)
        external 
        payable 
        showExists(_showId)
        returns (uint, bool) 
    {
        // sended value should be equal or higher than ticketPrice
        require(
            msg.value >= ticketPrice,
            "Insufficient value to buy tickets"
        );
        // the time now should be lower than show's startDate
        require(
            block.timestamp < shows[_showId].startDate,
            "Show already started, buy tickets is not allowed"
        );
        uint256 etherSent = msg.value;
        // get the change if leftover
        uint256 etherChange = etherSent % ticketPrice;
        // get how many tickets can be bought
        uint256 ticketsToMint = (etherSent - etherChange) / ticketPrice;
        // give tokens to ticket owner
        ITokenTickets tokenContract = ITokenTickets(tokenAddress);
        tokenContract.mintTokensToUser(msg.sender, ticketsToMint);
        // map owner to show and tickets bought
        ownerToShowIdAndTickets[msg.sender][_showId] = Ticket(ticketsToMint, true, false);
        // return the funds if needed
        bool sent = true;
        if (etherChange > 0) {
            (sent, ) = msg.sender.call{value: etherChange}("");
        }
        // Verify that contract sent back the change
        assert(sent);
        // Emit ticket sold event with showId, tickets sold and the owner
        emit TicketSold(_showId, ticketsToMint, msg.sender);
        return (ticketsToMint, sent);
    }

    /// @notice Consume a ticket to show
    /// @param _showId show's id you want to consume tickets for
    function consumeTicket(uint256 _showId) external {
        // Verify that ticket is valid
        require(
            ownerToShowIdAndTickets[msg.sender][_showId].emitted,
            "You do not have tickets for this show"
        );
        // Verify that ticket is not used
        require(
            !ownerToShowIdAndTickets[msg.sender][_showId].accessed,
            "The tickets are already accessed"
        );
        // Consume ticket setting accessed as true
        ownerToShowIdAndTickets[msg.sender][_showId].accessed = true;
        // Get how many tickets the user owns
        uint256 ticketsQuantity = ownerToShowIdAndTickets[msg.sender][_showId].ticketsQuantity;
        // Burn tokens from contract
        ITokenTickets tokenContract = ITokenTickets(tokenAddress);
        tokenContract.burnTokensFromUser(
            msg.sender,
            ticketsQuantity
        );
        // Emit event of ticket consumed
        emit TicketConsumed(_showId, ticketsQuantity);
    }

    /// @notice Create a new Show.
    /// @param _name the name of the new Show.
    /// @param _startDate the date of when the show will start.
    /// @param _duration the duration of the show.
    /// @dev Validates the params and then created the new show emitting an event.
    function createShow(
        string memory _name,
        uint256 _startDate,
        uint256 _duration
    ) external onlyOwner {
        // Validating parameters
        require(bytes(_name).length > 0, "Show name is required");
        require(_startDate > block.timestamp, "Invalid show start date");
        require(_duration > 0, "Invalid show duration");
        // Create a new show and emit the event newShowCreated with the Show data.
        shows.push(Show(_name, _startDate, _duration));
        // Emit event of new show created
        emit NewShowCreated(shows.length - 1, _name, _startDate, _duration);
    }

    /// @notice Retrieves a show by its ID.
    /// @param _showId Id of the requested show.
    /// @return uint256 id, string name, uint256 startDate, uint256 duration.
    function getShow(uint256 _showId)
        external
        view
        showExists(_showId)
        returns (
            uint256,
            string memory,
            uint256,
            uint256
        )
    {
        // _showId should be at least 1 less than the shows lenght.
        Show memory reqShow = shows[_showId];
        return (
            _showId,
            reqShow.name,
            reqShow.startDate,
            reqShow.duration
        );
    }

}