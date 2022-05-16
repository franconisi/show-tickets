// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

/// @title Token Admin who can mint and burn other's tokens
contract TokenTickets is ERC20PresetMinterPauser, Ownable {
    bytes32 constant MinterBurnerRole = keccak256("MinterBurnerRole");

    constructor() ERC20PresetMinterPauser("ShowTickets", "SHT") {
        // Grant role MinterBurnerRole and mint 100 tokens to owner
        grantRole(MinterBurnerRole, _msgSender());
        mint(_msgSender(), tokensToBigNumber(100));
    }

    /// @notice Mint tokens to user
    /// @param _userAddress user's address you want to mint tokens for
    /// @param _tokensQuantity how many tokens should be minted
    function mintTokensToUser(address _userAddress, uint256 _tokensQuantity) external {
        // only MinterBurner role allowed
        require(hasRole(MinterBurnerRole, _msgSender()), "User without permission");
        // requirement to avoid minting 0 tokens
        require(_tokensQuantity > 0, "Should mint at least 1 token");
        // minting function from ERC20 OpenZeppelin implementation
        mint(_userAddress, tokensToBigNumber(_tokensQuantity));
        // using internal approval to let the contract burn user tokens
        _approve(_userAddress, _msgSender(), tokensToBigNumber(_tokensQuantity));
    }

    /// @notice Burn tokens from user
    /// @param _userAddress user's address you want to burn tokens from
    /// @param _tokensQuantity how many tokens should be burned
    function burnTokensFromUser(address _userAddress, uint256 _tokensQuantity) external {
        // only MinterBurner role allowed
        require(hasRole(MinterBurnerRole, _msgSender()), "User without permission");
        // requirement to avoid burning 0 tickets
        require(_tokensQuantity > 0, "Should burn at least 1 ticket");
        // burnFrom function from ERC20Burnable OpenZeppelin implementation
        burnFrom(_userAddress, _tokensQuantity);
    }

    /// @notice Give minter and burner roles to address
    /// @param _address user's address you want to give role
    function authorizeAddress(address _address) external onlyOwner {
        grantRole(MinterBurnerRole, _address);
    }

    /// @notice Revoke minter and burner roles to address
    /// @param _address user's address you want to revoke role
    function unauthorizeAddress(address _address) external onlyOwner {
        revokeRole(MinterBurnerRole, _address);
    }

    function mint(address _to, uint256 _amount) public override {
        require(hasRole(MinterBurnerRole, _msgSender()), "User without permission");
        _mint(_to, _amount);
    }

    function burnFrom(address _from, uint256 _amount) public override {
        require(hasRole(MinterBurnerRole, _msgSender()), "User without permission");
        _burn(_from, tokensToBigNumber(_amount));
    }

    /// @notice Transform integer tokens to big number
    /// @param _tokensQuantity how many tokens you want to transform
    function tokensToBigNumber(uint256 _tokensQuantity) pure private returns(uint256){
        return _tokensQuantity * 10**18;
    }
}