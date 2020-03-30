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

    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    try {
        let credDefInfo = await CredentialDefinition.findOne({schemaName: req.body.name})

        let authCryptOffer = await credentialsFunc.createCredentialOffer(req.user.userWalletHandle, credDefInfo.id, mePairwise.verkey, forMePairwise.verkey)

        let credOffer = new CredentialOffer({
            did: me.did,
            message: authCryptOffer,
            recipientDid: req.body.recipientDid,
            owner: req.user._id
        })

        await credOffer.save()
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

    let mePairwise = await DidKeyPair.findOne({owner: req.user._id, public: false, by:me.did, forDid: req.body.recipientDid})
    console.log(mePairwise)

    let forMePairwise = await DidKeyPair.findOne({forDid: me.did, public: false, by: req.body.recipientDid})
    console.log(forMePairwise);

    let offerUpdate = await CredentialOffer.updateOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
    console.log(offerUpdate)

    let offer = await CredentialOffer.findOne({did: req.body.recipientDid, recipientDid: me.did, acknowledged: true})
    console.log(offer);

    try {
        let verkey = await userFuncs.keyForDid(pool.poolHandle, req.user.userWalletHandle, mePairwise.did)

        let[senderVerkey, offerJSON, decryptedOffer] = await encryption.authDecrypt(req.user.userWalletHandle, verkey, offer.message)

        let masterSecretId = await credentialsFunc.createMasterSecret(req.user.userWalletHandle)

        let credDefInfo = await credentialsFunc.getCredDef(pool.poolHandle, mePairwise.did, decryptedOffer.cred_def_id)

        let credentialRequestInfo = await credentialsFunc.createCredentialRequest(req.user.userWalletHandle, mePairwise.did, offerJSON, credDefInfo.credDef, masterSecretId)

        res.send({offerJSON, decryptedOffer, credDefInfo, credentialRequestInfo})
    } catch (e) {
        res.send(e)
    }
    

})



router.post('/sample',async (req, res) => {
    console.log(encodeURIComponent(req.body.enc))

    // let cr = await indy.cryptoAuthCrypt(req.body.userWalletHandle, req.body.senderverkey, req.body.recipientverkey,Buffer.from(JSON.stringify({msg: "hello"}), 'utf8'))

    // let dcr = JSON.parse(Buffer.from(await indy.cryptoAnonDecrypt(req.body.userWalletHandle, req.body.verkey, cr)));

    let cr = await indy.cryptoAuthCrypt(req.body.cruserWalletHandle, req.body.senderVk, req.body.recipientVk, Buffer.from(JSON.stringify({msg: "hello"}), 'utf-8'))

    let sample = new Sample({
        data: cr,
        did: req.body.did
    })
    await sample.save()
    console.log(cr);

    let crr = await Sample.findOne({did: req.body.did})
    console.log(crr)
    console.log('CRR>DATA ------------------------------------------------------------->', crr.data)
    let [fromVerkey, decryptedMsgJSON, decryptedMsg] = await userFuncs.authDecrypt(req.body.dcruserWalletHandle, req.body.recipientVk, crr.data)

    console.log(fromVerkey, decryptedMsgJSON, decryptedMsg);
    
    

    res.send({cr, fromVerkey, decryptedMsgJSON, decryptedMsg})
})

module.exports = router