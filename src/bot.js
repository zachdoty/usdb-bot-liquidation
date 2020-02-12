import { web3, web3WS } from "./web3";
import addresses from "./config/addresses.json";
import config from "./config/app.json";
import { process } from "./utils";
import { sendMessage } from "./telegram-bot";

import { abi as VaultABI } from "../contracts/Vault.json";
import { abi as RegistryABI } from "../contracts/ContractRegistry.json";
import { abi as PegLogicABI } from "../contracts/PegLogic.json";
import { abi as AuctionActionsABI } from "../contracts/AuctionActions.json";
import { abi as AuctionABI } from "../contracts/Auction.json";
import { abi as TokenABI } from "../contracts/ERC20Token.json";

const network = config.network;

let pegLogic;
let auctionActions;

let vaultsChecked = [];

const bid = async (vault, borrower) => {
    try {
        const auctionAddress = await vault.methods.auctions(borrower).call();
        if (auctionAddress !== config.zeroAddress) {
            const auction = new web3.eth.Contract(AuctionABI, auctionAddress);
            const highestBidder = await auction.methods.highestBidder().call();
            if (highestBidder === config.zeroAddress) {
                let msg = `Placing bid on vault ${borrower}`;
                console.log(msg);
                sendMessage(msg);
                const debtTokenAddress = await pegLogic.methods.getDebtToken(vault.address).call();
                const debtToken = new web3.eth.Contract(TokenABI, debtTokenAddress);
                const balance = Number(await debtToken.methods.balanceOf(web3.eth.defaultAccount).call());
                const debtAmount = Number(await pegLogic.methods.actualDebt(vault.address, auctionAddress).call());
                if (balance > debtAmount) {
                    const allowance = Number(await debtToken.methods.allowance(web3.eth.defaultAccount, auctionAddress).call());
                    let gas = await debtToken.methods.approve(auctionAddress, 0).estimateGas({from: web3.eth.defaultAccount});
                    if (allowance > 0 && allowance < debtAmount) await process(web3.eth.defaultAccount, debtToken.methods.approve(auctionAddress, 0), gas, null);
                    gas = await debtToken.methods.approve(auctionAddress, web3.utils.toWei("1000000000", "ether")).estimateGas({from: web3.eth.defaultAccount});
                    if (allowance < debtAmount) await process(web3.eth.defaultAccount, debtToken.methods.approve(auctionAddress, web3.utils.toWei("1000000000", "ether")), gas, null);

                    gas = await auction.methods.bid(1, 0).estimateGas({from: web3.eth.defaultAccount});
                    let res = await process(web3.eth.defaultAccount, auction.methods.bid(1, 0), gas, null);
                    let status = null;
                    do {
                        const receipt = await web3.eth.getTransactionReceipt(res);
                        if (receipt) status = receipt.status;
                    } while (status === null);
                    if (status === false) {
                        setTimeout(() => {
                            bid(vault, borrower);
                        }, 30 * 1000);
                    } else {
                        let msg = `Done placing bid on vault ${borrower}`;
                        console.log(msg);
                        sendMessage(msg);
                    }
                } else {
                    let msg = `Insufficient balance on token ${debtToken.address}`;
                    console.log(msg);
                    sendMessage(msg);
                }
            }
        }
    } catch (err) {
        console.log(err);
        sendMessage(err);
        setTimeout(() => {
            bid(vault, borrower);
        }, 30 * 1000);
    }
};

const end = async (vault, borrower) => {
    try {
        const auctionAddress = await vault.methods.auctions(borrower).call();
        if (auctionAddress !== config.zeroAddress) {
            const auction = new web3.eth.Contract(AuctionABI, auctionAddress);
            const hasEnded = await auction.methods.hasEnded().call();
            if (hasEnded === true) {
                let msg = `Ending auction for vault ${borrower}`;
                console.log(msg);
                sendMessage(msg);
                let gas = await auctionActions.methods.endAuction(vault.address, borrower).estimateGas({from: web3.eth.defaultAccount});
                let res = await process(web3.eth.defaultAccount, auctionActions.methods.endAuction(vault.address, borrower), gas, null);
                let status = null;
                do {
                    const receipt = await web3.eth.getTransactionReceipt(res);
                    if (receipt) status = receipt.status;
                } while (status === null);
                if (status === false) {
                    setTimeout(() => {
                        end(vault, borrower);
                    }, 30 * 1000);
                } else {
                    let msg = `Done ending auction on vault ${borrower}`;
                    console.log(msg);
                    sendMessage(msg);
                }
            }
        }
    } catch (err) {
        console.log(err);
        sendMessage(err);
        setTimeout(() => {
            end(vault, borrower);
        }, 30 * 1000);
    }
};

