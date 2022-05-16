// library for test
require("@nomiclabs/hardhat-waffle");
// plugin for deploy contracts
require('hardhat-deploy');
// plugin for contracts gas consumption report
require("hardhat-gas-reporter");
// loading environment variables
require('dotenv').config();
// plugin for verify contracts
require("@nomiclabs/hardhat-etherscan");

// getting private key from .env
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const API_KEY_BSC = process.env.API_KEY_BSC;

module.exports = {
	// solidity version
	solidity: "0.8.4",
	// network settings for deployments
	networks: {
		hardhat: {},
		localhost: {
			url: "http://localhost:8545"
		},
		bsc_testnet: {
			url: "https://data-seed-prebsc-1-s1.binance.org:8545",
			chainId: 97,
			gasPrice: 20000000000,
			accounts: [`0x${PRIVATE_KEY}`],
		},
		bsc_mainnet: {
			url: "https://bsc-dataseed.binance.org",
			chainId: 56,
			gasPrice: 20000000000,
			accounts: [`0x${PRIVATE_KEY}`],
		}
	},
	namedAccounts: {
		deployer: 0,
	},
	// settings for hardhat-gas-reporter plugin
	gasReporter: {
		enabled: true
	},
	// settings to get contract verified
	etherscan: {
		apiKey: API_KEY_BSC
	}
};
