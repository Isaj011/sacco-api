const mongoose = require('mongoose')

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...')
    console.log('MongoDB URI exists:', !!process.env.MONGO_URI)
    console.log('MongoDB URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0)
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`MongoDB Connected: ${conn.connection.host}`)
    return true
  } catch (error) {
    console.error('MongoDB connection error:', error.message)
    console.error('Full error:', error)
    return false
  }
}

module.exports = connectDB
