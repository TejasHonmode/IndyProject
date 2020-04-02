const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const credentialOfferJsonSchema = new mongoose.Schema({
    did: {
        type: String,
        required: true
    },
    message:{
        type: String,
        required: true
    },
    recipientDid: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
})

const CredentialOfferJson = mongoose.model('CredentialOfferJson', credentialOfferJsonSchema)

module.exports = CredentialOfferJson