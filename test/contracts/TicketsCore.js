const { expect } = require("chai");
const { deployments } = require('hardhat');
const { increaseTime, createNewShow, etherToWei } = require("../utils/utils");

describe("Tickets core contract", () => {

    const TOKEN_CONTRACT = "TokenTickets";
    const CORE_CONTRACT = "TicketsCore";
    let TokenTickets, TicketsCore, tokenContract, coreContract;
    let owner;

    const showId = 0;

    beforeEach(async () => {
        // Hardhat-deploy fixtures
        await deployments.fixture([CORE_CONTRACT, TOKEN_CONTRACT]);
        // Get the contract and Signers here
        TicketsCore = await deployments.get(CORE_CONTRACT);
        TokenTickets = await deployments.get(TOKEN_CONTRACT);
        [owner, buyer] = await ethers.getSigners();
        // Deploy the contract and generate contract's instance
        coreContract = await ethers.getContractAt(CORE_CONTRACT, TicketsCore.address);
        tokenContract = await ethers.getContractAt(TOKEN_CONTRACT, TokenTickets.address);
        // Grant minter and burner role to core contract in token contract
        await tokenContract.authorizeAddress(TicketsCore.address);
        // Create a show
        await createNewShow(coreContract);
    });

    describe("Deployment", () => {
        it("Should verify that core contract's owner is setted correctly", async () => {
            expect(
                await coreContract.owner()
            ).to.equal(owner.address);
        });

        it("Should verify that ticket price is 1 ether", async () => {
            expect(
                await coreContract.ticketPrice()
            ).to.equal(etherToWei("1"));
        });
    });

    describe("Creating shows", () => {
        it("Should create a new show correctly", async () => {
            const newShowDate = new Date(2022, 06, 01).getTime() / 1000;
            await expect(
                coreContract.createShow(
                    "New show",
                    newShowDate,
                    60
                )
            ).to.emit(
                coreContract, "NewShowCreated"
            ).withArgs(
                1, "New show", newShowDate, 60
            );

            // Verify the show
            const [show_id, show_name, show_start, show_duration] = await coreContract.getShow(1);
            expect(show_id).to.equal(1);
            expect(show_name).to.equal("New show");
            expect(show_start).to.equal(newShowDate);
            expect(show_duration).to.equal(60);
        });

        it("Should revert trying to create show without name", async () => {
            await expect(
                coreContract.createShow(
                    "", // empty name
                    new Date(2022, 06, 01).getTime() / 1000,
                    60
                )
            ).to.be.revertedWith("Show name is required");
        });

        it("Should revert trying to create a show with old date", async () => {
            await expect(
                coreContract.createShow(
                    "New show",
                    new Date(2020, 06, 01).getTime() / 1000, // date in the past
                    60
                )
            ).to.be.revertedWith("Invalid show start date");
        });

        it("Should revert trying to create show not being owner", async () => {
            await expect(
                coreContract.connect(buyer).createShow( // connected as buyer
                    "New show",
                    new Date(2022, 06, 01).getTime() / 1000,
                    60
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Changing price", () => {
        it("Should revert trying to change price not being owner", async () => {
            await expect(
                coreContract.connect(buyer).changeTicketPrice(etherToWei("0.1"))
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should change price correctly", async () => {
            // Change price to 0.1 ether
            await coreContract.changeTicketPrice(etherToWei("0.1"));
            // Verify that price changed to 0.1 ether
            expect(
                await coreContract.ticketPrice()
            ).to.equal(etherToWei("0.1"));
        });
    });

    describe("Get tickets", () => {
        it("Should buy 2 tickets correctly", async () => {
            // Send ether for buy the tickets and 0.2 to be returned
            const etherForTwoTickets = etherToWei('2.2');
            // Get actual balance before buy
            const beforeBalance = await buyer.getBalance();
            // Call buyTickets to show id 0 and expect the event
            // with 0 as show id, 2 tickets and the tickets owner
            const tx = await coreContract.connect(buyer).buyTickets(showId, { value: etherForTwoTickets });
            await expect(
                tx
            ).to.emit(
                coreContract, "TicketSold"
            ).withArgs(
                showId, 2, buyer.address
            );

            // Check gas consumed
            const waited_tx = await tx.wait();
            const gasConsumed = waited_tx.gasUsed.mul(waited_tx.effectiveGasPrice);

            // Verify that contract balance is 2 (should have returned a change of 0.2)
            expect(
                await coreContract.provider.getBalance(coreContract.address)
            ).to.equal(etherToWei('2'));

            // Verify that the buyer account got back his 0.2 ether
            expect(
                await buyer.getBalance()
            ).to.equal(
                beforeBalance.sub(etherForTwoTickets).sub(gasConsumed).add(etherToWei("0.2"))
            );
        });

        it("Should revert trying to buy tickets for inexistent show", async () => {
            await expect(
                coreContract.connect(buyer).buyTickets(1, { value: etherToWei('1') })
            ).to.be.revertedWith("Show does not exist");
        });

        it("Should revert trying to buy tickets without funds", async () => {
            const insufficientEther = etherToWei('0.5');
            await expect(
                coreContract.buyTickets(showId, {value: insufficientEther})
            ).to.be.revertedWith("Insufficient value to buy tickets");
        });

        it("Should revert trying to buy with show started", async () => {
            const someEther = etherToWei('1.5');
            // Increase the time by 3 month
            await increaseTime(60 * 60 * 24 * 30 * 3);
            await expect(
                coreContract.buyTickets(showId, {value: someEther})
            ).to.be.revertedWith("Show already started, buy tickets is not allowed");
        });
    });

    describe("Consume tickets", () => {
        it("Should consume the ticket correctly", async () => {
            const etherForATicket = etherToWei('1');
            // Buy tickets for show id 0
            await coreContract.connect(buyer).buyTickets(
                showId, {value: etherForATicket}
            );

            // Consume the ticket and expect event with args show id 0 and 1 ticket
            await expect(
                coreContract.connect(buyer).consumeTicket(showId)
            ).to.emit(
                coreContract, "TicketConsumed"
            ).withArgs(
                showId, 1
            );

            // Verify that user token balance is 0 (ticket burned)
            expect(
                await tokenContract.balanceOf(buyer.address)
            ).to.equal(0);
        });

        it("Should revert after trying to consume tickets twice", async () => {
            const etherForATicket = etherToWei('1');
            await coreContract.connect(buyer).buyTickets(
                showId, {value: etherForATicket}
            );
            await coreContract.connect(buyer).consumeTicket(showId);
            // Try to consume the same ticket again and should revert
            await expect(
                coreContract.connect(buyer).consumeTicket(showId)
            ).to.be.revertedWith("The tickets are already accessed");
        });

        it("Should revert trying to consume tickets for a show that do not bought", async () => {
            // Try to consume a fake ticket for a fake show id 3
            await expect(
                coreContract.connect(buyer).consumeTicket(3)
            ).to.be.revertedWith("You do not have tickets for this show");
        });

    });
});