// const {
//   createNetwork,
// } = require("@axelar-network/axelar-local-dev/src/networkUtils");
const { ContractFactory } = require("ethers");
const JayPigSatellite = require("./artifacts/contracts/JayPigsSatellite.sol/JayPigsSatellite.json");
const DemoNft = require("./artifacts/contracts/ERC721Demo.sol/ERC721Demo.json");
const {
  networks,
  createNetwork,
  utils: { deployContract },
  testnetInfo,
} = require("@axelar-network/axelar-local-dev");

// async function deployContract(wallet, contrachtJson, args = [], options = {}) {
//   const factory = new ContractFactory(
//     contrachtJson.abi,
//     contrachtJson.bytecode,
//     wallet
//   );

//   const contract = await factory.deploy(...args, { ...options });
//   await contract.deployed();
//   return contract;
// }

module.exports = async (numberOfNetworks) => {
  console.log("\n");
  console.log("👷 DEPLOYING NETWORKS");
  console.log("\n");

  for (let i = 0; i < numberOfNetworks; i++) {
    const chain = await createNetwork({
      seed: "network" + i,
      name: blockchains[i],
    });
    const [, deployer] = chain.userWallets;
    chain.jayPigsSatellite = await deployContract(deployer, JayPigSatellite, [
      chain.name,
      chain.gateway.address,
      chain.gasReceiver.address,
    ]);
    chain.demoNft = await deployContract(deployer, DemoNft, [
      "DEMO TOKEN " + chain.name,
      "DEMO-" + chain.name.toUpperCase(),
    ]);
  }

  for (let i = 0; i < numberOfNetworks; i++) {
    const chain = networks[i];
    const [, deployer] = chain.userWallets;
    for (let j = 0; j < numberOfNetworks; j++) {
      if (i === j) continue;

      const otherChain = networks[j];
      await (
        await chain.jayPigsSatellite
          .connect(deployer)
          .addLinker(otherChain.name, otherChain.jayPigsSatellite.address)
      ).wait();
    }
  }
};

const blockchains = [
  "Bitcoin",
  "Ethereum",
  "Avalanche",
  "Solana",
  "Moonbeam",
  "Polkadot",
  "BNC",
  "Monero",
  "Ripple",
  "Fantom",
  "Arbitrum",
  "Cardano",
  "Aurora",
  "Near",
];
