/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

var path = require('path');
var fs = require('fs-extra');
var util = require('util');


var Client = require('fabric-client');
var copService = require('fabric-ca-client/lib/FabricCAClientImpl.js');
var User = require('fabric-client/lib/User.js');

var store_path = path.join(__dirname, 'hfc-key-store');

//temp dir need less
var os = require('os');
var path = require('path');
var tempdir = path.join(os.tmpdir(), 'hfc');

var logger = require('fabric-client/lib/utils.js').getLogger('TestUtil');

module.exports.CHAINCODE_PATH = 'github.com/example_cc';
module.exports.CHAINCODE_UPGRADE_PATH = 'github.com/example_cc1';
module.exports.CHAINCODE_UPGRADE_PATH_V2 = 'github.com/example_cc2';
module.exports.CHAINCODE_PATH_PRIVATE_DATA = 'github.com/example_cc_private';

module.exports.END2END = {
	channel: 'mychannel',
	chaincodeId: 'end2endnodesdk',
	chaincodeIdPrivateData: 'end2endnodesdk_privatedata',
	chaincodeVersion: 'v0'
};

module.exports.NODE_CHAINCODE_PATH = path.resolve(__dirname, '../fixtures/src/node_cc/example_cc');
module.exports.NODE_CHAINCODE_UPGRADE_PATH = path.resolve(__dirname, '../fixtures/src/node_cc/example_cc1');
module.exports.NODE_CHAINCODE_UPGRADE_PATH_V2 = path.resolve(__dirname, '../fixtures/src/node_cc/example_cc2');
module.exports.METADATA_PATH = path.resolve(__dirname, '../fixtures/metadata');
module.exports.METADATA_PATH_PRIVATE_DATA = path.resolve(__dirname, '../fixtures/src/github.com/example_cc_private/META-INF');
module.exports.COLLECTIONS_CONFIG_PATH = path.resolve(__dirname, '../fixtures/src/github.com/example_cc_private/collections_config.json');

module.exports.NODE_END2END = {
	channel: 'mychannel',
	chaincodeId: 'e2enodecc',
	chaincodeLanguage: 'node',
	chaincodeVersion: 'v0'
};

// all temporary files and directories are created under here
// var tempdir = Constants.tempdir;

logger.info(util.format(
	'\n\n*******************************************************************************' +
	'\n*******************************************************************************' +
	'\n*                                          ' +
	'\n* Using temp dir: %s' +
	'\n*                                          ' +
	'\n*******************************************************************************' +
	'\n*******************************************************************************\n', tempdir));

module.exports.getTempDir = function() {
	fs.ensureDirSync(tempdir);
	return tempdir;
};

// directory for file based KeyValueStore
// module.exports.KVS = path.join(tempdir, 'hfc-test-kvs');
module.exports.storePathForOrg = function(org) {
	return store_path;
};

// temporarily set $GOPATH to the test fixture folder
module.exports.setupChaincodeDeploy = function() {
	process.env.GOPATH = path.join(__dirname, '../fixtures');
};

// specifically set the values to defaults because they may have been overridden when
// running in the overall test bucket ('gulp test')
module.exports.resetDefaults = function() {
	global.hfc.config = undefined;
	require('nconf').reset();
};

module.exports.cleanupDir = function(keyValStorePath) {
	var absPath = path.join(process.cwd(), keyValStorePath);
	var exists = module.exports.existsSync(absPath);
	if (exists) {
		fs.removeSync(absPath);
	}
};

module.exports.getUniqueVersion = function(prefix) {
	if (!prefix) prefix = 'v';
	return prefix + Date.now();
};

// utility function to check if directory or file exists
// uses entire / absolute path from root
module.exports.existsSync = function(absolutePath /*string*/) {
	try  {
		var stat = fs.statSync(absolutePath);
		if (stat.isDirectory() || stat.isFile()) {
			return true;
		} else
			return false;
	}
	catch (e) {
		return false;
	}
};

// module.exports.readFile = readFile;

Client.addConfigFile(path.join(__dirname, 'config.json'));
var ORGS = Client.getConfigSetting('test-network');

var	tlsOptions = {
	trustedRoots: [],
	verify: false
};

