'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');

var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs');


var CHAINCODE_PATH = 'github.com/hyperledger/fabric/examples/chaincode/go/example02/';
var METADATA_PATH = '';
var version = '1.0';
var e2eUtils = require('./functionUtils.js');
//
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log(' Store path:'+store_path);
var tx_id = null;

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
var peerTlsRoots = fs.readFileSync(path.resolve( __dirname, 'crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/tlscacerts/tlsca.org1.example.com-cert.pem'),"utf-8");
var connectionOpts = {
    pem: peerTlsRoots,
    name: 'peer0.org1.example.com',
    'request-timeout': 6000,
    'ssl-target-name-override': 'peer0.org1.example.com'//this config only can be used in develop
};
var peer = fabric_client.newPeer('grpcs://localhost:7051', connectionOpts);
channel.addPeer(peer);

var orderTlsRoots = fs.readFileSync(path.resolve( __dirname, 'crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'),"utf-8");
var orderConnectionOpts = {
    pem: orderTlsRoots,
    name: 'orderer.example.com',
    'request-timeout': 6000,
    'ssl-target-name-override': 'orderer.example.com'//this config only can be used in develop
};
var order = fabric_client.newOrderer('grpcs://localhost:7050', orderConnectionOpts)
channel.addOrderer(order);

	e2eUtils.installChaincodeWithId('org1', 'zctest', CHAINCODE_PATH, METADATA_PATH, version, 'golang', null, true)
	.then(() => {
		console.log('Successfully installed chaincode in peers of organization "org1"');
		return e2eUtils.installChaincodeWithId('org2', 'zctest', CHAINCODE_PATH, METADATA_PATH, version, 'golang', null, true);
	}, (err) => {
		console.log('Failed to install chaincode in peers of organization "org1". ');
		return e2eUtils.installChaincodeWithId('org2', 'zctest', CHAINCODE_PATH, METADATA_PATH, version, 'golang', null, true);
	}).then(() => {
		console.log('Successfully installed chaincode in peers of organization "org2"');
	}, (err) => {
		console.log('Failed to install chaincode in peers of organization "org2". ');
	}).catch((err) => {
		console.log('Test failed due to unexpected reasons. ' + err.stack ? err.stack : err);
	});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
// Fabric_Client.newDefaultKeyValueStore({ path: store_path
// }).then((state_store) => {
//     // assign the store to the fabric client
//     fabric_client.setStateStore(state_store);
//     var crypto_suite = Fabric_Client.newCryptoSuite();
//     // use the same location for the state store (where the users' certificate are kept)
//     // and the crypto store (where the users' keys are kept)
//     var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
//     crypto_suite.setCryptoKeyStore(crypto_store);
//     fabric_client.setCryptoSuite(crypto_suite);
//     var tlsRoots = fs.readFileSync(path.resolve( __dirname, 'crypto-config/peerOrganizations/org1.example.com/msp/cacerts/ca.org1.example.com-cert.pem'),"utf-8");
//     var	tlsOptions = {
//     	trustedRoots: [tlsRoots],
//     	verify: true
//     };
//     // be sure to change the http to https when the CA is running TLS enabled
//     // fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca.org1.example.com', crypto_suite);
//     fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca-org1', crypto_suite);
//     // fabric_ca_client = new Fabric_CA_Client('https://ca.org1.example.com:7054', tlsOptions , 'ca-org1', crypto_suite);

//     // first check to see if the admin is already enrolled
//     return fabric_client.getUserContext('admin', true);
// }).then((user_from_store) => {
//     if (user_from_store && user_from_store.isEnrolled()) {
//         console.error('exec if: ' + user_from_store);
//         console.log('Successfully loaded admin from persistence');
//         admin_user = user_from_store;
//         return null;
//     } else {
//         console.error('exec else: ' + user_from_store);
//         // need to enroll it with CA server
//         return fabric_ca_client.enroll({
//           enrollmentID: 'admin',
//           enrollmentSecret: 'adminpw'
//         }).then((enrollment) => {
//           console.log('Successfully enrolled admin user "admin"');
//           return fabric_client.createUser(
//               {username: 'admin',
//                   mspid: 'Org1MSP',
//                   cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
//               });
//         }).then((user) => {
//           admin_user = user;
//           return fabric_client.setUserContext(admin_user);
//         }).catch((err) => {
//           console.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
//           throw new Error('Failed to enroll admin');
//         });
//     }
// }).then(() => {
//     console.log('Assigned the admin user to the fabric client ::' + admin_user.toString());
//     var params = {
// 		targers: [peer],
// 		org: 'org1',
// 		channelNames: ['mychannel'],
// 		chaincodeId: 'mycc1',
// 		chaincodePath: CHAINCODE_PATH,
// 		chaincodeVersion: '1.0',
// 		chaincodeType: 'golang',
// 		chaincodePackage: ''
// 	};

// // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
// 	fabric_client.installChaincode(params).then((response) => {
// 		console.log(response);
// 	});
// }).catch((err) => {
//     console.error('Failed to enroll admin: ' + err);
// });





































function installChaincode(params) {
	try {
		var org = params.org;
		var client = new Client();
		var channel = client.newChannel(params.channelName);

		let orgName = 'peerOrg1';
		// var caRootsPath = ORGS.orderer.tls_cacerts;
		let data = orderTlsRoots;
		let caroots = Buffer.from(data).toString();
		let tlsInfo = null;

		return functionUtils.tlsEnroll(org)
			.then((enrollment) => {
				t.pass('Successfully retrieved TLS certificate');
				tlsInfo = enrollment;
				client.setTlsClientCertAndKey(tlsInfo.certificate, tlsInfo.key);
				return Client.newDefaultKeyValueStore({ path: testUtil.storePathForOrg(orgName) });
			}).then((store) => {
				client.setStateStore(store);

				// get the peer org's admin required to send install chaincode requests
				return testUtil.getSubmitter(client, t, true /* get peer org admin */, org);
			}).then((admin) => {
				t.pass(params.testDesc + ' - Successfully enrolled user \'admin\'');
				the_user = admin;

				channel.addOrderer(
					client.newOrderer(
						ORGS.orderer.url,
						{
							'pem': caroots,
							'clientCert': tlsInfo.certificate,
							'clientKey': tlsInfo.key,
							'ssl-target-name-override': ORGS.orderer['server-hostname']
						}
					)
				);

				var targets = [];
				for (let key in ORGS[org]) {
					if (ORGS[org].hasOwnProperty(key)) {
						if (key.indexOf('peer') === 0) {
							let data = fs.readFileSync(path.join(__dirname, 'e2e', ORGS[org][key]['tls_cacerts']));
							let peer = client.newPeer(
								ORGS[org][key].requests,
								{
									pem: Buffer.from(data).toString(),
									'clientCert': tlsInfo.certificate,
									'clientKey': tlsInfo.key,
									'ssl-target-name-override': ORGS[org][key]['server-hostname']
								});
							targets.push(peer);
							channel.addPeer(peer);
						}
					}
				}

				// send proposal to endorser
				var request = {
					targets: targets,
					chaincodePath: params.chaincodePath,
					chaincodeId: params.chaincodeId,
					chaincodeVersion: params.chaincodeVersion,
					chaincodePackage: params.chaincodePackage
				};

				return client.installChaincode(request);
			},
				(err) => {
					t.fail(params.testDesc + ' - Failed to enroll user \'admin\'. ' + err);
					throw new Error(params.testDesc + ' - Failed to enroll user \'admin\'. ' + err);
				}).then((results) => {
					var proposalResponses = results[0];

					var proposal = results[1];
					var all_good = true;
					var error = null;
					for (var i in proposalResponses) {
						let one_good = false;
						if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
							one_good = true;
							logger.info(params.testDesc + ' - install proposal was good');
						} else {
							logger.error(params.testDesc + ' - install proposal was bad');
							error = proposalResponses[i];
						}
						all_good = all_good & one_good;
					}
					if (all_good) {
						return 'success';
					} else {
						if (error) {
							return error;
						}
						else return 'fail';
					}
				},
					(err) => {
						return new Error(err.stack ? err.stack : err);
					});
	} catch (err) {
		return Promise.reject(new Error(err.stack ? err.stack : err));
	}
}
