const mongoose = require('mongoose')
const validator = require('validator')


const sampleSchema = new mongoose.Schema({
    
    data: {
        type: Buffer
    },
    did:{
        type: String,
        required: true
    }
})

const Sample = mongoose.model('Sample', sampleSchema)

module.exports = Sample