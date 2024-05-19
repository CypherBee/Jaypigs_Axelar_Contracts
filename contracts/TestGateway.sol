// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";

contract TestGateway is IAxelarGateway {
    bytes[] public payloads;

    constructor() {}

    function sendToken(
        string calldata destinationChain,
        string calldata destinationAddress,
        string calldata symbol,
        uint256 amount
    ) external override {}

    function callContract(
        string calldata destinationChain,
        string calldata contractAddress,
        bytes calldata payload
    ) external override {
        payloads.push(payload);
    }

    function callContractWithToken(
        string calldata destinationChain,
        string calldata contractAddress,
        bytes calldata payload,
        string calldata symbol,
        uint256 amount
    ) external override {}

    function isContractCallApproved(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        address contractAddress,
        bytes32 payloadHash
    ) external view override returns (bool) {}

    function isContractCallAndMintApproved(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        address contractAddress,
        bytes32 payloadHash,
        string calldata symbol,
        uint256 amount
    ) external view override returns (bool) {}

    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external override returns (bool) {}

    function validateContractCallAndMint(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash,
        string calldata symbol,
        uint256 amount
    ) external override returns (bool) {}

    function authModule() external view override returns (address) {}

    function tokenDeployer() external view override returns (address) {}

    function tokenMintLimit(string memory symbol)
        external
        view
        override
        returns (uint256)
    {}

    function tokenMintAmount(string memory symbol)
        external
        view
        override
        returns (uint256)
    {}

    function allTokensFrozen() external view override returns (bool) {}

    function implementation() external view override returns (address) {}

    function tokenAddresses(string memory symbol)
        external
        view
        override
        returns (address)
    {}

    function tokenFrozen(string memory symbol)
        external
        view
        override
        returns (bool)
    {}

    function isCommandExecuted(bytes32 commandId)
        external
        view
        override
        returns (bool)
    {}

    function adminEpoch() external view override returns (uint256) {}

    function adminThreshold(uint256 epoch)
        external
        view
        override
        returns (uint256)
    {}

    function admins(uint256 epoch)
        external
        view
        override
        returns (address[] memory)
    {}

    function setTokenMintLimits(
        string[] calldata symbols,
        uint256[] calldata limits
    ) external override {}

    function upgrade(
        address newImplementation,
        bytes32 newImplementationCodeHash,
        bytes calldata setupParams
    ) external override {}

    function setup(bytes calldata params) external override {}

    function execute(bytes calldata input) external override {}
}
