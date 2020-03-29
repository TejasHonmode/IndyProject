const express = require('express')
const router = new express.Router()
const bodyParser = require('body-parser')
const userFuncs = require('../functions/user')
const User = require('../models/user')
const timestamp = require('timestamp')
const auth = require('../middleware/auth')
const urlencodedParser = bodyParser.json()
const ConnectionOffer = require('../models/connectionOffer')
const DidKeyPair = require('../models/didKeyPair')
const ConnectionRequest = require('../models/connectionRequest')
const ConnectionResponse = require('../models/connectionResponse')
const pool = require('../functions/pool')
const DidInfo = require('../models/didInfo')

router.post('/sendConnectionOffer', auth,async(req, res) => {


    

    const did = await DidKeyPair.findOne({owner: req.user._id, public: true})
    const Offer = await userFuncs.connectionOffer(did.did, req.body.recipientDid)
    console.log('.......REQ>USER', req.user)
    console.log('OFFER--------------------', Offer)

    const connectionOffer = await ConnectionOffer.findOne({did:did.did, recipientDid: req.body.recipientDid, owner: req.user._id})
    if(connectionOffer){
        return res.send({error: 'Connection Offer Already Sent.'})
    }

    try {
        const connectionOffer = new ConnectionOffer({
            did:Offer.did,
            ip: Offer.ip,
            // port: Offer.port,
            recipientDid: Offer.recipientDid,
            owner: req.user._id
        })
        await connectionOffer.save()
        res.send(connectionOffer)
    } catch (e) {
        res.send(e)
    }
})


router.patch('/respondToConnectionOffer', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})

    try {
        let offer = await ConnectionOffer.updateOne({did: req.body.recipientDid, recipientDid: me.did, accepted: false}, {accepted: true})
        if(!offer){
            return res.send({msg: "Sorry no such offer"})
        }

        res.send(offer)
    } catch (e) {
        res.send(e)
    }
})


router.get('/sentConnectionOffers', auth, async(req, res) => {

    const sentConnectionOffers = await ConnectionOffer.find({owner: req.user._id})

    if(!sentConnectionOffers){
        return res.send({error: 'No Connection Offers Sent'})
    }

    try {
        res.send(sentConnectionOffers)
    } catch (e) {
        res.send(e)
    }
})

router.get('/pendingConnectionOffer', auth, async(req, res) => {

    try {
        const me = await DidKeyPair.find({owner: req.user._id, public: true})
        console.log(me[0].did)
        const pendingOffers = await ConnectionOffer.find({recipientDid: me[0].did, accepted: false})
        console.log('----See----',pendingOffers)
        if(!pendingOffers){
            return res.send({error: 'No Pending Connection Offers'})
        }

        res.send(pendingOffers)

    } catch (e) {
        res.send(e)
    }
    

})


router.patch('/revertConnectionOffer', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})

    try {
        let offer = await ConnectionOffer.findOneAndUpdate({did: me.did,recipientDid: req.body.recipientDid}, {reverted: true})

        if(!offer){
            return res.send({error: 'No Pending Connection Offers'})
        }

        res.send(offer)
    } catch (e) {
        res.send(e)
    }
})


router.post('/sendConnectionRequest', auth,async(req, res) => {

    

    const requestorDid = await DidKeyPair.findOne({owner: req.user._id, public: true})
    const myDid = requestorDid.did
    console.log('MY DID', myDid)
    // const recipient = await ConnectionOffer.findOne({recipientDid: myDid, accepted: false})
    // console.log('Recipient', recipient)
    const recipientDid = req.body.recipientDid

    const connectionRequest = await ConnectionRequest.findOne({owner: req.user._id, did: myDid, recipientDid})
    if(connectionRequest){
        return res.send({error: 'Connection Request Already Sent'})
    }


    // const offer = await ConnectionOffer.updateOne({did:recipientDid, recipientDid: myDid, owner: recipient.owner, accepted: false}, {accepted: true})
    let offer = await ConnectionOffer.updateOne({did:recipientDid, recipientDid: myDid, accepted: false}, {accepted: true})


    console.log('Offer',offer)
    console.log(req.user.userWalletHandle)
    let Request = await userFuncs.connectionRequest(myDid, recipientDid, req.user.userWalletHandle, req.body.metadata)
    try {
        const connectionRequest = new ConnectionRequest({
            // did: Request.did,
            // newDid: Request.newDid,
            // newKey: Request.newKey,
            // ip: Request.ip,
            // recipientDid: Request.recipientDid,
            ...Request,
            owner: req.user._id
        })
        await connectionRequest.save()

        const didKeyPair = new DidKeyPair({
            id: req.user.id,
            did: Request.newDid,
            verkey: Request.newKey,
            metadata: req.body.metadata,
            owner: req.user._id,
            public: false,
            forDid: recipientDid
        })


        await didKeyPair.save()

        let nymInfo = await pool.sendNym(pool.poolHandle, req.user.userWalletHandle, myDid, Request.newDid, Request.newKey)
        res.send({connectionRequest, msg: nymInfo.msg})
    } catch (e) {
        res.send(e)
    }
})

router.get('/sentConnectionRequests', auth, async(req, res) => {

    try {
        const sentRequests = await ConnectionRequest.find({owner: req.user._id})
        if(!sentRequests){
            return res.send({error: 'No Connection Requests Sent'})
        }
        res.send(sentRequests)
    } catch (e) {
        res.send(e)
    }
    
})

