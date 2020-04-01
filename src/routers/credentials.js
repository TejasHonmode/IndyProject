const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const User = require('../models/user')
const CredentialSchema = require('../models/credentialSchema')
const credentialsFunc = require('../functions/credentials')
const pool = require('../functions/pool')
const DidKeyPair = require('../models/didKeyPair')
const CredentialDefinition = require('../models/credentialDefinition')
const Sample = require('../models/sample')
const bson = require('bson')
const indy = require('indy-sdk')
const userFuncs = require('../functions/user')
const CredentialOffer = require('../models/credentialOffer')
const encryption = require('../functions/encryption')
const CredentialRequest = require('../models/credentialRequest')
const utf8 = require('utf8')
const CredentialOfferJson = require('../models/credentialOfferJson')
const Credential = require('../models/credSchema')
const CredentialReqMetadataJson = require('../models/credentialRequestMetadataJson')


router.post('/createSchema', auth, async(req, res) => {


    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    
    console.log('SCHEMA ME DID------->', me.did);
    
    
    try {
        console.log('IN SCHEMA TRY');
        let attrNames = req.body.attrNames.split(' ')
        console.log('ATTRIBUTES------->', attrNames)
        let schemaInfo = await credentialsFunc.createSchema(me.did, req.body.name, attrNames)
        console.log('SCHEMA INFO---------------------->', schemaInfo)

        let sentSchemaInfo = await credentialsFunc.sendSchema(pool.poolHandle, req.user.userWalletHandle, me.did, schemaInfo.schema)

        let Schema = new CredentialSchema({
            ver: schemaInfo.schema.ver,
            id: schemaInfo.schemaId,
            name: schemaInfo.schema.name,
            version: schemaInfo.schema.version,
            // attrNames: schemaInfo.schema.attrNames,
            attrNames: req.body.attrNames,
            seqNo: schemaInfo.schema.seqNo,
            // ...schemaInfo.schema,
            did: me.did,
            owner: req.user._id
        })

        

        await Schema.save()
        res.send({schemaInfo, sentSchemaInfo})
    } catch (e) {
        res.send(e)        
    }
})

router.post('/getSchema', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    
    let getSchemaInfo = await CredentialSchema.findOne({name:req.body.name})
    console.log('SCHEMA ---------------> ', getSchemaInfo);
        
    // else{
    //     let schema = await CredentialSchema.findOne({id:req.body.id})
    // }
    
    
    try {
        console.log('schema id ----------->', getSchemaInfo.id)
        let schema = await credentialsFunc.getSchema(me.did, getSchemaInfo.id, pool.poolHandle)
        console.log('SCHEMA INFO -------------------->',schema)
        res.send({schema})
    } catch (e) {
        res.send(e)
    }
})

router.post('/createCredDef', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID----------->', me.did)
    let schemaInfo = await CredentialSchema.findOne({name: req.body.name})
    // if(req.body.name){
    //     let schemaInfo = await CredentialSchema.findOne({name})
    // }
    // if()
    let schema = await credentialsFunc.getSchema( me.did, schemaInfo.id, pool.poolHandle)
    console.log('SCHEMA----------------->', schema);
    
    let credDefInfo = await credentialsFunc.createCredDef(req.user.userWalletHandle, me.did, schema.schema)
    console.log('CRED DEF CREATED------------------->', credDefInfo);
    
    let  sentCredDefInfo = await credentialsFunc.sendCredDef(pool.poolHandle, req.user.userWalletHandle, me.did, credDefInfo.credDef)
    console.log('CREDDEF SENT--------------->', sentCredDefInfo);
    
    try {
        let credDef = new CredentialDefinition({
            ver: credDefInfo.credDef.ver,
            id: credDefInfo.credDefId,
            schemaName: req.body.name,
            schemaId: schemaInfo.id,
            owner: req.user._id
        })
        await credDef.save()
        res.send({credDefInfo, sentCredDefInfo})
    } catch (e) {
        res.send(e)
    }
    
})

router.post('/getCredDef', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID----------->', me.did);
    
    try {

        if(req.body.credDefId){
            let credDef = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDefId)
            console.log('CRED DEF---------------------------->', credDef);
            
        }else{
            let credDefInfo = await CredentialDefinition.findOne({schemaName: req.body.name})
            console.log('CRED DEF INFO------------------------->', credDefInfo);
            
            let credDef = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDefInfo.id)
            console.log('CRED DEF ---------------------------->', credDef);
            return res.send(credDef)   
        }
    } catch (e) {
        res.send(e)
    }
})


