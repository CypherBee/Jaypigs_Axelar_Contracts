# JayPigsUpgradeable

## Perfect Path

- Deploy contract on chain#1 and chain#2
- Add linkers so contracts can interact
- Deploy a erc4907 on chain#1 and chain#2 for the nft collection on chain#1
- Transfer the ownership of the erc4907's to the jaypigs contract's before whitelist() so they can mint
- Owner calls whitelist() on chain#1 and chain#2 using the erc4907 from their chain and the nft address from chain#1
- Owner calls setOriginal() on chain#2 with chain#1 name and the nft address from chain#1
- User1 calls lend() to lend out an whitelisted nft they own on chain#1 
- User2 calls borrowCrossChain() (or borrowNative()) on chain#1 to borrow a rentable nft (ERC4907) on chain#2

⚠️ If transaction on chain#2 fails:
- Renter can call triggerRefundOnOtherChain() chain#2 if needed
- If problem, Owner calls refund() on chain#1

## Axelar constants
### Testnet
**Avalanche Fuji**
- Name: Avalanche
- Gateway: 0xC249632c2D40b9001FE907806902f63038B737Ab
- Gas Service: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6

**Polygon Mumbai**
- Name: Polygon
- Gateway: 0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B
- Gas Service: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6

**Binance Testnet**
- Name: binance
- Gateway: 0x4D147dCb984e6affEEC47e44293DA442580A3Ec0
- Gas Service: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6

**Aurora Testnet**
- Name: aurora
- Gateway: 0x304acf330bbE08d1e512eefaa92F6a57871fD895
- Gas Service: 0xA2C84547Db9732B27D45c06218DDAEFcc71e452D
- (currently not deployed to)

**Hardhat Networks use Axelar Names**

**Test Admin & Fee Receiver**: 0x717013482fBF1c9655fF9e5442B861f10A81bF0c
## Workflow using tasks
### Deploying
1. For all networks call `npx hardhat deploy --name [Name] --gateway [Gateway] --gasreceiver [Gas Service] --feereceiver [Reciever Wallet on this Chain] --fee [Fee in % eg. 20% -> 20] --network [network]`
2. For each deployed contract add all other contracts as linker `npx hardhat modifylinker --chain [Name of other Chain] --address [Jaypigs Contract on other chain] --network [network]`
### Whitelisting
1. For all deployed contracts deploy the erc4907 and add it to the contract `npx hardhat whitelist --nftaddress [Nft Contract] --tokenname [Name for the erc4907] --tokensymbol [Symbol for the erc4907] --network [network]`
2. For all contracts expect where the original is deployed call setOriginal `npx hardhat setoriginal --nftaddress [Nft contract] --chain [axelar name of chain of nft]  --network [network]`

**All data will be saved in the contracts.json file**

- use `npx hardhat --help` and `npx hardhat help [task]` to learn more
## Jaypigs Upgradeable Deploys
- Avalanche: 0x51b258c1D67F0Cc04d7cf9Fe9dE911DB1427947F
- Polygon: 0xE22a8363E4Ed66d436D6521b176A8Ad3034018c6
- binance: 0x51b258c1D67F0Cc04d7cf9Fe9dE911DB1427947F
## Whitelisted NFTs
### Testnet
- use task to deploy `npx hardhat deploynft --name [name] --symbol [symbol] --uri [URI] --network [network]`
- nft has baseURI and adds tokenId for tokenURI() call
- anyone can mint calling safeMint()
- mint page: TODO
- for now use the `safeMint()` function on etherscan
### Avalanche 
#### Smol Joes ⚠️ OVERWRITTEN BY BINANCE BAYC
- name: Smol Joes
- symbol: SMOL
- baseUri: ipfs://bafybeihosc6jrek4ow4jolwgrimig4phfth7d5hgjy4xfpdba4wdy3troy/
- test-address: 0x98FAc30a5750E5d388Af2eBCD03FF3348e9Aaad3
- copy Avalanche: 0x4108d1b9Ac2F1D0f66C14cb188fc234d7e1A37Af
- copy Polygon: 0x35136265B140C1372C7836d8fFB3335dB150dFf0
- copy binance: 0x2c551F82E9067Dc2d4725092dCf58747bD445f1b
#### Conscious Lines by Gabe Weis
- name: Conscious Lines by Gabe Weis
- symbol: Conscious Lines
- baseUri: ipfs://bafybeigdmw55iojmzgdqhql3gukw2x7e5re7mkp4dip3dres7vz457knf4/ 
- test-address: 0xfce2fF08DB317A3d90ABa0f7341f44f805a204dc
- copy Avalanche: 0x5377279B2B5E904e93e547753B976896cC2D491A
- copy Polygon: 0x035f41F629eE72Ce7e080e3A852BAb2437e6e8C5
- copy binance: 0x5377279B2B5E904e93e547753B976896cC2D491A
- copy Moonbase: 0x5377279B2B5E904e93e547753B976896cC2D491A
- mint link: https://testnet.snowtrace.io/address/0xfce2fF08DB317A3d90ABa0f7341f44f805a204dc#writeContract