router.get('/pendingConnectionRequest', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    let myDid = me.did

    let pendingRequests = await ConnectionRequest.find({recipientDid: myDid, responded: false})
    if(!pendingRequests){
        return res.send({error: 'No pending requests'})
    }

    try {
        res.send(pendingRequests)
    } catch (e) {
        res.send(e)
    }
})

router.patch('/rejectConnectionRequest', auth, async(req, res) => {

    


    try {
        const me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    const myDid = me.did

    const pendingRequest = await ConnectionRequest.findOneAndUpdate({recipientDid: myDid, responded: false}, {rejected: true})
    if(!pendingRequests){
        return res.send({error: 'No Pending Connection Requests'})
    }
        res.send(pendingRequest)
    } catch (e) {
        res.send(e)
    }

})

router.post('/sendConnectionResponse', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    let myDid = me.did

    // const recipient = await ConnectionRequest.findOne({recipientDid: myDid, responded: false})
    let recipientDid = req.body.recipientDid

    let response = await ConnectionResponse.findOne({owner: req.user._id, did: myDid, recipientDid})
    if(response){
        return res.send({error: 'Connection Response Already Sent'})
    }


    let request = await ConnectionRequest.updateOne({did: recipientDid, recipientDid: myDid, responded: false}, {responded: true})

    try {

        const Response = await userFuncs.connectionResponse(myDid, recipientDid, req.user.userWalletHandle, request.newDid, req.body.metadata)

        const connectionResponse = new ConnectionResponse({
            did:Response.did,
            newDid: Response.newDid,
            newKey: Response.newKey,
            ip: Response.ip,
            recipientDid: Response.recipientDid,
            owner: req.user._id
        })

        await connectionResponse.save()

        let didKeyPair = new DidKeyPair({
            id: req.user.id,
            did: Response.newDid,
            verkey: Response.newKey,
            metadata: req.body.metadata,
            owner: req.user._id,
            public: false,
            forDid: recipientDid
        })

        await didKeyPair.save()


        res.send({connectionResponse})
    } catch (e) {
        res.send(e)
    }


})


router.get('/sentConnectionResponse', auth, async(req, res) => {

    try {
        const Responses = await ConnectionResponse.find({owner: req.user._id})
        if(!Responses){
            return res.send({error: 'No Connection Responses Sent'})
        }

        res.send(Responses)

    } catch (e) {
        res.send(e)
    }
    
})

router.get('/pendingConnectionResponse', auth, async(req, res) => {

    const me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    const myDid = me.did

    const pendingResponses = await ConnectionResponse.find({recipientDid: myDid, acknowledged: false})

    try {
        if(!pendingResponses){
            return res.send({error: 'No Pending Connection Responses'})
        }

        res.send(pendingResponses)
    } catch (e) {
        res.send(e)
    }
})


router.post('/sendAcknowledgement', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    let myDid = me.did
    let recipientDid = req.body.recipientDid

    // let response = await ConnectionResponse({did: recipientDid, recipientDid: me.did, responded: false})
    let response = await ConnectionResponse.updateOne({did: recipientDid, recipientDid: me.did, acknowledged: false}, {acknowledged: true})
    console.log('RESPONSE ----------------->>', response)

    let Response = await ConnectionResponse.findOne({did: recipientDid, recipientDid: myDid, acknowledged: true})


    // let ack = await userFuncs.connectionAcknowledgement(me.did)
    // console.log(ack)
    try {

        let nymInfo = await pool.sendNym(pool.poolHandle, req.user.userWalletHandle, myDid, Response.newDid, Response.newKey)
        res.send({response, Response, nymInfo, msg: 'Connected yay!!!!  UwU'})
    } catch (e) {
        res.send(e)
    }
})


router.post('/sendDidInfo', auth,async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('me ---------------->>>>', me);
    
    // let pairwise = await DidKeyPair.findOne({id: req.user.id, owner: req.user._id,public: false, forDid: req.body.recipientDid})
    // console.log('pairwise--------------------------', pairwise);
    

    try {
        let didInfo = new DidInfo({
            did: me.did,
            verkey: me.verkey,
            // fromToKey: pairwise.verkey,
            owner: req.user._id,
            recipientDid: req.body.recipientDid,
            role: req.body.role
        })

        await didInfo.save()
        res.send(didInfo)
    } catch (e) {
        res.send(e)
    }
})


router.post('/assignRole', auth, async(req, res) => {

    let me = await DidKeyPair.findOne({owner: req.user._id, public: true})
    console.log('ME DID------------------>', me.did)
    let didInfo = await DidInfo.findOne({recipientDid: me.did, did: req.body.recipientDid, acknowledged: false})

    console.log('DID INFO-------------->', didInfo)

    // await DidInfo.updateOne({recipientDid: me.did, did: req.body.recipientDid, acknowledged: false}, {acknowledged: true})

    try {
        let user = await User.updateOne({_id: didInfo.owner, role: 'USER'}, {role: didInfo.role})
        console.log('USER UPDATED----------->', user);
        
        let nymInfo = await pool.sendNym(pool.poolHandle, req.user.userWalletHandle, me.did, didInfo.did, didInfo.verkey, didInfo.role)
        console.log('ROLE ASSIGNED-------------------->');
        
        await DidInfo.updateOne({recipientDid: me.did, did: req.body.recipientDid, acknowledged: false}, {acknowledged: true})
        console.log('DID INFO ACKNOWLEDGED ---------------------------->');
        
        res.send({
            did: didInfo.did,
            ROLE_ASSIGNED: nymInfo.role
        })

    } catch (e) {
        res.send(e)
    }
})


module.exports = router

