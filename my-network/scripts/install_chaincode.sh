#!/bin/bash

CHANNEL_NAME=mychannel
DELAY="3"
TIMEOUT="10"

PEER=0
ORG=${2:-3}

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
PEER0_ORG1_TLS=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${ORG}.example.com/peers/peer${PEER}.org${ORG}.example.com/tls/ca.crt
CHAINCODE_PATH="github.com/chaincode/fabcar/go/"
CHAINCODE_NAME=fabcar


function printHelp() {
  echo "Usage: "
  echo "  install_chaincode.sh <mode> [ <ORG>] "
  echo "    <mode> - one of 'init', 'invoke', 'install'"
  echo "      - 'init' - install instantiate invoke"
  echo "      - 'invoke' - "
  echo "      - 'install' - "
}

# verify the result of the end-to-end test
verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo "========= ERROR !!! FAILED to execute End-2-End Scenario ==========="
    echo
    exit 1
  fi
}


installChaincode() {

  VERSION=${3:-1.0}
  set -x
  peer chaincode install -n ${CHAINCODE_NAME} -v ${VERSION} -l golang -p ${CHAINCODE_PATH} >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode installation on peer${PEER}.org${ORG} has failed"
  echo "===================== Chaincode is installed on peer${PEER}.org${ORG} ===================== "
  echo
}

instantiateChaincode() {
  VERSION=${3:-1.0}


    set -x
    peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n ${CHAINCODE_NAME} -v 1.0 -c '{"Args":["init",""]}' -P "OR ('Org1MSP.member', AND ('Org2MSP.member','Org3MSP.member'))" >&log.txt
    res=$?
    set +x

  cat log.txt
  verifyResult $res "Chaincode instantiation on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode is instantiated on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' ===================== "
  echo
}

invokeChaincode() {
  VERSION=${3:-1.0}


    set -x
    peer chaincode invoke -o orderer.example.com:7050 --tls true --cafile $ORDERER_CA -C $CHANNEL_NAME -n ${CHAINCODE_NAME} --peerAddresses peer${PEER}.org${ORG}.example.com:7051 --tlsRootCertFiles $PEER0_ORG1_TLS -c '{"function":"initLedger","Args":[""]}' >&log.txt
    res=$?
    set +x

  cat log.txt
  verifyResult $res "Chaincode INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode ${CHAINCODE_NAME} is INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' ===================== "
  echo
}

sleep $DELAY
if [[ "$1" == "install" ]]; then
  #statements
  echo "-------安装链码-------"
  installChaincode
fi
if [[ "$1" == "invoke" ]]; then
  #statements
  echo "-------调用链码-------"
  invokeChaincode
fi
if [[ "$1" == "init" ]]; then
  #statements
  echo "-------安装链码-------"
  installChaincode
  echo "-------初始化链码-------"
  instantiateChaincode

  echo "-------调用链码-------"
  invokeChaincode
fi

sleep $DELAY
echo "-------查询测试--------"
peer chaincode query -C $CHANNEL_NAME -n ${CHAINCODE_NAME} -c '{"Args":["queryAllCars"]}'
