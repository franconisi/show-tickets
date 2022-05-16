const { expect } = require("chai");
const { deployments } = require('hardhat');
const { etherToWei, stringToHash } = require("../utils/utils");

describe("Token tickets contract", () => {

    const TOKEN_CONTRACT = "TokenTickets";
    let TokenTickets, tokenContract, owner;

    beforeEach(async () => {
        // Hardhat-deploy fixtures
        await deployments.fixture([TOKEN_CONTRACT]);
        // Get the contract and signers here.
        TokenTickets = await deployments.get(TOKEN_CONTRACT);
        [owner, anotherAccount, secondAccount] = await ethers.getSigners();
        // Deploy the contract and generate contract's instance
        tokenContract = await ethers.getContractAt(TOKEN_CONTRACT, TokenTickets.address);
    });

    describe("Deployment", () => {
        it("Should set the right owner", async () => {
            // Verify that contract owner is the same as the signer
            expect(
                await tokenContract.owner()
            ).to.equal(owner.address);
        });

        it("Should check owner's balance to be 100 SHT", async () => {
            // Verify that contract owner's balance is 100 SHT
            expect(
                await tokenContract.balanceOf(owner.address)
            ).to.equal(etherToWei('100'));
        });

        it("Should verify that owner has minter and burner role", async () => {
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), owner.address)
            ).to.be.true;
        });

        it("Should verify that anotherAccount does not have minter and burner role", async () => {
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), anotherAccount.address)
            ).to.be.false;
        });
    });

    describe("Permissions", () => {
        it("Should verify that owner can grant role to anotherAccount", async () => {
            await tokenContract.authorizeAddress(anotherAccount.address);
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), anotherAccount.address)
            ).to.be.true;
        });

        it("Should verify that owner can revoke role from anotherAccount", async () => {
            await tokenContract.authorizeAddress(anotherAccount.address);
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), anotherAccount.address)
            ).to.be.true;
            // Unauthorize anotherAccount
            await tokenContract.unauthorizeAddress(anotherAccount.address);
            // Verify that anotherAccount does not have minter and burner role
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), anotherAccount.address)
            ).to.be.false;
        });

        it("Should revert trying to authorize address without being owner", async () => {
            await expect(
                tokenContract.connect(anotherAccount).authorizeAddress(secondAccount.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
            // Verify that secondAccount does not have minter and burner role
            expect(
                await tokenContract.hasRole(stringToHash("MinterBurnerRole"), secondAccount.address)
            ).to.be.false;
        });

        it("Should revert trying to burn tokens from user without permission", async () => {
            // Mint 3 tokens to anotherAccount
            await tokenContract.mintTokensToUser(anotherAccount.address, 3);
            await expect(
                tokenContract.connect(secondAccount).burnFrom(anotherAccount.address, etherToWei('1'))
            ).to.be.revertedWith("User without permission");
            // Verify that the balance has not changed
            expect(
                await tokenContract.balanceOf(anotherAccount.address)
            ).to.equal(etherToWei('3'));
        });
    });

    describe("Create & burn tokens to user (not owner)", () => {
        beforeEach(async () => {
            // Minting 3 tokens to account 'anotherAccount'
            await tokenContract.mintTokensToUser(anotherAccount.address, 3);
        });

        it("Should check that anotherAccount has 3 tokens", async () => {
            // Verify that anotherAccount has 3 tokens
            expect(
                await tokenContract.balanceOf(anotherAccount.address)
            ).to.equal(etherToWei('3'));
        });

        it("Should burn 1 ticket from another account", async () => {
            // Burn 1 ticket from 'anotherAccount'
            await tokenContract.burnTokensFromUser(anotherAccount.address, 1);
            // Verify that anotherAccount's balance is now 2
            expect(
                await tokenContract.balanceOf(anotherAccount.address)
            ).to.equal(etherToWei('2'));
        });

        it("Should transfer 1 ticket from one account to another", async () => {
            // Verify that the secondAccount balance is 0
            expect(
                await tokenContract.balanceOf(secondAccount.address)
            ).to.equal(0);
            // Transfer 2 tokens from owner to secondAccount
            await tokenContract.transfer(
                secondAccount.address, etherToWei('2')
            );
            // Verify both balances, secondAccount should be 2 and owner 98
            expect(
                await tokenContract.balanceOf(owner.address)
            ).to.equal(etherToWei('98'));
            expect(
                await tokenContract.balanceOf(secondAccount.address)
            ).to.equal(etherToWei('2'));
        });

        it("Should revert trying to mint tokens without role", async () => {
            // Connect with anotherAccount and try to mint 1 token to secondAccount
            await expect(
                tokenContract.connect(anotherAccount).mintTokensToUser(
                    secondAccount.address, 1
                )
            ).to.be.revertedWith("User without permission");
        });

        it("Should revert trying to burn tokens without role", async () => {
            // Connect with secondAccount and try to burn 1 token from anotherAccount
            await expect(
                tokenContract.connect(secondAccount).burnTokensFromUser(
                    anotherAccount.address, 1
                )
            ).to.be.revertedWith("User without permission");
        });
    });
});