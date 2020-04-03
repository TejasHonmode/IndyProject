const indy = require('indy-sdk')
const credentialFunc = require('../functions/credentials')

// const pool_ = {}
let poolHandle = 0;
const poolCreation = async (poolName) => {
    let poolConfig = {
        "genesis_txn": '/home/tejas/Desktop/INDY_PROJECT/genesis-pool-config-file.txn'
    }

    try {
        await indy.createPoolLedgerConfig(poolName, poolConfig)
    } catch (error) {
        if(error.message !== "PoolLedgerConfigAlreadyExistsError"){
            throw error
        }
    }
        
    await indy.setProtocolVersion(2)

    poolHandle = await indy.openPoolLedger(poolName)
    
    return poolHandle
}

const sendNym = async (poolHandle, walletHandle, Did, newDid, newKey, role=null) => {
    console.log('NYM ARGS ------------------->',poolHandle, walletHandle, Did, newDid, newKey, role)
    let nymRequest = await indy.buildNymRequest(Did, newDid, newKey, null, role);
    console.log('Nym Request--------------------------->', nymRequest)
    let response = await indy.signAndSubmitRequest(poolHandle, walletHandle, Did, nymRequest);
    console.log('Nym response----------------------------->', response)
    return {role, msg: 'nym request sent'}
}



async function proverGetEntitiesFromLedger(poolHandle, did, identifiers, actor) {
    let schemas = {};
    let credDefs = {};
    let revStates = {};

    for(let referent of Object.keys(identifiers)) {
        let item = identifiers[referent];
        console.log(`\"${actor}\" -> Get Schema from Ledger`);
        // receivedSchemaId, receivedSchema
        console.log('ITEM---------------------->', item)
        let receivedSchema = await credentialFunc.getSchema(did, item['schema_id'], poolHandle);
        schemas[receivedSchema.schemaId] = receivedSchema.schema;

        console.log(`\"${actor}\" -> Get Claim Definition from Ledger`);
        // [receivedCredDefId, receivedCredDef]
        let receivedCredDef = await credentialFunc.getCredDef(poolHandle, did, item['cred_def_id']);
        credDefs[receivedCredDef.credDefId] = receivedCredDef.credDef;

        if (item.rev_reg_seq_no) {
            // TODO Create Revocation States
        }
    }

    return [schemas, credDefs, revStates];
}


async function verifierGetEntitiesFromLedger(poolHandle, did, identifiers, actor) {
    let schemas = {};
    let credDefs = {};
    let revRegDefs = {};
    let revRegs = {};

    for(let referent of Object.keys(identifiers)) {
        let item = identifiers[referent];
        console.log(`"${actor}" -> Get Schema from Ledger`);
        // [receivedSchemaId, receivedSchema]
        let receivedSchema = await credentialFunc.getSchema(did, item['schema_id'], poolHandle);
        schemas[receivedSchema.schemaId] = receivedSchema.schema;

        console.log(`"${actor}" -> Get Claim Definition from Ledger`);
        // [receivedCredDefId, receivedCredDef]
        let receivedCredDef = await credentialFunc.getCredDef(poolHandle, did, item['cred_def_id']);
        credDefs[receivedCredDef.credDefId] = receivedCredDef.credDef;

        if (item.rev_reg_seq_no) {
            // TODO Get Revocation Definitions and Revocation Registries
        }
    }

    return [schemas, credDefs, revRegDefs, revRegs];
}


// const createUserWallet = async (name,id, key, refid) => {
//     const user = {
//         name,
//         walletConfig: json.dumps({id}),
//         walletCredentials: json.dumps({key}),
//         pool: poolHandle,
//         seed: '0'*(32 - refid.length)+refid
//     }

//     try {
//         await indy.createWallet(user.walletconfig, user.wallet_credentials)
//     } catch (e) {
//         if(e.message !== 'WalletAlreadyExistsError'){
//             throw e
//         }
//     }

//     let userWallet = await indy.openWallet(user.walletConfig, user.walletCredentials)

//     let didInfo = {seed: user.seed}

//     [did, verkey] = indy.createAndStoreMyDid(userWallet, didInfo)

//     return [did, verkey]
// }

module.exports = {poolCreation, sendNym, poolHandle, proverGetEntitiesFromLedger, verifierGetEntitiesFromLedger}