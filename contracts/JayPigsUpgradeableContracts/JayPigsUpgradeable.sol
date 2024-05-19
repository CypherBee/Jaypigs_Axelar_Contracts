// SPDX-License-Identifier: None
pragma solidity 0.8.17;

import "../ERC4907.sol";
import "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "./AxelarExecutableUpgradeable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/StringAddressUtils.sol";

/// @title JayPigsUpgradeable
/// @author Iliass Bouchir/Jaypigs Quinn Eschenbach/Jaypigs 
/// @notice Crosschain borrowing using the erc4907 standard and the axelar network
/// @dev make sure to check the axelar documentation to better understand this contract
contract JayPigsUpgradeable is
    AxelarExecutableUpgradeable,
    Ownable2StepUpgradeable,
    ERC721HolderUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    event Whitelisted(address contractAddress);
    event WhitelistRemoved(address contractAddress);
    event Staked(
        address contractAddress,
        uint256 tokenId,
        address owner,
        uint256 price
    );
    event Rented(
        address user,
        address contractAddress,
        uint256 tokenId,
        uint64 expires,
        string destinationChain
    );
    event RentTokenMinted(
        address user,
        address originalContractAddress,
        uint256 tokenId,
        uint64 expires
    );
    event RewardsClaimed(address receiver, uint256 amountReceived);
    event Refunded(address receiver, uint256 amountRefunded);
    event Unstaked(address user, address contractAddress, uint256 tokenId);

    struct LendingInfo {
        string chain;
        address owner;
        address borrower;
        uint256 price;
        uint256 totalRewards;
        uint256 latestReward;
        uint256 tokenId;
        uint64 minTime;
        uint64 maxTime;
        uint64 expires;
        uint64 deadline;
        uint64 timestamp;
        uint8 fee;
    }

    using StringToAddress for string;
    using AddressToString for address;

    /// @notice axelar gas reciver contract
    IAxelarGasService public gasReceiver;

    /// @notice fee the contract takes from collected rewards, to be set in % eg. 20% -> fee = 20
    uint8 public currentFee;

    /// @notice address who recieves the generated fees
    address private feeReceiver;

    /// @notice address who recieves the generated fees
    /// @dev needs to be the same axelar uses, Testnet => https://docs.axelar.dev/resources/testnet
    string public chainName;

    /// @notice contracts on other chains
    mapping(string => address) public linkers;

    /// @notice mapping contains all infos about lending and renting
    mapping(address => mapping(uint256 => LendingInfo)) public lendingInfo;

    /// @notice rewards that were not claimed when nft was unstaked
    mapping(address => uint256) public unclaimedRewards;

    /// @notice rentable implementation of whitelisted contracts, original => erc4907
    mapping(address => address) public rentTokens;

    /// @notice chain of original nfts, nft => chain
    mapping(address => string) public originalTokens;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice initilizes the contract
    /// @dev initializer function is used instead of constructer when using upgreadable contracts
    /// @param _chainName chain name where this contract is deployed, must be written the same way as in the axelar documetation
    /// @param _gateway address of the axelar gateway contract on this chain
    /// @param _gasReceiver address of the axelar gas reciver contract on this chain
    /// @param _feeReceiver address of the wallet who will recive the fees
    /// @param _fee fee charged for the service
    function initialize(
        string memory _chainName,
        address _gateway,
        address _gasReceiver,
        address _feeReceiver,
        uint8 _fee
    ) public initializer {
        checkFee(_fee);
        noZeroAddress(_gateway);
        noZeroAddress(_gasReceiver);
        noZeroAddress(_feeReceiver);
        noEmptyString(_chainName);

        gasReceiver = IAxelarGasService(_gasReceiver);
        chainName = _chainName;
        feeReceiver = _feeReceiver;
        currentFee = _fee;

        __ERC721Holder_init();
        __AxelarExecutable_init(_gateway);
        __Ownable2Step_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
    }

    /// @dev required for upgrades
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    /// @notice whitlist an erc721 contract by providing its retable erc4907 implementation
    /// @dev this contract needs to be the owner of the erc4907, transfer ownership before implementing
    /// @param contractAddress address of the nft collection that should be whitelisted
    /// @param erc4907 the deployed erc4907 rent contract
    function whitelist(address contractAddress, address erc4907)
        external
        onlyOwner
    {
        require(
            ERC4907(erc4907).owner() == address(this),
            "This contract not owner of ERC4907"
        );
        rentTokens[contractAddress] = erc4907;
        emit Whitelisted(contractAddress);
    }

    /// @notice Remove whitelist for an nft collection
    /// @param contractAddress address of the nft collection
    function removeWhitelist(address contractAddress) external onlyOwner {
        delete rentTokens[contractAddress];
        emit WhitelistRemoved(contractAddress);
    }

    /// @notice set address of the nft contract and the chain its deployed on
    /// @dev this needs to be called after whitelisting a collection
    /// @param chain name of the chain where nft contract is deployed
    /// @param original address of the nft contract
    function setOriginal(string memory chain, address original)
        external
        onlyOwner
    {
        originalTokens[original] = chain;
    }

    /// @notice delete an address from the original tokens mapping
    /// @param original the address of the nft collection
    function removeOriginal(address original) external onlyOwner {
        delete originalTokens[original];
    }

    /// @notice lend your nft to the contract
    /// @dev user needs to approve this contract to transfer their nft before calling this function
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param price price per day in the native token
    /// @param minTime minimum time the nft can be rented out in seconds or 0
    /// @param maxTime maximum time the nft can be rented out in seconds or 0
    /// @param deadline deadline after which nft cant be rented anymore or 0, as epoch timestamp in seconds
    function lend(
        address contractAddress,
        uint256 tokenId,
        uint256 price,
        uint64 minTime,
        uint64 maxTime,
        uint64 deadline
    ) external {
        IERC721 nft = IERC721(contractAddress);

        require(nft.ownerOf(tokenId) == _msgSender(), "Sender is not owner");
        require(
            maxTime >= minTime || minTime == 0 || maxTime == 0,
            "MinTime is bigger than maxTime"
        );

        nft.safeTransferFrom(_msgSender(), address(this), tokenId);

        LendingInfo storage info = lendingInfo[contractAddress][tokenId];
        info.owner = _msgSender();
        info.price = price;
        info.minTime = minTime;
        info.maxTime = maxTime;
        info.deadline = deadline;
        info.borrower = address(0);
        info.chain = "";
        info.tokenId = 0;
        info.expires = 0;
        info.timestamp = 0;
        info.fee = currentFee;

        emit Staked(contractAddress, tokenId, _msgSender(), price);
    }

    /// @notice borrow/rent nft on the same chain
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param expires epoch timestamp in seconds of when the rent finishes
    function borrowNative(
        address contractAddress,
        uint256 tokenId,
        uint64 expires
    ) external payable {
        _rent(
            contractAddress,
            tokenId,
            0,
            expires,
            ERC721(contractAddress).tokenURI(tokenId),
            chainName
        );
    }

    /// @notice claim rewards without unstaking, the rewards of currently active rents stay locked
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    function claimRewards(address contractAddress, uint256 tokenId)
        external
        nonReentrant
    {
        uint256 reward;
        LendingInfo storage info;
        info = lendingInfo[contractAddress][tokenId];

        if (block.timestamp > info.expires) {
            reward = info.totalRewards;
            info.totalRewards = 0;
            info.latestReward = 0;
        } else {
            reward = info.totalRewards - info.latestReward;
            info.totalRewards = info.latestReward;
            info.latestReward = 0;
        }

        require(info.owner == _msgSender(), "Only the owner can claim rewards");
        require(reward > 0, "No rewards to pay out");

        sendRewards(reward, info.fee);
    }

    /// @notice allows admin to refund any active rent
    /// @dev if this is for a cross chain rent, make sure it didnt work, this function only updates state on this chain
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param user who gets refunded
    function refund(
        address contractAddress,
        uint256 tokenId,
        address user
    ) external onlyOwner nonReentrant {
        uint256 reward;
        LendingInfo storage info;
        info = lendingInfo[contractAddress][tokenId];

        noZeroAddress(user);

        require(info.borrower == user, "Sender is not borrower");
        require(
            block.timestamp < info.expires,
            "Cant refund after rent expired"
        );
        require(
            block.timestamp > info.timestamp + 86400,
            "Refunds can only be triggerd 24h after renting"
        );

        reward = info.latestReward;
        info.totalRewards -= info.latestReward;
        info.latestReward = 0;
        info.expires = 0;
        info.borrower = address(0);
        info.timestamp = 0;
        info.chain = "";

        (bool sent, ) = user.call{value: reward}("");
        require(sent, "Failed to send Ether");

        emit Refunded(user, reward);
    }

    /// @notice allows user to request a refund on another chain
    /// @dev user can call this function everytime, if the contidions are set wrong or their are not elegible it way fail and the caller loose their gas
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param chain chain of the original token
    /// @param receiver the address who triggered the rent on the source chain, not the receiver at this chain
    function triggerRefundOnOtherChain(
        address contractAddress,
        uint256 tokenId,
        string memory chain,
        address receiver
    ) external payable nonReentrant {
        noZeroAddress(receiver);
        require(
            rentTokens[contractAddress] != address(0),
            "Token not whitelisted"
        );
        require(
            ERC4907(rentTokens[contractAddress]).userOf(tokenId) == address(0),
            "Rent was successful"
        );

        string memory destinationAddress = linkers[chain].toString();

        bytes memory payload = abi.encode(
            contractAddress, // contract
            tokenId, // tokenId
            0, //
            "", // tokenUri
            receiver, // user
            true // isCancelation
        );
        gasReceiver.payNativeGasForContractCall{value: msg.value}(
            address(this),
            chain,
            destinationAddress,
            payload,
            _msgSender()
        );

        gateway.callContract(chain, destinationAddress, payload);
    }

    /// @notice allow user to unstake their token if its not currently rented out
    /// @dev user could be exposed to another fee if they dont claim their rewards here
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param claim set true if you want to also claim rewards
    function unstake(
        address contractAddress,
        uint256 tokenId,
        bool claim
    ) external nonReentrant {
        uint256 reward;
        LendingInfo storage info;
        info = lendingInfo[contractAddress][tokenId];

        require(info.expires < block.timestamp, "NFT is being rented");
        require(info.owner == _msgSender(), "Sender is not owner");

        reward = info.totalRewards;
        uint8 fee = info.fee;
        delete lendingInfo[contractAddress][tokenId];

        ERC721(contractAddress).safeTransferFrom(
            address(this),
            _msgSender(),
            tokenId
        );

        if (reward > 0) {
            if (claim) {
                sendRewards(reward, fee);
            } else {
                unclaimedRewards[_msgSender()] += reward;
            }
        }
        emit Unstaked(_msgSender(), contractAddress, tokenId);
    }

    /// @notice User can claim rewards who werent claimed while unstaking
    function claimUnclaimedRewards() public nonReentrant {
        uint256 reward = unclaimedRewards[_msgSender()];
        require(reward > 0, "No unclaimed rewards");

        sendRewards(reward, currentFee);
    }

    /// @notice trigger rent on antoher chain
    /// @param contractAddress contract address of the nft contract
    /// @param tokenId token id of the nft
    /// @param gasForRent gas for the axelar call
    /// @param chain chain name of destination name, needs to be written like in the axelar documentation
    /// @param expires epoch timestamp in seconds of when the rent finishes
    /// @param receiver address who should receive the rent token
    function borrowCrossChain(
        address contractAddress,
        uint256 tokenId,
        uint256 gasForRent,
        string memory chain,
        uint64 expires,
        address receiver
    ) external payable nonReentrant {
        noZeroAddress(receiver);

        require(linkers[chain] != address(0), "Chain unknown");

        bytes memory payload = abi.encode(
            contractAddress, //     contractAddress
            tokenId, //                                     tokenId
            expires, //                                     expires
            ERC721(contractAddress).tokenURI(tokenId), //   tokenUri
            receiver, //                                    receiver on the other chain
            false //                                        isCancelation
        );

        string memory destinationAddress = linkers[chain].toString();

        gasReceiver.payNativeGasForContractCall{value: gasForRent}(
            address(this),
            chain,
            destinationAddress,
            payload,
            _msgSender()
        );

        gateway.callContract(chain, destinationAddress, payload);
        _rent(
            contractAddress,
            tokenId,
            gasForRent,
            expires,
            ERC721(contractAddress).tokenURI(tokenId),
            chain
        );
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        require(
            linkers[sourceChain] == sourceAddress.toAddress(),
            "Unknown contract"
        );

        (
            address contractAddress,
            uint256 tokenId,
            uint64 expires,
            string memory tokenURI,
            address user,
            bool isRefund
        ) = abi.decode(
                payload,
                (address, uint256, uint64, string, address, bool)
            );

        if (isRefund) {
            uint256 reward;
            LendingInfo storage info;
            info = lendingInfo[contractAddress][tokenId];

            require(info.borrower == user, "Sender is not borrower");
            require(
                block.timestamp < info.expires,
                "Cant refund after rent expired"
            );
            require(
                block.timestamp > info.timestamp + 86400,
                "Refunds can only be triggered 24h after renting"
            );

            reward = info.latestReward;
            info.totalRewards -= info.latestReward;
            info.latestReward = 0;
            info.expires = 0;
            info.borrower = address(0);
            info.timestamp = 0;
            info.chain = "";

            (bool sent, ) = user.call{value: reward}("");
            require(sent, "Failed to send Ether");

            emit Refunded(user, reward);
        } else {
            require(
                keccak256(
                    abi.encodePacked((originalTokens[contractAddress]))
                ) == keccak256(abi.encodePacked((sourceChain))),
                "Original contract lives on other chain"
            );
            _mint(contractAddress, tokenId, expires, tokenURI, user);
        }
    }

    function _rent(
        address contractAddress,
        uint256 tokenId,
        uint256 gasForRent,
        uint64 expires,
        string memory tokenURI,
        string memory chain
    ) internal {
        uint256 priceMultiplicator;
        uint256 totalPrice;
        LendingInfo storage info;

        require(expires > block.timestamp, "expiry date cant be in the past");

        info = lendingInfo[contractAddress][tokenId];
        priceMultiplicator = expires - block.timestamp;
        totalPrice = (info.price * priceMultiplicator) / 86400;

        require(msg.value >= totalPrice + gasForRent, "Payment insuficient");
        require(info.price > 0, "NFT is not up for rent");

        _checkTiming(info, expires);

        info.chain = chain;
        info.expires = expires;
        info.tokenId = tokenId;
        info.timestamp = uint64(block.timestamp);
        info.borrower = _msgSender();
        info.latestReward = totalPrice;
        info.totalRewards += totalPrice;

        // only mint and set user if is a native call, chain == chainName set in contract
        if (keccak256(abi.encode(chain)) == keccak256(abi.encode(chainName))) {
            _mint(contractAddress, tokenId, expires, tokenURI, _msgSender());
        }

        emit Rented(_msgSender(), contractAddress, tokenId, expires, chain);
    }

    function _mint(
        address contractAddress,
        uint256 tokenId,
        uint64 expires,
        string memory tokenURI,
        address user
    ) internal nonReentrant {
        require(
            rentTokens[contractAddress] != address(0),
            "Token not whitelisted"
        );
        ERC4907 rentToken = ERC4907(rentTokens[contractAddress]);
        if (!rentToken.exists(tokenId)) {
            rentToken.mint(tokenId, tokenURI);
        }
        rentToken.setUser(tokenId, user, expires);
        rentToken.setTokenURI(tokenId, tokenURI);

        emit RentTokenMinted(user, contractAddress, tokenId, expires);
    }

    function _checkTiming(LendingInfo memory info, uint64 _expires)
        internal
        view
    {
        require(info.owner != address(0), "NFT is not up for rent");

        require(block.timestamp < _expires, "Expiry date cant be in the past");
        require(
            _expires - block.timestamp >= info.minTime,
            "Expiry date must surpass min rent time"
        );
        require(
            _expires - block.timestamp <= info.maxTime || info.maxTime == 0,
            "Expiry date must be less than max rent time"
        );
        require(
            _expires <= info.deadline || info.deadline == 0,
            "Expiry date surpasses deadline"
        );
        require(info.expires < block.timestamp, "NFT is being rented");
    }

    /// @notice add/update linkers for the contract deployments on other chains
    /// @param chain chain name where the contract is deployed, needs to be written like in the axelar documentation
    /// @param contractAddress address of JayPigs contract on other chain
    function modifyLinker(string memory chain, address contractAddress)
        external
        onlyOwner
    {
        linkers[chain] = contractAddress;
    }

    /// @notice change the wallet who receives the fees
    /// @param newReceiver address of the new receiver wallet
    function modifyFeeReceiver(address newReceiver) external onlyOwner {
        noZeroAddress(newReceiver);
        feeReceiver = newReceiver;
    }

    /// @notice update the fee charged
    /// @dev fee to be set in % eg. 20% -> fee = 20, only applies for new rents not currently active ones
    /// @param newFee the new fee
    function modifyFee(uint8 newFee) external onlyOwner {
        checkFee(newFee);
        currentFee = newFee;
    }

    function renounceOwnership() public virtual override onlyOwner {
        revert("Cant renonce ownership");
    }

    function checkFee(uint8 _fee) internal pure {
        require(_fee < 100, "Fee must be less then 100");
    }

    function sendRewards(uint256 reward, uint8 _fee) internal {
        (uint256 contractFee, uint256 _reward) = calculateRewards(reward, _fee);

        bool sent;
        (sent, ) = _msgSender().call{value: _reward}("");
        require(sent, "Failed to send Ether");

        (sent, ) = feeReceiver.call{value: contractFee}("");
        require(sent, "Failed to send Ether");

        emit RewardsClaimed(_msgSender(), _reward);
    }

    /// @notice calculate the rewards and fees for unstaking
    /// @param _reward reward amount
    /// @param _fee fee in percent
    /// @return contractFee the fee charged by the contract
    /// @return reward reward the user will receive
    function calculateRewards(uint256 _reward, uint8 _fee)
        public
        pure
        returns (uint256 contractFee, uint256 reward)
    {
        contractFee = (_reward * _fee) / 100;
        reward = _reward - contractFee;
    }

    function noZeroAddress(address _address) internal pure {
        require(_address != address(0), "Zero address found");
    }

    function noEmptyString(string memory _string) internal pure {
        require(bytes(_string).length > 0, "Empty string detected");
    }
}
