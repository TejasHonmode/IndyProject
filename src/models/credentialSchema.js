const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const credentialSchema = new mongoose.Schema({
    ver: {
        type: String
    },
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    version: {
        type: String,
        required: true
    },
    attrNames: {
        type: [String],
        required: true
    },
    seqNo: {
        type: mongoose.Schema.Types.Mixed
    },
    did:{
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

const CredentialSchema = mongoose.model('CredentialSchema', credentialSchema)

module.exports = CredentialSchema