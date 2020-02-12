import dotenv from "dotenv";
dotenv.config();

export const networks = {
    "rinkeby": {
        "mnemonic": process.env.RINKEBY_MNEMONIC,
        "infuraKey": process.env.RINKEBY_INFURA_KEY,
    },
    "ropsten": {
        "mnemonic": process.env.ROPSTEN_MNEMONIC,
        "infuraKey": process.env.ROPSTEN_INFURA_KEY,
    },
    "kovan": {
        "mnemonic": process.env.KOVAN_MNEMONIC,
        "infuraKey": process.env.KOVAN_INFURA_KEY,
    },
    "mainnet": {
        "mnemonic": process.env.MAINNET_MNEMONIC,
        "infuraKey": process.env.MAINNET_INFURA_KEY,
    }
}