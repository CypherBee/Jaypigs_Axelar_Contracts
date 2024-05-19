const { expect } = require("chai");
// const { BigNumber } = require("ethers");
const { ethers, upgrades } = require("hardhat");

let apes, joes;

const apeString = "TEST-BAYC-";
const joeString = "TEST_JOE-";

let owner, addr1, addr2;

before(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();
    const NFT = await ethers.getContractFactory("ERC721Demo");
    apes = await NFT.deploy("BAYC Jaypigs Rent Token", "BAYC", apeString);
    joes = await NFT.deploy("SmolJOE Jaypigs Rent Token", "JOE", joeString);
});

describe("MINT & CHECK URI", async () => {
    it("Should Mint", async () => {
        await apes.connect(addr1).safeMint();
        await apes.connect(addr2).safeMint();

        expect(await apes.ownerOf(1)).to.be.eq(addr1.address);
        expect(await apes.ownerOf(2)).to.be.eq(addr2.address);

        await joes.connect(addr1).safeMint();
        await joes.connect(addr2).safeMint();

        expect(await joes.ownerOf(1)).to.be.eq(addr1.address);
        expect(await joes.ownerOf(2)).to.be.eq(addr2.address);
    });
    it("Should have correct uri", async () => {
        expect(await apes.tokenURI(1)).to.be.eq(apeString + 1);
        expect(await apes.tokenURI(2)).to.be.eq(apeString + 2);

        expect(await joes.tokenURI(1)).to.be.eq(joeString + 1);
        expect(await joes.tokenURI(2)).to.be.eq(joeString + 2);

        await expect(apes.tokenURI(3)).to.be.revertedWith(
            "ERC721: invalid token ID"
        );
        await expect(joes.tokenURI(3)).to.be.revertedWith(
            "ERC721: invalid token ID"
        );
    });
});
