#!/bin/bash

CHANNEL_NAME=mychannel
DELAY="3"
TIMEOUT="10"

PEER=0
ORG=${2:-3}
echo org$ORG

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
PEER0_ORG1_TLS=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${ORG}.example.com/peers/peer${PEER}.org${ORG}.example.com/tls/ca.crt
CC_SRC_PATH="github.com/chaincode/chaincode_example02/go/"


invokeChaincode() {
  VERSION=${3:-1.0}


    set -x
    peer chaincode invoke -o orderer.example.com:7050 --tls true --cafile $ORDERER_CA -C $CHANNEL_NAME -n mycc --peerAddresses peer${PEER}.org${ORG}.example.com:7051 --tlsRootCertFiles $PEER0_ORG1_TLS -c '{"Args":["invoke","b","a","20"]}' >&log.txt
    res=$?
    set +x

  cat log.txt
  verifyResult $res "Chaincode INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode mycc is INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' ===================== "
  echo
}


if [[ "$1" == "invoke" ]]; then	
	#statements
	echo "-------调用链码-------"
	invokeChaincode
fi


sleep $DELAY
echo "-------查询测试--------"
peer chaincode query -C $CHANNEL_NAME -n mycc -c '{"Args":["query","a"]}'
