require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

task("whitelist", "Whitelist a NFT Collection and deploy a ERC4907")
    .addParam("nftaddress", "Address of the nft to whitelist")
    .addParam("tokenname", "Name for the erc4907 token")
    .addParam("tokensymbol", "Symbol for the erc4907 token")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { nftaddress, tokenname, tokensymbol } = taskArguments;

        const ERC4907 = await hre.ethers.getContractFactory("ERC4907");
        const erc4907 = await ERC4907.deploy(tokenname, tokensymbol);

        await erc4907.deployed();

        console.log(tokenname, "Successful Deployed");
        console.log("ADDRESS: ", erc4907.address);

        try {
            await hre.run("verify:verify", {
                address: erc4907.address,
                contract: "contracts/ERC4907.sol:ERC4907",
                constructorArguments: [tokenname, tokensymbol],
            });
            console.log("Verified Successful");
        } catch ({ message }) {
            console.error(message);
            console.log("USE THIS FOR MANUAL VERIFICATION");
            console.log(
                `npx hardhat verify --network ${hre.network.name} ${erc4907.address} "${tokenname}" "${tokensymbol}"`
            );
        }
        const contracts = require("../contracts.json");

        const tx = await erc4907.transferOwnership(
            contracts[hre.network.name].address
        );

        console.log("Ownership transfered, waiting for transaction");

        await tx.wait();

        console.log("Transaction finished");

        const JayPigsUpgradeable = await hre.ethers.getContractFactory(
            "JayPigsUpgradeable"
        );

        const jayPigsUpgradeable = JayPigsUpgradeable.attach(
            contracts[hre.network.name].address
        );

        await jayPigsUpgradeable.whitelist(nftaddress, erc4907.address);

        contracts[hre.network.name].whitelisted.push({
            original: nftaddress,
            copy: erc4907.address,
        });

        fs.writeFileSync("./contracts.json", JSON.stringify(contracts));

        console.log("NFT whitelisted");
    });

task("setoriginal", "Set the original nft address on other chains")
    .addParam("nftaddress", "Address of the nft on the other chain")
    .addParam("chain", "Name of the Chain of the nft")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { nftaddress, chain } = taskArguments;

        const contracts = require("../contracts.json");

        const JayPigsUpgradeable = await hre.ethers.getContractFactory(
            "JayPigsUpgradeable"
        );

        const jayPigsUpgradeable = JayPigsUpgradeable.attach(
            contracts[hre.network.name].address
        );

        await jayPigsUpgradeable.setOriginal(chain, nftaddress);

        contracts[hre.network.name].originalToken.push({
            chain: chain,
            address: nftaddress,
        });

        fs.writeFileSync("./contracts.json", JSON.stringify(contracts));

        console.log("Original Contract set Successful");
    });
