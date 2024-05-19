require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

task("checkJSON", "Verify contracts.json")
    .addParam("chain", "Name of the Chain")
    .setAction(async (taskArguments, hre, runSuper) => {
        const { chain } = taskArguments;
    });
