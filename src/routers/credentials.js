const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const User = require('../models/user')
const CredentialSchema = require('../models/credentialSchema')
const credentialsFunc = require('../functions/credentials')
const pool = require('../functions/pool')
const DidKeyPair = require('../models/didKeyPair')
const CredentialDefinition = require('../models/credentialDefinition')


router.post('/createSchema', auth, async(req, res) => {


    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    
    console.log('SCHEMA ME DID------->', me.did);
    
    
    try {
        console.log('IN SCHEMA TRY');
        let attrNames = req.body.attrNames.split(' ')
        console.log('ATTRIBUTES------->', attrNames)
        let schemaInfo = await credentialsFunc.createSchema(me.did, req.body.name, attrNames)
        console.log('SCHEMA INFO---------------------->', schemaInfo)
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

        let sentSchemaInfo = await credentialsFunc.sendSchema(pool.poolHandle, req.user.userWalletHandle, me.did, schemaInfo.schema)

        await Schema.save()
        res.send({schemaInfo, sentSchemaInfo})
    } catch (e) {
        res.send(e)        
    }
})

router.get('/getSchema', async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    if(req.body.name){
        let schema = await CredentialSchema.findOne({name:req.body.name})
    }else{
        let schema = await CredentialSchema.findOne({id:req.body.id})
    }
    
    let schemaInfo = await credentialsFunc.getSchema(pool.poolHandle, me.did, schema.id)

    try {
        res.send({schemaInfo})
    } catch (e) {
        res.send(e)
    }
})

router.post('/createCredDef', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})

    let schemaInfo = await CredentialSchema.findOne({$or:[{name: req.body.name}, {id: req.body.id}]})
    // if(req.body.name){
    //     let schemaInfo = await CredentialSchema.findOne({name})
    // }
    // if()
    let [,schema] = await credentialsFunc.getSchema(pool.poolHandle, me.did, schemaInfo.id)
    let credDefInfo = await credentialsFunc.createCredDef(req.user.userWalletHandle, me.did, schema)

    let  sentCredDefInfo = await credentialsFunc.sendCredDef(pool.poolHandle, req.user.userWalletHandle, me.did, credDefInfo.credDef)

    try {
        let credDef = new CredentialDefinition({
            ver: credDefInfo.credDef.ver,
            id: credDefInfo.credDefId,
            schemaId: credDefInfo,
            owner: schemaInfo._id
        })
        await credDef.save()
        res.send({credDefInfo, sentCredDefInfo})
    } catch (e) {
        res.send(e)
    }
    
})

router.post('/getCredDef', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})

    try {

        if(req.body.credDefId){
            let [,credDef] = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDef)
        }else{
            let credDefInfo = await CredentialDefinition.findOne({schemaId: req.body.schemaId})
    
            let [,credDef] = await credentialsFunc.getCredDef(pool.poolHandle, me.did, credDefInfo.id)
        }

        res.send({credDef})
    } catch (e) {
        res.send(e)
    }
})


router.post('/sample', (req, res) => {

    res.send(req.body.creds.split(' '))
})

module.exports = router