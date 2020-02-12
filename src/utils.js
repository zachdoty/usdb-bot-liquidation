let request = require("request");
let currentGas = {
    value: 0
};

let fetchGas = () => {
    try {
        request("https://ethgasstation.info/json/ethgasAPI.json", (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body);
                currentGas.value = json.average / 10;
                // currentGas.value = json.average;
            }
        });
    } catch (e) {}
    setTimeout(fetchGas, 60000 * 1);
};

fetchGas();

export const process = (account, method, gas, gasPrice) => {
    if (!gasPrice) gasPrice = currentGas.value * 1e9;

    return new Promise((resolve, reject) => {
        method.send(
            {
                from: account,
                gas: gas,
                gasPrice: gasPrice
            },
            (error, transactionHash) => {
                if (error) reject(error);
                else resolve(transactionHash);
            }
        );
    });
};
