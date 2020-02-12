
import Web3 from "web3";
import HDWalletProvider from "truffle-hdwallet-provider";
import config from "./config/app.json";
import { networks } from "./config/networks.js";

let network = config.network;
let provider = new Web3.providers.HttpProvider("http://localhost:8545");
let wsProvider = new Web3.providers.WebsocketProvider(`wss://${network}.infura.io/ws/v3/${networks[network].infuraKey}`);

if (network == "ropsten") {
    console.log("Running on Ropsten...");
    provider = new HDWalletProvider(networks.ropsten.mnemonic, "https://ropsten.infura.io/v3/" + networks.ropsten.infuraKey);
} else if (network == "rinkeby") {
    console.log("Running on Rinkeby...");
    provider = new HDWalletProvider(networks.rinkeby.mnemonic, "https://rinkeby.infura.io/v3/" + networks.rinkeby.infuraKey);
}  else if (network == "kovan") {
    console.log("Running on Kovan...");
    provider = new HDWalletProvider(networks.kovan.mnemonic, "https://kovan.infura.io/v3/" + networks.kovan.infuraKey);
} else if (network == "mainnet") {
    console.log("Running on main net...");
    console.log("WARNING: THIS WILL USE REAL ETHER");
    console.log("Press CTRL + C to cancel...");
    provider = new HDWalletProvider(networks.mainnet.mnemonic, "https://mainnet.infura.io/v3/" + networks.mainnet.infuraKey);
} else {
    console.log("Running on local ganache...");
    network = "local";
    wsProvider = new Web3.providers.WebsocketProvider(`ws://localhost:8545`);
}

export const web3 = new Web3(provider);
export const web3WS = new Web3(wsProvider);