const indy = require('indy-sdk')
const pool = require('./pool')
const encryption = require('../functions/encryption')


const sendSchema = async (poolHandle, issuerWallet, issuerDid, credentialSchema) => {
    console.log(poolHandle, issuerWallet, issuerDid, credentialSchema);
    
    let schemaRequest = await indy.buildSchemaRequest(issuerDid, credentialSchema)
    console.log('req---------', schemaRequest);
    console.log('-----------')
    console.log(schemaRequest.operation.data.attr_names);
    
    let response = await indy.signAndSubmitRequest(poolHandle, issuerWallet, issuerDid, schemaRequest)
    console.log('SCHEMA SENT ---------------->', response);
    
    return {schema:credentialSchema.name, msg:'Schema sent'}
}


const getSchema = async(issuerDid, credentialSchemaId, poolHandle) => {
    
    console.log('ARGS IN GET SCHEMA---------- >');
    console.log(issuerDid, credentialSchemaId, poolHandle);

    let getSchemaRequest = await indy.buildGetSchemaRequest(issuerDid, credentialSchemaId)
    console.log(' get Schema reqt', getSchemaRequest);
    
    let getSchemaResponse = await indy.submitRequest(poolHandle, getSchemaRequest);
    console.log('get schema response', getSchemaResponse);

    

    let [schemaId, schema] = await indy.parseGetSchemaResponse(getSchemaResponse);
    console.log('GOT SCHEMA---------->',schema);
    
    return {schemaId, schema}
}



const createSchema = async (issuerDid, nameOfSchema, attrNames, version='1.0') => {
    console.log('In create schema func --------------->');
    console.log(issuerDid, nameOfSchema, version, attrNames)
    let [schemaId, schema] = await indy.issuerCreateSchema(issuerDid, nameOfSchema, version, attrNames)
    console.log('SCHEMA CREATED-------->', schema)
    return {schemaId, schema}
}



const sendCredDef = async (poolHandle, issuerWallet, issuerDid, credDef) => {
    console.log('SEND CRED DEF ARGS----------------------------->')
    console.log(poolHandle, issuerWallet, issuerDid, credDef);
    
    let credDefRequest = await indy.buildCredDefRequest(issuerDid, credDef)
    console.log('CRED REQUEST------------------>', credDefRequest);
    
    let response = await indy.signAndSubmitRequest(poolHandle, issuerWallet, issuerDid, credDefRequest)
    console.log('Cred def sent--------->', response)
    return {credDef, msg:'CredDef Sent'}
}


const getCredDef = async (poolHandle, issuerDid, id) => {
    console.log('-------------------------------------IN GET CRED DEF FUNC-----------------------------------------------------------');
    
    console.log('GET CRED DEF ARGS------------------------------->');
    console.log(poolHandle, issuerDid, id);
    
    
    let getCredDefRequest = await indy.buildGetCredDefRequest(issuerDid, id)
    console.log('GET CRED DEF REQUEST---------------------------->', getCredDefRequest);
    
    let getCredDefResponse = await indy.submitRequest(poolHandle, getCredDefRequest)
    console.log('GET CRED DEF RESP----------------------------------->', getCredDefResponse);
    
    let [credDefId, credDef] = await indy.parseGetCredDefResponse(getCredDefResponse)
    console.log('CRED DEF ID IN GET CRED DEF FUNC----------------------------->',credDefId);
    console.log('CRED DEF IN GET CRED DEF FUNC------------------------------>', credDef);
    

    console.log('----------------------------------------OUT OF GET CRED DEF FUNC----------------------------------------------------------');
    


    return {credDefId, credDef}
}


const createCredDef = async(issuerWallet, issuerDid, credentialSchema, tag='TAG1', type='CL', config='{"support_revocation": false}') => {
    console.log('--------------------------------------IN CREATE CRED DEF FUNC-------------------------------------');

    console.log('CREATE CRED DEF ARGS---------------------------->')
    console.log(issuerWallet, issuerDid, credentialSchema, tag, type, config);
    
    let [credDefId, credDef] = await indy.issuerCreateAndStoreCredentialDef(issuerWallet, issuerDid, credentialSchema, tag, type, config)
    console.log('cred def created--------------->');
    console.log('cred def id --------------------------->', credDefId);
    console.log('credDef----------------------->', credDef);
    
    console.log('--------------------------------------OUT OF CREATE CRED DEF FUNC-------------------------------------');
    
    
    return {credDefId, credDef}
}


const createCredentialOffer = async(userWalletHandle, credDefId, senderVk, recipientVk) => {
    console.log('CREATE CREDENTIAL OFFER ARGS -------------------------------->', userWalletHandle, credDefId, senderVk, recipientVk);
    
    let offer = await indy.issuerCreateCredentialOffer(userWalletHandle, credDefId)
    console.log('OFFER________________>',offer)

    let authCryptOffer = await encryption.authCrypt(userWalletHandle,senderVk, recipientVk, offer)
    console.log('AUTH CRYPT OFFER------------------------>', authCryptOffer);
    
    return authCryptOffer
} 

const createMasterSecret = async(userWalletHandle) => {

    let masterSecretId = await indy.proverCreateMasterSecret(userWalletHandle, null)
    return masterSecretId
}


const createCredentialRequest = async(userWalletHandle, proverPairwiseDid, authDecryptOfferJSON, credDef, masterSecretId) => {

    let [requestJSON, requestMetadataJSON] = await indy.proverCreateCredentialReq(userWalletHandle, proverPairwiseDid, authDecryptOfferJSON, credDef, masterSecretId)
    return {requestJSON, requestMetadataJSON}
}


const createCredential = async(userWalletHandle, credOffer, credReq, credValues) => {

    let [credJSON] = await indy.issuerCreateCredential(userWalletHandle, credOffer, credReq, credValues, null, -1)

    return [credJSON]
}

const storeCredential = async(userWalletHandle, credReqMetadataJSON, decryptCredJson, credDef) => {

    let outSchemaId = await indy.proverStoreCredential(userWalletHandle, null, credReqMetadataJSON, decryptCredJson, credDef, null)

    return outSchemaId
}


const getCredentials = async(userWalletHandle, filter=null) => {

    let credentials = await indy.proverGetCredentials(userWalletHandle, filter)
    return credentials
}

module.exports = {sendSchema, getSchema, createSchema, sendCredDef, getCredDef, createCredDef, createCredentialOffer, createMasterSecret, createCredentialRequest, createCredential, storeCredential, getCredentials}

