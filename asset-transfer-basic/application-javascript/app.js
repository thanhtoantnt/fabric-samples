/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'user12';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

async function main() {
	try {
		const ccp = buildCCPOrg1();
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');
		const wallet = await buildWallet(Wallets, walletPath);
		await enrollAdmin(caClient, wallet, mspOrg1);
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');
		const gateway = new Gateway();

		try {
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			const network = await gateway.getNetwork(channelName);
			const contract = network.getContract(chaincodeName);


			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');

      console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			let result2 = await contract.evaluateTransaction('GetAllAssets');
			console.log(`*** Result: ${prettyJSONString(result2.toString())}`);

      // transactions
      let result3 = await contract.evaluateTransaction('getBalance', 'A0');
			console.log(`*** Result: ${prettyJSONString(result3.toString())}`);

      let result4 = await contract.evaluateTransaction('getBalance', 'A1');
			console.log(`*** Result: ${prettyJSONString(result4.toString())}`);

      let start_time = Date.now();
      let count = 0;

      let result5 = await contract.evaluateTransaction('sendAmount', 'A0', 'A1', '6');
      count++;
			console.log(`*** Result: ${prettyJSONString(result5.toString())}`);

      await contract.evaluateTransaction('sendAmount', 'A2', 'A1', '16');
      count++;

      await contract.evaluateTransaction('sendAmount', 'A2', 'A0', '26');
      count++;

      await contract.evaluateTransaction('sendAmount', 'A4', 'A3', '21');
      count++;

      // ending time
      let latency = (Date.now() - start_time)/count;
      let throughput = count * 1000 / (Date.now() - start_time);
			console.log(`*** Latency: ${prettyJSONString(latency.toString())} miliseconds/transaction`);
			console.log(`*** throughput: ${prettyJSONString(throughput.toString())} transactions/second`);


		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();
