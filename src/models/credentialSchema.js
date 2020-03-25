const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const credentialSchema = new mongoose.Schema({
    ver: {
        type: String 
    },
    id: {
        type: String
    },
    name: {
        type: String
    },
    version: {
        type: String
    },
    attrNames: {
        type: [String]
    },
    seqNo: {
        type: mongoose.Schema.Types.Mixed
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
})

const CredentialSchema = mongoose.model('CredentialsSchema', credentialSchema)

module.exports = CredentialSchema