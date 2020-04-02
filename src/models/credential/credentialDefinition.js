const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')


const credentialDefinitionSchema = new mongoose.Schema({
    ver: {
        type: String,
        required: true
    },
    id:{
        type: String,
        required: true
    },
    schemaName: {
        type: String,
        required: true
    },
    schemaId: {
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

const CredentialDefinition = mongoose.model('CredentialDefinition', credentialDefinitionSchema)

module.exports = CredentialDefinition