const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()
const port = process.env.PORT || 9000
const app = express()

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://solosphere.web.app',
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
const uri = "mongodb+srv://solosphere:gZ66r3UMeEy5vQr@cluster0.v58lgaw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// / Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const jobCollection = client.db('soloSphere').collection('jobs')
    const bidsCollection = client.db('soloSphere').collection('bids')

    // get all jobs data
    app.get('/jobs', async (req , res) =>{
        const result = await jobCollection.find().toArray()
        console.log(result)
        res.send(result)
    })

    // get all myjob
    app.get('/jobs/:email', async (req, res) => {
        const email = req.params.email
        const query = { 'buyer.email': email }
        const result = await jobCollection.find(query).toArray()
        console.log(result)
        res.send(result)
      })

    // get single job data
    app.get ('/job/:id', async (req, res) =>{
        const id = req.params.id
        const query = {_id:new ObjectId(id)}
        const result = await jobCollection.findOne(query)
        res.send(result)
    })

    // save bid data
    app.post ('/bid', async (req, res) =>{
        const bidData = req.body
        const result = await bidsCollection.insertOne(bidData)
        res.send(result)
    })
    // save job data
    app.post ('/job', async (req, res) =>{
        const jobData = req.body
        const result = await jobCollection.insertOne(jobData)
        res.send(result)
    })

    // delete job
    app.delete ('/jobes/:id', async (req, res) =>{
        const id = req.params.id
        const query = {_id:new ObjectId(id)}
        const result = await jobCollection.deleteOne(query)
        res.send(result)
    })
    // update job
    app.put ('/job/:id', async (req, res) =>{
        const id = req.params.id
        const jobData = req.body
        const query = {_id:new ObjectId(id)}
        const options = {upsert:true}
        const updateDoc = {
            $set: {
                ...jobData,
            },
        }
        const result = await jobCollection.updateOne(query, updateDoc, options)
        console.log(result)
        res.send(result)
    })
  
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send('hello server')
})


app.listen(port, () => console.log(`Server running on port ${port}`))