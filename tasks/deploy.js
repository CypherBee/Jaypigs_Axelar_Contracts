require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

task("deploy", "Deploy the Contract to a Chain")
    .addParam("name", "The Name of the Chain")
    .addParam("gateway", "Address of the Axelar Gateway Contract")
    .addParam("gasreceiver", "Address of the Axelar Gas Receiver Contract")
    .addParam("feereceiver", "Wallet who will receive the Fee")
    .addParam("fee", "Fee as Porzent eg. 20% -> 20")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { name, gateway, gasreceiver, feereceiver, fee } = taskArguments;
        const JayPigsUpgradeable = await hre.ethers.getContractFactory(
            "JayPigsUpgradeable"
        );

        const jayPigsUpgradeable = await hre.upgrades.deployProxy(
            JayPigsUpgradeable,
            [name, gateway, gasreceiver, feereceiver, fee],
            {
                kind: "uups",
            }
        );
        console.log("deploying");
        await jayPigsUpgradeable.deployed();

        const contracts = require("../contracts.json");

        contracts[name] = {
            version: 1,
            address: jayPigsUpgradeable.address,
            fee: fee,
            feeReceiver: feereceiver,
            linkers: [],
            whitelisted: [],
            originalToken: [],
        };

        fs.writeFileSync("./contracts.json", JSON.stringify(contracts));

        console.log(
            "Contract Deployed Successful ",
            jayPigsUpgradeable.address
        );
        console.log("REMBER: Don't forget to add linkers on all contracts");

        console.log("Trying to verify");

        try {
            await hre.run("verify:verify", {
                address: jayPigsUpgradeable.address,
                contract:
                    "contracts/JayPigsUpgradeable/JayPigsUpgradeable.sol:JayPigsUpgradeable", // <path-to-contract>:<contract-name>
                constructorArguments: [
                    name,
                    gateway,
                    gasreceiver,
                    feereceiver,
                    fee,
                ],
            });
            console.log("Verified Successful");
        } catch ({ message }) {
            console.error(message);
        }
    });

task("modifylinker", "Add a linker to the Jaypigs Contract")
    .addParam("chain", "Name of the Chain")
    .addParam("address", "Address of the Contract on the other Chain")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { chain, address } = taskArguments;
        const JayPigsUpgradeable = await hre.ethers.getContractFactory(
            "JayPigsUpgradeable"
        );

        const contracts = require("../contracts.json");

        const jayPigsUpgradeable = JayPigsUpgradeable.attach(
            contracts[hre.network.name].address
        );

        await jayPigsUpgradeable.modifyLinker(chain, address);

        contracts[hre.network.name].linkers.push({
            chain: chain,
            address: address,
        });

        fs.writeFileSync("./contracts.json", JSON.stringify(contracts));

        console.log("Adding Linker was Successfull");
    });

task("upgrade", "Upgrade to the new contract").setAction(
    async (taskArguments, hre, runSuper) => {
        const contracts = require("../contracts.json");
        const address = contracts[hre.network.name].address;

        const JayPigsUpgradeable = await hre.ethers.getContractFactory(
            "JayPigsUpgradeable"
        );

        await hre.upgrades.upgradeProxy(address, JayPigsUpgradeable, {
            kind: "uups",
        });
        contracts[hre.network.name].version++;
        fs.writeFileSync("./contracts.json", JSON.stringify(contracts));

        try {
            await hre.run("verify:verify", {
                address: address,
                contract:
                    "contracts/JayPigsUpgradeable/JayPigsUpgradeable.sol:JayPigsUpgradeable",
            });
            console.log("Verified Successful");
        } catch ({ message }) {
            console.error(message);
        }

        console.log(`Upgrading on ${hre.network.name} was successfull`);
    }
);
