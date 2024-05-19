const { expect } = require("chai");
// const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");

let owner, lender, borrower, borrower2, feeReceiver, nft, storeFront, rentToken;

const REWARD_FEE = 9;

const NFT_ID = 1;
const NFT_URI = "TEST_URI";

const PRICE = ethers.utils.parseEther("0.23");

const DAY_IN_SEC = 86400;
const CHAIN_NAME = "CHAIN_1";

const ZERO_ADDRESS = ethers.constants.AddressZero;

before(async () => {
    [owner, lender, borrower, borrower2, feeReceiver] =
        await ethers.getSigners();

    const Gateway = await ethers.getContractFactory("TestGateway");
    const gateway = await Gateway.deploy();

    const Gasreceiver = await ethers.getContractFactory("TestGasreceiver");
    const gasreceiver = await Gasreceiver.deploy();

    const NFT = await ethers.getContractFactory("ERC721Demo");
    nft = await NFT.deploy("JayPigsTestNft", "JP-MORGAN", NFT_URI);

    await nft.connect(lender).safeMint();

    const StoreFront = await ethers.getContractFactory("JayPigsUpgradeable");
    storeFront = await upgrades.deployProxy(
        StoreFront,
        [
            CHAIN_NAME,
            gateway.address,
            gasreceiver.address,
            feeReceiver.address,
            REWARD_FEE,
        ],
        {
            kind: "uups",
        }
    );

    const ERC4907 = await ethers.getContractFactory("ERC4907");

    rentToken = await ERC4907.deploy("JayPigsTestNftCopy", "JP-MORGAN-COPY");

    await rentToken.transferOwnership(storeFront.address);

    await storeFront.whitelist(nft.address, rentToken.address);
});

