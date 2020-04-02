const mongoose = require('mongoose')
const validator = require('validator')

const connectionResponseSchema = new mongoose.Schema({
    '@id': {
        type: String,
        default: 'connection-response',
        required: true
    },
    did:{
        type: String,
        required: true
    },
    newDid:{
        type: String,
        required: true
    },
    newKey: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    // port: {
    //     type: Mixed,
    //     required: true
    // },
    recipientDid:{
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    acknowledged: {
        type: Boolean,
        default: false,
        required: true
    }
}, {
    timestamps: true
})

const ConnectionResponse = mongoose.model('ConnectionResponse', connectionResponseSchema)

module.exports = ConnectionResponse