router.post('/createCredentialOffer', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------->', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    try {
        let credDefInfo = await CredentialDefinition.findOne({schemaName: req.body.name})
        console.log('CRED DEF INFO----------------------------------------->', credDefInfo);
        
        let authCryptOffer = await credentialsFunc.createCredentialOffer(req.user.userWalletHandle, credDefInfo.id, mePairwise.verkey, forMePairwise.verkey)
        console.log('AUTHCRYPT OFFER---------------------------------------------->', authCryptOffer);
        
        let credOffer = new CredentialOffer({
            did: me.did,
            message: authCryptOffer,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await credOffer.save()

        res.send({authCryptOffer})
    } catch (e) {
        res.send(e)
    }
    
})


router.get('/pendingCredentialOffer', auth,async(req, res) => {

    try {
        let me = await DidKeyPair.findOne({owner: req.user._id, public: true})

        let pendingOffer = await CredentialOffer.findOne({recipientDid: me.did, acknowledged: false})

        res.send(pendingOffer)
    } catch (e) {
        res.send(e)
    }
    

})

router.post('/createCredentialRequest', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------------------>', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    let offerUpdate = await CredentialOffer.updateOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
    console.log('OFFER UPDATED-------------------------------------------->', offerUpdate)

    let offer = await CredentialOffer.findOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: true})
    console.log('OFFER--------------------------------------->', offer);

    try {
        let verkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, mePairwise.did)
        console.log('VERKEY -------------------------------------------------->', verkey);
        
        let [senderVerkey, offerJSON, decryptedOffer] = await encryption.authDecrypt(req.user.userWalletHandle, verkey, offer.message)
        console.log('AFTER DECRYPTION-------------------------------------------------->');
        console.log(senderVerkey, offerJSON, decryptedOffer);
        
        
        let masterSecretId = await credentialsFunc.createMasterSecret(req.user.userWalletHandle)
        console.log('MASTER SECRET------------------------------------>', masterSecretId);
        
        let credDefInfo = await credentialsFunc.getCredDef(pool.poolHandle, mePairwise.did, decryptedOffer.cred_def_id)
        console.log('CREDDEFINFO------------------------------------------>', credDefInfo);
        
        let credentialRequestInfo = await credentialsFunc.createCredentialRequest(req.user.userWalletHandle, mePairwise.did, offerJSON, credDefInfo.credDef, masterSecretId)
        console.log('CRED REQ INFO--------------------------------------------->', credentialRequestInfo);

        let authCryptReq = await encryption.authCrypt(req.user.userWalletHandle, mePairwise.verkey, forMePairwise.verkey, credentialRequestInfo.requestJSON)
        console.log('AUTHCRYPT REQ---------------------------------------------->', authCryptReq);
        

        let credentialRequest = new CredentialRequest({
            did: me.did,
            message: authCryptReq,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await credentialRequest.save()

        let offerjson = new CredentialOfferJson({
            did: req.body.recipientDid,
            message: offerJSON,
            recipientDid: me.did,
            owner: offer.owner
        })

        await offerjson.save()

        let credReqMetadataJSON = new CredentialReqMetadataJson({
            did: me.did,
            message: JSON.stringify(credentialRequestInfo.requestMetadataJSON),
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await credReqMetadataJSON.save()

        res.send({offerJSON, decryptedOffer, credDefInfo, credentialRequestInfo, credentialRequest, offerjson, credReqMetadataJSON})
    } catch (e) {
        res.send(e)
    }
    

})


router.post('/createCredential', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------------------------------->', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    let offerjson = await CredentialOfferJson.findOne({did: me.did, recipientDid: req.body.recipientDid, owner: req.user._id})
    console.log('OFFER JSON--------------------------------------------------------------------->', offerjson);
    
    // let offerJSON = await utf8.decode(offerjson.message)

    let credValues = req.body.credValues
    console.log(credValues);
    
    try {

        let reqUpdate = await CredentialRequest.updateOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
        console.log('REQUPDATE---------------------------------------------->', reqUpdate);
        
        let request = await CredentialRequest.findOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: true})
        console.log('REQUEST----------------------------------------------------->', request);
        
        let [senderVerkey, decryptRequestJSON] = await encryption.authDecrypt(req.user.userWalletHandle, mePairwise.verkey, request.message)
        console.log('SENDER VERKEY------------------------------------------------------>', senderVerkey);
        console.log('DECRYPT REQUEST JSON--------------------------------------------->', decryptRequestJSON);
        
        
        let [credJSON] = await credentialsFunc.createCredential(req.user.userWalletHandle, offerjson.message, decryptRequestJSON, credValues)
        console.log('CREDJSON------------------------------------------------------------------>', credJSON);
        

        let authCryptCredJSON = await encryption.authCrypt(req.user.userWalletHandle, mePairwise.verkey, forMePairwise.verkey, credJSON)
        console.log('AUTHCRYPTCRED JSON-------------------------------------------------------->', authCryptCredJSON);
        
        let credential = new Credential({
            did: me.did,
            message: authCryptCredJSON,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await credential.save()

        res.send({offerJSON, credValues, request, decryptRequestJSON, credJSON, authCryptCredJSON, credential})

    } catch (e) {
        res.send(e)
    }
    
})