### Polygon
#### Mfers
- name: mfers
- symbol: MFER
- baseUri: ipfs://QmWiQE65tmpYzcokCheQmng2DCM33DEhjXcPB6PanwpAZo/
- test-address: 0xeA804D231867B4cF870e99Bec5Ab194E0fcBA08C
- copy Avalanche: 0xd10c44CF7927446970Bb428F2D901Ef070d9cDce
- copy Polygon: 0x8b0E82AAb7E3b84c1a49786D79bcd29DA927713f
- copy binance: 0x367720D05540780BcDf745Ee23A318d6f8B06847
- copy Moonbase: 0xd10c44CF7927446970Bb428F2D901Ef070d9cDce
- mint link: https://mumbai.polygonscan.com/address/0xeA804D231867B4cF870e99Bec5Ab194E0fcBA08C#writeContract
#### World of Women
- name: World Of Women
- Symbol: WOW
- baseUri: ipfs://QmTNBQDbggLZdKF1fRgWnXsnRikd52zL5ciNu769g9JoUP/
- test-address: 0x08aF32056B27fd0dA37a90DC8B72EB493A4eED44
- copy Avalanche: 0x03a54569FE72555a7Af72d1851f55278d9b6B622
- copy Polygon: 0xCdCE9b3F30a93341951324eED0a4c0b23512f24E
- copy binance: 0xDB67f26Aa12782Cf9eA62e81c73ef5e1c957fc28
- copy Moonbase: 0x03a54569FE72555a7Af72d1851f55278d9b6B622
- mint link: https://mumbai.polygonscan.com/address/0x08aF32056B27fd0dA37a90DC8B72EB493A4eED44#writeContract 
### binance
#### BAYC
- name: BoredApeYachtClub
- symbol: BAYC
- basUri: ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/
- test-address: 0x98FAc30a5750E5d388Af2eBCD03FF3348e9Aaad3
- copy Avalanche: 0x701F1cbE163eBdD4f343311C454141575fc365C4
- copy Polygon: 0xfa78fEfc0fB7073602Ef9E2Ed87cC554840BDD96
- copy binance: 0xcBf6c412b25910D36549Bd12730Ac2ED14c30492
- copy Moonbase: 0xe21DAdDDED578eFcD92006217d840F2a04c96FD4
- mint link: https://testnet.bscscan.com/address/0x98FAc30a5750E5d388Af2eBCD03FF3348e9Aaad3#writeContract
#### Azuki
- name: Azuki
- symbol: AZUKI
- baseUri: ipfs://QmQFkLSQysj94s5GvTHPyzTxrawwtjgiiYS2TBLgrvw8CW/
- test-address: 0xfce2fF08DB317A3d90ABa0f7341f44f805a204dc
- copy Avalanche:
- copy Polygon:
- copy binance:

### Moonbase Alpha
#### Doodles
- name: Doodles
- symbol: DOODLE
- baseUri: ipfs://QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS/
- address: 0xF5B2D7C56F3C1D086969DCC6bfaE74e86349Fe1B
- copy Moonbase: 0xfce2fF08DB317A3d90ABa0f7341f44f805a204dc
- copy Avalanche: 0xE22a8363E4Ed66d436D6521b176A8Ad3034018c6
- copy Polygon: 0xFd46cAA0d86578e33956d2c223Ef868c20e6Db06
- copy binance: 0x8A190d8a9b550d872D932346Ee9881E0B7998172
# ⚠️ SMOL JOE OVERWRITTEN BY BINANCE BAYC
- remove getOriginal() from binance
- add original to avax
- deploy new nft on avax