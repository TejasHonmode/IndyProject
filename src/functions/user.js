const indy = require('indy-sdk')
const timestamp = require('timestamp')

const User = require('../models/user')

const localIp = require('local-ip')
const ip = require('ip')

const pool = require('../functions/pool')

const createUserWallet = async (name,id, key) => {
    const user = {
        name: name,
        walletConfig: {id: id},
        walletCredentials: {key: key},
        timestamp: timestamp()
    }
    // console.log(refid.length)
    try {
        await indy.createWallet(user.walletConfig, user.walletCredentials)
    } catch (e) {
        if(e.message !== 'WalletAlreadyExistsError'){
            throw e
        }
    }

    const userWalletHandle = await indy.openWallet(user.walletConfig, user.walletCredentials)
    // console.log('Opened.........')
    
    // const didInfo = {seed: user.seed, timestamp}
    // // console.log(didInfo)
    // const [did, verkey] = await indy.createAndStoreMyDid(userWalletHandle, didInfo)
    // // console.log(did)
    // return {did, verkey, userWalletHandle} 

    return userWalletHandle
}


const createDidKey = async(userWalletHandle, didInfo, info) => {
    console.log('-----IN CREATEDIDKEY-----------------')

    try {
        const [did, verkey] = await indy.createAndStoreMyDid(userWalletHandle, didInfo)
        console.log('----------------DID KEY CREATED--------------------')
    const metadata = JSON.stringify({
        info
    })
    await indy.setDidMetadata(userWalletHandle, did, metadata)
    console.log('--------META DATA CERATED-----------------------')
    return {did, verkey, metadata}
    } catch (e) {
        console.log('ERROR-----------',e)
    }
    
}

const openWallet = async (id, key) => {

    console.log("---{id}, {key}----", id, key);
    try {
        const userWalletHandle = await indy.openWallet(id, key)
        console.log('OPENED ------------------------------------')
        if(!userWalletHandle){
            console.log('No user handle')
        }

        console.log('--userWalletHandle------------', userWalletHandle);
        return userWalletHandle
    } catch (e) {
        console.log('ERROR-------------------------',e)
    }
    

}

const closeWallet = async (userWalletHandle) => {

    try {
        console.log('Hello.....')
        await indy.closeWallet(userWalletHandle)
        console.log('WALLET CLOSED------------------------')
        return "Closed"
    } catch (e) {
        console.log('ERROR----------------',e)
    }
    
    
}


const deleteWallet = async (id, key) => {

    try {
        await indy.deleteWallet(id, key)
        
        return "deleted"
    } catch (e) {
        return e
    }
    
}


const createOrgWallet = async (name,id, key, seed) => {
    const user = {
        name: name,
        walletConfig: {id},
        walletCredentials: {key},
    
        // seed: '0'.repeat(32 - seed.length)+seed,
        timestamp: timestamp()
    }
    // console.log(refid.length)
    try {
        await indy.createWallet(user.walletConfig, user.walletCredentials)
    } catch (e) {
        if(e.message !== 'WalletAlreadyExistsError'){
            throw e
        }
    }

    const userWalletHandle = await indy.openWallet(user.walletConfig, user.walletCredentials)

    
    const didInfo = {seed: user.seed, timestamp}
    // console.log(didInfo)
    const [did, verkey] = await indy.createAndStoreMyDid(userWallet, didInfo)
    // console.log(did)
    return {did, verkey, userWalletHandle} 
}


const connectionOffer = async (did, recipientDid) => {
    return {
        '@id': 'connection-offer',
        did,
        ip: ip.address(),
        // port: process.env.PORT,
        recipientDid: recipientDid
    }
}

const connectionRequest = async (did, recipientDid, userWalletHandle, metadata,role=null) => {
    
    let [newDid, newKey] = await indy.createAndStoreMyDid(userWalletHandle, {})
    await indy.setDidMetadata(userWalletHandle, newDid, metadata)
    console.log('POOL HANDLE,', pool.poolHandle)
    // await pool.sendNym(pool.poolHandle, userWalletHandle, did, newDid, newKey, role)
    
    return {
        did,
        newDid,
        newKey,
        ip: ip.address(),
        recipientDid
    }
}


const createPairwise = async (userWalletHandle, theirDid, myDid, metadata) => {
    
    await indy.createPairwise(userWalletHandle, theirDid, myDid, metadata)
    let pairwise  = await indy.getPairwise(userWalletHandle, theirDid)

    return pairwise
}


const connectionResponse = async (did, recipientDid, userWalletHandle, theirDid, metadata) => {

    let [newDid, newKey] = await indy.createAndStoreMyDid(userWalletHandle, {})
    console.log('Resp DId-Key created')
    await indy.setDidMetadata(userWalletHandle, newDid, metadata)
    console.log('Resp new Did meta data set')
    let pairwise = await createPairwise(userWalletHandle, theirDid, did, metadata)
    console.log('Pairwise is ', pairwise)
    return {
        did,
        newDid,
        newKey,
        ip: ip.address(),
        recipientDid, 
        pairwise
    }
}

const connectionAcknowledgement = async(userWalletHandle, did, theirDid, metadata, role=null) => {

    // await pool.sendNym(pool.poolHandle, userWalletHandle, did, newDid, newKey, role)

    let pairwise = await createPairwise(userWalletHandle, theirDid, did, metadata)

    return {
        did,
        msg: 'Connected.....YAY UwU!!!', 
        pairwise
    }

}





const createDidInfo = async (did, key, fromToKey) => {

    return {
        did: did,
        key: key,
        fromToKey
    }
}


module.exports = {createUserWallet, createOrgWallet, openWallet, closeWallet, deleteWallet, createDidKey, connectionOffer, connectionRequest, connectionResponse, connectionAcknowledgement,createPairwise}