describe(`JayPigsStoreFront`, async () => {
    describe(`lend`, async () => {
        it(`Shouldnt fail when called correctly`, async () => {
            await nft.connect(lender).approve(storeFront.address, NFT_ID);

            await storeFront
                .connect(lender)
                .lend(
                    nft.address,
                    NFT_ID,
                    PRICE,
                    DAY_IN_SEC / 2,
                    DAY_IN_SEC,
                    0
                );
        });

        it(`Should have set the right properties`, async () => {
            const { owner, price, maxTime, minTime, deadline } =
                await storeFront.lendingInfo(nft.address, NFT_ID);

            expect(owner).to.be.eq(lender.address);
            expect(price).to.be.eq(PRICE);
            expect(minTime).to.be.eq(DAY_IN_SEC / 2);
            expect(maxTime).to.be.eq(DAY_IN_SEC);
            expect(deadline).to.be.eq(0);
        });

        it(`Should minted rent token with right properties`);
    });

    describe(`rentNative`, async () => {
        it(`Shouldnt fail when called correctly`, async () => {
            const currentTime = await (
                await ethers.provider.getBlock()
            ).timestamp;
            await storeFront
                .connect(borrower)
                .borrowNative(nft.address, NFT_ID, currentTime + DAY_IN_SEC, {
                    value: PRICE,
                });
        });

        it(`Should have set the right properties`, async () => {
            const currentTime = await (
                await ethers.provider.getBlock()
            ).timestamp;
            const {
                borrower: _borrower,
                latestReward,
                totalRewards,
                chain,
                expires,
                timestamp,
            } = await storeFront.lendingInfo(nft.address, NFT_ID);

            expect(_borrower).to.be.eq(borrower.address);
            expect(latestReward).to.be.closeTo(
                PRICE,
                ethers.utils.parseEther("0.0001")
            );
            expect(totalRewards).to.be.closeTo(
                PRICE,
                ethers.utils.parseEther("0.0001")
            );
            expect(chain).to.be.eq(CHAIN_NAME);
            expect(expires).to.be.closeTo(currentTime + DAY_IN_SEC, 60);
            expect(timestamp).to.be.closeTo(currentTime, 60);
        });
    });

    describe(`getRewards`, async () => {
        it(`Shouldnt be able to refund while the first rent is active`, async () => {
            await expect(
                storeFront.connect(lender).claimRewards(nft.address, NFT_ID)
            ).to.be.revertedWith("No rewards to pay out");
        });

        it(`Should be able to collect first reward after second rent is active`, async () => {
            const twoDays = DAY_IN_SEC * 2;

            await ethers.provider.send("evm_increaseTime", [twoDays]);
            await ethers.provider.send("evm_mine");

            const currentTime = await (
                await ethers.provider.getBlock()
            ).timestamp;

            await storeFront
                .connect(borrower2)
                .borrowNative(nft.address, NFT_ID, currentTime + DAY_IN_SEC, {
                    value: PRICE,
                });

            const feeReceiverInitialBalance = await ethers.provider.getBalance(
                feeReceiver.address
            );
            const lenderInitialBalance = await ethers.provider.getBalance(
                lender.address
            );

            const fee = PRICE.mul(REWARD_FEE).div(100);

            await storeFront.connect(lender).claimRewards(nft.address, NFT_ID);

            expect(
                await ethers.provider.getBalance(feeReceiver.address)
            ).to.be.closeTo(
                feeReceiverInitialBalance.add(fee),
                ethers.utils.parseEther("0.001")
            );

            expect(
                await ethers.provider.getBalance(lender.address)
            ).to.be.closeTo(
                lenderInitialBalance.add(PRICE.sub(fee)),
                ethers.utils.parseEther("0.001")
            );
        });

        it(`Should be able to claim all rewards after second rent ends`, async () => {
            const twoDays = DAY_IN_SEC * 2;

            await ethers.provider.send("evm_increaseTime", [twoDays]);
            await ethers.provider.send("evm_mine");

            const feeReceiverInitialBalance = await ethers.provider.getBalance(
                feeReceiver.address
            );
            const lenderInitialBalance = await ethers.provider.getBalance(
                lender.address
            );
            const fee = PRICE.mul(REWARD_FEE).div(100);

            await storeFront.connect(lender).claimRewards(nft.address, NFT_ID);

            expect(
                await ethers.provider.getBalance(feeReceiver.address)
            ).to.be.closeTo(
                feeReceiverInitialBalance.add(fee),
                ethers.utils.parseEther("0.001")
            );

            expect(
                await ethers.provider.getBalance(lender.address)
            ).to.be.closeTo(
                lenderInitialBalance.add(PRICE.sub(fee)),
                ethers.utils.parseEther("0.001")
            );
        });

        it(`Shouldnt be able to claim another time`, async () => {
            await expect(
                storeFront.connect(lender).claimRewards(nft.address, NFT_ID)
            ).to.be.revertedWith("No rewards to pay out");
        });
    });

    describe(`unstake`, async () => {
        it(`Shouldnt be able to unstake while rent is active`, async () => {
            const currentTime = await (
                await ethers.provider.getBlock()
            ).timestamp;

            await storeFront
                .connect(borrower2)
                .borrowNative(nft.address, NFT_ID, currentTime + DAY_IN_SEC, {
                    value: PRICE,
                });

            await expect(
                storeFront.connect(lender).unstake(nft.address, NFT_ID, true)
            ).to.be.revertedWith("NFT is being rented");
        });

        it(`Should be able to unstake after time is over`, async () => {
            await ethers.provider.send("evm_increaseTime", [DAY_IN_SEC * 2]);
            await ethers.provider.send("evm_mine");

            const feeReceiverInitialBalance = await ethers.provider.getBalance(
                feeReceiver.address
            );
            const lenderInitialBalance = await ethers.provider.getBalance(
                lender.address
            );

            const calc = await storeFront.calculateRewards(PRICE, REWARD_FEE);

            await storeFront.connect(lender).unstake(nft.address, NFT_ID, true);

            expect(
                await ethers.provider.getBalance(feeReceiver.address),
                "Fee receiver"
            ).to.be.closeTo(
                feeReceiverInitialBalance.add(calc[0]),
                ethers.utils.parseEther("0.001")
            );

            expect(
                await ethers.provider.getBalance(lender.address),
                "Lender"
            ).to.be.closeTo(
                lenderInitialBalance.add(calc[1]),
                ethers.utils.parseEther("0.001")
            );

            expect(await nft.ownerOf(NFT_ID)).to.be.eq(lender.address);
        });

        it(`Shouldnt have data left about nft`, async () => {
            const {
                owner,
                price,
                maxTime,
                minTime,
                deadline,
                borrower: _borrower,
                latestReward,
                totalRewards,
                chain,
                expires,
                timestamp,
            } = await storeFront.lendingInfo(nft.address, NFT_ID);

            expect(owner).to.be.eq(ZERO_ADDRESS);
            expect(_borrower).to.be.eq(ZERO_ADDRESS);
            expect(price).to.be.eq(0);
            expect(minTime).to.be.eq(0);
            expect(maxTime).to.be.eq(0);
            expect(deadline).to.be.eq(0);
            expect(latestReward).to.be.eq(0);
            expect(totalRewards).to.be.eq(0);
            expect(expires).to.be.eq(0);
            expect(timestamp).to.be.eq(0);
            expect(chain).to.be.eq("");
        });
    });

    describe(`Admin refund`, async () => {
        it(`Shouldnt allow non-owner to refund`, async () => {
            await expect(
                storeFront
                    .connect(lender)
                    .refund(nft.address, NFT_ID, lender.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it(`Shouldnt allow admin to trigger a refund before 24h`, async () => {
            await nft.connect(lender).approve(storeFront.address, NFT_ID);

            await storeFront
                .connect(lender)
                .lend(
                    nft.address,
                    NFT_ID,
                    PRICE,
                    DAY_IN_SEC / 2,
                    DAY_IN_SEC * 3,
                    0
                );

            const currentTime = await (
                await ethers.provider.getBlock()
            ).timestamp;
            await storeFront
                .connect(borrower)
                .borrowNative(
                    nft.address,
                    NFT_ID,
                    currentTime + DAY_IN_SEC * 2,
                    {
                        value: PRICE.mul(2),
                    }
                );

            await expect(
                storeFront
                    .connect(owner)
                    .refund(nft.address, NFT_ID, borrower.address)
            ).to.be.revertedWith(
                "Refunds can only be triggerd 24h after renting"
            );
        });

        it(`Should allow refund admin after 24h`, async () => {
            await ethers.provider.send("evm_increaseTime", [DAY_IN_SEC]);
            await ethers.provider.send("evm_mine");

            const borrowerInitialBalance = await ethers.provider.getBalance(
                borrower.address
            );

            await storeFront
                .connect(owner)
                .refund(nft.address, NFT_ID, borrower.address);

            const {
                borrower: _borrower,
                latestReward,
                totalRewards,
                chain,
                expires,
                timestamp,
            } = await storeFront.lendingInfo(nft.address, NFT_ID);

            expect(_borrower).to.be.eq(ZERO_ADDRESS);
            expect(latestReward).to.be.eq(0);
            expect(totalRewards).to.be.eq(0);
            expect(expires).to.be.eq(0);
            expect(timestamp).to.be.eq(0);
            expect(chain).to.be.eq("");

            expect(
                await ethers.provider.getBalance(borrower.address)
            ).to.be.closeTo(
                borrowerInitialBalance.add(PRICE),
                ethers.utils.parseEther("0.3")
            );
        });
    });
});
