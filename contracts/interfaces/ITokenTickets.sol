// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface ITokenTickets {
    function mintTokensToUser(address _userAddress, uint256 _tokensQuantity) external;
    function burnTokensFromUser(address _userAddress, uint256 _tokensQuantity) external;
    function authorizeAddress(address _address) external;
    function unauthorizeAddress(address _address) external;
}