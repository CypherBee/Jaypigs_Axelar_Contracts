require("solidity-coverage");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-contract-sizer");
require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("./tasks/deploy");
require("./tasks/whitelist");
require("./tasks/check");
require("./tasks/nft");
require("hardhat-gas-reporter");

require("dotenv").config();

module.exports = {
  networks: {
    binance: {
      url:
        "https://radial-flashy-panorama.bsc-testnet.discover.quiknode.pro/" +
        process.env.QUICKNODE_KEY,
      accounts: [process.env.PRIVATE_KEY],
    },
    Avalanche: {
      url: `https://avalanche-fuji.infura.io/v3/` + process.env.INFURA_KEY,
      accounts: [process.env.PRIVATE_KEY],
    },
    Polygon: {
      url: "https://polygon-mumbai.infura.io/v3/" + process.env.INFURA_KEY,
      accounts: [process.env.PRIVATE_KEY],
    },
    local: {
      url: "http://127.0.0.1:8545/",
    },
    Moonbeam: {
      url: `https://moonbase-alpha.blastapi.io/` + process.env.BLAST_KEY,
      // chainId: 1287,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings: {
          evmVersion: process.env.EVM_VERSION || "london",
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.9",
      },
    ],
  },
  paths: {
    sources: "./contracts",
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSC_SCAN_KEY,
      avalancheFujiTestnet: process.env.AVAX_SCAN_KEY,
      polygonMumbai: process.env.POLYGON_SCAN_KEY,
      moonbaseAlpha: process.env.MOONBASE_SCAN_KEY,
    },
  },
  mocha: {
    timeout: 100000000,
  },
  gasReporter: {
    enabled: true,
  },
};
