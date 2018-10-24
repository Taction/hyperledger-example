#!/bin/bash

CHANNEL_NAME=mychannel
DELAY="3"
TIMEOUT="10"

PEER=0
ORG=1

ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
PEER0_ORG1_TLS=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${ORG}.example.com/peers/peer${PEER}.org${ORG}.example.com/tls/ca.crt
CC_SRC_PATH="github.com/chaincode/chaincode_example02/go/"

# verify the result of the end-to-end test
verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo "========= ERROR !!! FAILED to execute End-2-End Scenario ==========="
    echo
    exit 1
  fi
}

createChannel() {
	set -x
	peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&log.txt
	res=$?
	set +x

	cat log.txt
	verifyResult $res "Channel creation failed"
	echo "===================== Channel '$CHANNEL_NAME' created ===================== "
	echo
}

## Sometimes Join takes time hence RETRY at least 5 times
joinChannelWithRetry() {
  set -x
  peer channel join -b $CHANNEL_NAME.block >&log.txt
  res=$?
  set +x
  cat log.txt
  if [ $res -ne 0 -a $COUNTER -lt $MAX_RETRY ]; then
    COUNTER=$(expr $COUNTER + 1)
    echo "peer${PEER}.org${ORG} failed to join the channel, Retry after $DELAY seconds"
    sleep $DELAY
    joinChannelWithRetry
  else
    COUNTER=1
  fi
  verifyResult $res "After $MAX_RETRY attempts, peer${PEER}.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

joinChannel () {

	joinChannelWithRetry 0 1
	echo "===================== peer joined channel '$CHANNEL_NAME' ===================== "
	sleep $DELAY
	echo
}

updateAnchorPeers() {

    set -x
    peer channel update -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/${CORE_PEER_LOCALMSPID}anchors.tx --tls --cafile $ORDERER_CA >&log.txt
    res=$?
    set +x

  cat log.txt
  verifyResult $res "Anchor peer update failed"
  echo "===================== Anchor peers updated for org '$CORE_PEER_LOCALMSPID' on channel '$CHANNEL_NAME' ===================== "
  sleep $DELAY
  echo
}

installChaincode() {

  VERSION=${3:-1.0}
  set -x
  peer chaincode install -n mycc -v ${VERSION} -l golang -p ${CC_SRC_PATH} >&log.txt
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
    peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n mycc -v 1.0 -c '{"Args":["init","a", "100", "b","200"]}' -P "OR ('Org1MSP.peer','Org2MSP.peer','Org3MSP.peer','Org4MSP.peer')" >&log.txt
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
    peer chaincode invoke -o orderer.example.com:7050 --tls true --cafile $ORDERER_CA -C $CHANNEL_NAME -n mycc --peerAddresses peer${PEER}.org${ORG}.example.com:7051 --tlsRootCertFiles $PEER0_ORG1_TLS -c '{"Args":["invoke","a","b","10"]}' >&log.txt
    res=$?
    set +x

  cat log.txt
  verifyResult $res "Chaincode INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode mycc is INVOKE on peer${PEER}.org${ORG} on channel '$CHANNEL_NAME' ===================== "
  echo
}

sleep $DELAY
sleep $DELAY

echo "-------开始创建通道-------"
createChannel

echo "-------节点加入通道-------"
joinChannel

echo "-------更新锚节点-------"
updateAnchorPeers

echo "-------安装链码-------"
installChaincode

echo "-------初始化链码-------"
instantiateChaincode

echo "-------调用链码-------"
invokeChaincode

sleep $DELAY
echo "-------查询测试--------"
peer chaincode query -C $CHANNEL_NAME -n mycc -c '{"Args":["query","a"]}'