router.get('/storeCredential', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID---------------------------------------------->', me.did);
    
    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);


    try {
    let authCryptCredJsonUpdate = await Credential.updateOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
        console.log('AUTHCRYPTCREDJSON UPDATE------------------------------------------------->', authCryptCredJsonUpdate);
        
    let authCryptCredJson = await Credential.findOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: true})
    console.log('AUTHCRYPT CRED JSON--------------------------------------------->', authCryptCredJson);
    
    let [, authdecryptCredJson] = await authDecrypt(req.user.userWalletHandle, mePairwise.verkey, authCryptCredJson.message)
    console.log('AUTHDECRYPT CREDJSON------------------------------------------------------->', authdecryptCredJson);
        
    let credReqMetadataJSONString = await credReqMetadataJSON.findOne({owner: req.user._id, did: me.did, recipientDid: req.body.recipientDid})
    console.log('credReqMetadataJSONString----------------------------------------------------->', credReqMetadataJSONString);
    
    let credReqMetadataJSON = JSON.parse(credReqMetadataJSONString.message)
    console.log('CRED REQ METADATA JSON--------------------------------------------------------------->', credReqMetadataJSON);
        
    let credDef = await CredentialDefinition.findOne({schemaName: req.body.name})
    console.log('CRED DEF----------------------------------------------------------->', credDef);

    let credDefInfo = await credentialsFunc.getCredDef(pool.poolHandle, mePairwise.did, credDef.id)
    console.log('CRED DEF INFO---------------------------------------------------------------------------->', credDefInfo);
        
    let outSchemaId = await credentialsFunc.storeCredential(req.user.userWalletHandle, credReqMetadataJSON, authdecryptCredJson, credDefInfo.credDef)
    console.log('OUTSCHEMA ID------------------------------------------------------------------------>', outSchemaId);
    
    res.send({authCryptCredJsonUpdate, authCryptCredJson, authdecryptCredJson, credReqMetadataJSONUTF, credReqMetadataJSON, outSchemaId})

    } catch (e) {
        res.send(e)
    }
    


})



router.post('/sample',async (req, res) => {
    // console.log(encodeURIComponent(req.body.enc))

    // let cr = await indy.cryptoAuthCrypt(req.body.userWalletHandle, req.body.senderverkey, req.body.recipientverkey,Buffer.from(JSON.stringify({msg: "hello"}), 'utf8'))

    // let dcr = JSON.parse(Buffer.from(await indy.cryptoAnonDecrypt(req.body.userWalletHandle, req.body.verkey, cr)));

    // let cr = await indy.cryptoAuthCrypt(req.body.cruserWalletHandle, req.body.senderVk, req.body.recipientVk, Buffer.from(JSON.stringify({msg: "hello"}), 'utf-8'))

    // let sample = new Sample({
    //     data: cr,
    //     did: req.body.did
    // })
    // await sample.save()
    // console.log(cr);

    // let crr = await Sample.findOne({did: req.body.did})
    // console.log(crr)
    // console.log('CRR>DATA ------------------------------------------------------------->', crr.data)
    // let [fromVerkey, decryptedMsgJSON, decryptedMsg] = await userFuncs.authDecrypt(req.body.dcruserWalletHandle, req.body.recipientVk, crr.data)

    // console.log(fromVerkey, decryptedMsgJSON, decryptedMsg);
    
    // let message = {msg: "hello"}
    // console.log(message);
    
    // let s = JSON.stringify(message)
    // console.log(s);

    // let p = JSON.parse(s)

    // let message = 'hello'
    // console.log(message);

    // let messageUTF = Buffer.from(message, 'utf-8')
    // console.log(messageUTF);
    
    // let i = parseInt('Tejas', 6)
    // console.log(i);
    
    
    let m = Buffer.from('hello', 'utf-8')
    console.log(m);
    
    let n = int

    let s = n.toString()
    // res.send({cr, fromVerkey, decryptedMsgJSON, decryptedMsg, messageUTF, normal})
    res.send({m, n, s})
})

module.exports = router