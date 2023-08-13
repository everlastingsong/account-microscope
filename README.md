# 🔬 Account microscope
Account microscope is a tool used to examine the contents of Solana accounts.

It displays raw data that developers want to know about accounts.

Especially, information on accounts associated with Orca's Whirlpool🌀 is displayed in detail.

## Deployment on GitHub Pages
Account microscope is available at the following address.

https://everlastingsong.github.io/account-microscope/#/whirlpool/list


## Supported accounts
### Token
- Mint
- Account

### Orca Whirlpool
- Whirlpool
- WhirlpoolsConfig
- FeeTier
- Position
- TickArray
- PositionBundle

### Orca Legacy Pool (Aquafarm)
- TokenSwap
- GlobalFarm
- UserFarm

## Features worth mentioning
### HexDump
For not supported accounts, HexDump will be displayed and you can analyze the data.

<img width="1057" alt="screenshot 2023-06-05 0 28 59" src="https://github.com/everlastingsong/account-microscope/assets/109891005/1742c933-2b82-4edb-a60b-7321506540cb">

### Download account as JSON file
You can download the same JSON as the following command with a click of a button.

```solana account -o <json filename> --output json-compact <pubkey>```

<img width="1034" alt="screenshot 2023-08-13 10 29 47" src="https://github.com/everlastingsong/account-microscope/assets/109891005/30c3bf9b-e23d-4fa8-bf77-22de684bf5c4">

### It makes you a millionaire in LocalValidator
You can download TokenProgram related accounts to mint an arbitrary amount of tokens of your choice in LocalValidator.

It would be very helpful to get the tokens needed to trade in an environment cloned from the mainnet.

<img width="1034" alt="screenshot 2023-08-13 10 30 28" src="https://github.com/everlastingsong/account-microscope/assets/109891005/10d04903-36aa-44e4-9699-7c8883861610">