const check = async (vault, borrower) => {
    try {
        console.log(`Running checks on vault ${borrower}`);
        vaultsChecked.push(borrower);
        const isInsolvent = await pegLogic.methods.isInsolvent(vault.address, borrower).call();
        const auctionAddress = await vault.methods.auctions(borrower).call();

        const actualBalance = Number(await pegLogic.methods.actualBalance(vault.address, borrower).call());
        const minBalance = Number(await pegLogic.methods.minBalance(vault.address, borrower).call());

        console.log(`actualBalance/minBalance: ${actualBalance > 0 ? (actualBalance/minBalance) : 0}`)
        console.log(`minBalance/actualBalance: ${minBalance > 0 ? (minBalance/actualBalance) : 0}`)

        if (isInsolvent === false && auctionAddress !== config.zeroAddress) {
            let msg = `Vault ${borrower} is on liquidation`;
            console.log(msg);
            sendMessage(msg);
            await bid(vault, borrower);
            await end(vault, borrower);
        }

        if (isInsolvent === true && auctionAddress === config.zeroAddress) {
            let msg = `Starting auction for vault ${borrower}`;
            console.log(msg);
            sendMessage(msg);
            let gas = await auctionActions.methods.startAuction(vault.address, borrower).estimateGas({ from: web3.eth.defaultAccount });
            let res = await process(web3.eth.defaultAccount, auctionActions.methods.startAuction(vault.address, borrower), gas, null);
            let status = null;
            do {
                const receipt = await web3.eth.getTransactionReceipt(res);
                if (receipt) status = receipt.status;
            } while (status === null);
            if (status === false) {
                setTimeout(() => {
                    check(vault, borrower);
                }, 30 * 1000);
            } else {
                let msg = `Done starting auction on vault ${borrower}`;
                console.log(msg);
                sendMessage(msg);
                await bid(vault, borrower);
            }
        }
        setTimeout(() => {
            check(vault, borrower);
        }, 30 * 1000);
    } catch (err) {
        console.log(err);
        sendMessage(err);
        setTimeout(() => {
            check(vault, borrower);
        }, 30 * 1000);
    }
};

const getVaults = async vault => {
    const vaults = await vault.methods.getVaults().call();
    if(vaults)
        vaults.forEach(async _borrower => {
            if (!vaultsChecked.includes(_borrower)) check(vault, _borrower);
        });
    setTimeout(() => {
        getVaults(vault);
    }, 30 * 1000);
};

export default async vaultType => {
    try {
        const accounts = await web3.eth.getAccounts();
        web3.eth.defaultAccount = accounts[0];

        const registry = new web3.eth.Contract(RegistryABI, addresses[network][`registry`]);

        const PegLogicId = await registry.methods.PEG_LOGIC().call();
        const AuctionActionsId = await registry.methods.AUCTION_ACTIONS().call();
        const VaultId = await registry.methods[`VAULT_${vaultType}`]().call();
        
        const PegLogicAddress = await registry.methods.addressOf(PegLogicId).call();
        const AuctionActionsAddress = await registry.methods.addressOf(AuctionActionsId).call();
        const VaultAddress = await registry.methods.addressOf(VaultId).call();

        const vault = new web3.eth.Contract(VaultABI, VaultAddress);
        const vaultWS = new web3WS.eth.Contract(VaultABI, VaultAddress);

        pegLogic = new web3.eth.Contract(PegLogicABI, PegLogicAddress);
        auctionActions = new web3.eth.Contract(AuctionActionsABI, AuctionActionsAddress);

        vaultWS.events.Create().on("data", event => {
            if (!vaultsChecked.includes(event.returnValues._borrower)) check(vault, event.returnValues._borrower);
        });

        vaultWS.events.AuctionStarted().on("data", event => {
            bid(vault, event.returnValues._borrower);
        });
        getVaults(vault);
    } catch (err) {
        console.log(err);
    }
};
