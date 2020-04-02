const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const DidKeyPair = require('../user/didKeyPair')


const connectionOfferSchema = new mongoose.Schema({
    '@id': {
        type: String,
        default: 'connection-offer',
        required: true
    },
    did: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    // port: {
    //     type: Number,
    //     required: true
    // },
    recipientDid: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    accepted: {
        type: Boolean,
        default: false,
        required: true
    },
    
    reverted: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    timestamps: true
})

const ConnectionOffer = mongoose.model('ConnectionOffer', connectionOfferSchema)

module.exports = ConnectionOffer