function getMember(username, password, client, userOrg) {
	var caUrl = ORGS[userOrg].ca.url;

	return client.getUserContext(username, true)
		.then((user) => {
			// eslint-disable-next-line no-unused-vars
			return new Promise((resolve, reject) => {
				if (user && user.isEnrolled()) {
					return resolve(user);
				}

				var member = new User(username);
				var cryptoSuite = client.getCryptoSuite();
				if (!cryptoSuite) {
					cryptoSuite = Client.newCryptoSuite();
					if (userOrg) {
						cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: module.exports.storePathForOrg(ORGS[userOrg].name)}));
						client.setCryptoSuite(cryptoSuite);
					}
				}
				member.setCryptoSuite(cryptoSuite);

				// need to enroll it with CA server
				var cop = new copService(caUrl, tlsOptions, ORGS[userOrg].ca.name, cryptoSuite);

				return cop.enroll({
					enrollmentID: username,
					enrollmentSecret: password
				}).then((enrollment) => {
					

					return member.setEnrollment(enrollment.key, enrollment.certificate, ORGS[userOrg].mspid);
				}).then(() => {
					var skipPersistence = false;
					if (!client.getStateStore()) {
						skipPersistence = true;
					}
					return client.setUserContext(member, skipPersistence);
				}).then(() => {
					return resolve(member);
				}).catch((err) => {
					console.log('Failed to enroll and persist user. Error: ' + err.stack ? err.stack : err);
				});
			});
		});
}

module.exports.setAdmin = function(client, userOrg) {
	return getAdmin(client, userOrg);
};

function getAdmin(client, userOrg) {
	console.log("getAdmin userOrg " + userOrg )
	var keyPath = path.join(__dirname, util.format('crypto-config/peerOrganizations/%s.example.com/users/Admin@%s.example.com/msp/keystore', userOrg, userOrg));
	var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
	var certPath = path.join(__dirname, util.format('crypto-config/peerOrganizations/%s.example.com/users/Admin@%s.example.com/msp/signcerts', userOrg, userOrg));
	var certPEM = readAllFiles(certPath)[0];

	var cryptoSuite = Client.newCryptoSuite();
	if (userOrg) {
		cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: store_path}));
		client.setCryptoSuite(cryptoSuite);
	}

	return Promise.resolve(client.createUser({
		username: 'peer'+userOrg+'Admin',
		mspid: ORGS[userOrg].mspid,
		cryptoContent: {
			privateKeyPEM: keyPEM.toString(),
			signedCertPEM: certPEM.toString()
		}
	}));
}

function getCryptoSuite() {
	var store_path = path.join(__dirname, 'hfc-key-store');
	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
	    // assign the store to the fabric client
	    fabric_client.setStateStore(state_store);
	    var crypto_suite = Fabric_Client.newCryptoSuite();
	    // use the same location for the state store (where the users' certificate are kept)
	    // and the crypto store (where the users' keys are kept)
	    var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	    crypto_suite.setCryptoKeyStore(crypto_store);
	    fabric_client.setCryptoSuite(crypto_suite);
	    var tlsRoots = fs.readFileSync(path.resolve( __dirname, 'crypto-config/peerOrganizations/org1.example.com/msp/cacerts/ca.org1.example.com-cert.pem'),"utf-8");
	    var	tlsOptions = {
	    	trustedRoots: [tlsRoots],
	    	verify: true
	    };
	    // be sure to change the http to https when the CA is running TLS enabled
	    // fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca.org1.example.com', crypto_suite);
	    fabric_ca_client = new Fabric_CA_Client('https://localhost:7054', tlsOptions , 'ca-org1', crypto_suite);
	    // fabric_ca_client = new Fabric_CA_Client('https://ca.org1.example.com:7054', tlsOptions , 'ca-org1', crypto_suite);

	    // first check to see if the admin is already enrolled
	    return fabric_client.getUserContext('admin', true);
	})
}

module.exports.getSubmitter = function(client, peerOrgAdmin, org) {
	console.log("getSubmitter " + client + peerOrgAdmin + org);
	if (arguments.length < 2) throw new Error('"client" and "test" are both required parameters');

	var peerAdmin, userOrg;
	if (typeof peerOrgAdmin === 'boolean') {
		peerAdmin = peerOrgAdmin;
	} else {
		peerAdmin = false;
	}

	// if the 3rd argument was skipped
	if (typeof peerOrgAdmin === 'string') {
		userOrg = peerOrgAdmin;
	} else {
		if (typeof org === 'string') {
			userOrg = org;
		} else {
			userOrg = 'org1';
		}
	}

	if (peerAdmin) {
		return getAdmin(client, userOrg);
	} else {
		return getMember('admin', 'adminpw', client, userOrg);
	}
};

function readAllFiles(dir) {
	var files = fs.readdirSync(dir);
	var certs = [];
	files.forEach((file_name) => {
		let file_path = path.join(dir,file_name);
		logger.debug(' looking at file ::'+file_path);
		let data = fs.readFileSync(file_path);
		certs.push(data);
	});
	return certs;
}
