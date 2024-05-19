require("@nomicfoundation/hardhat-toolbox");

task("deploynft", "deploy a the test nft")
    .addParam("name", "name of the nft")
    .addParam("symbol", "")
    .addParam("uri", "the base uri to be used")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { name, symbol, uri } = taskArguments;
        const ERC721Demo = await hre.ethers.getContractFactory("ERC721Demo");
        const nft = await ERC721Demo.deploy(name, symbol, uri);

        await nft.deployed();

        try {
            await hre.run("verify:verify", {
                address: nft.address,
                contract: "contracts/ERC721Demo.sol:ERC721Demo",
                constructorArguments: [name, symbol, uri],
            });
            console.log("Verified Successful");
        } catch ({ message }) {
            console.error(message);
        }

        console.log(name + " DEPLOYED SUCCESSFUL");
        console.log("ADDRESS: " + nft.address);
    });
