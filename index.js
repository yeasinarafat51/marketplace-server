const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()
const port = process.env.PORT || 9000
const app = express()
// app.use(cors({
//   origin: 'https://marketplace-f655e.web.app'
// }));

// const corsOptions = {
//   origin: [
//     'http://localhost:5173',
//     'http://localhost:5174',
//     'https://marketplace-f655e.web.app',
    
//   ],
//   credentials: true,
//   optionSuccessStatus: 200,
// }
// app.use(cors(corsOptions))

app.use(cors());  // allows all origins

app.use(express.json())
app.use(cookieParser())

// verify jwt midlewiredfgh

const verifyToken = (req, res, next) =>{
  const token = req.cookies?.token
  if(!token) return res.status(401).send({message: 'unauthorized access'})
  if(token){
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
      if(err) {
        return res.status(401).send({message: 'unauthorized access'})
      }
      // console.log(decoded)
      req.user = decoded
      next()
    })
  }

 
}


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

    // jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })

    // clear token on logout
    app.get('/logout', (req, res) =>{
      res.clearCookie('token', {
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',

        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge: 0,
      })
      .send({success: true})

    })




    // get all jobs data
    app.get('/jobs', async (req , res) =>{
        const result = await jobCollection.find().toArray()
       
        res.send(result)
    });


      // Get all jobs data from db for pagination
      app.get('/all-jobs', async (req, res) => {
        // Convert size and page to numbers and provide defaults
        const size = parseInt(req.query.size) || 10; // Default size is 10
        const page = (parseInt(req.query.page) || 1) - 1; // Default page is 1 (zero-based index)
      
        // Filter, sort, and search values
        const filter = req.query.filter || ''; // Default to empty if not provided
        const sort = req.query.sort || ''; // Default sort to empty if not provided
        const search = req.query.search || ''; // Default search to empty if not provided
      
        console.log("Size:", size, "Page:", page); // For debugging
      
        // Construct query for search and filter
        let query = {};
        if (search) {
          query.job_title = { $regex: search, $options: 'i' }; // Case-insensitive search on job title
        }
        if (filter) {
          query.category = filter; // Apply category filter if provided
        }
      
        // Construct sorting options
        let options = {};
        if (sort) {
          options.sort = { deadline: sort === 'asc' ? 1 : -1 }; // Ascending or descending sort by deadline
        }
      
        try {
          // Query the jobs collection with pagination, search, and filter
          const result = await jobCollection
            .find(query, options)
            .skip(page * size) // Pagination
            .limit(size) // Limit the number of results
            .toArray(); // Convert result to array
      
          res.send(result);
        } catch (error) {
          console.error("Error fetching jobs:", error);
          res.status(500).send({ error: "An error occurred while fetching jobs" });
        }
      });
      
  
      // Get all jobs data count from db
      app.get('/jobs-count', async (req, res) => {
        // Get search and filter parameters from the request, with defaults if missing
        const search = req.query.search || ''; // Default to an empty string
        const filter = req.query.filter || ''; // Default to an empty string
        
        // Initialize query object
        let query = {};
      
        // If search is not empty, add the job_title regex condition
        if (search) {
          query.job_title = { $regex: search, $options: 'i' }; // Case-insensitive search
        }
      
        // If filter is provided, add the category filter
        if (filter) {
          query.category = filter;
        }
      
        try {
          // Get the document count matching the query
          const count = await jobCollection.countDocuments(query);
          res.send({ count });
        } catch (error) {
          console.error("Error fetching job count:", error);
          res.status(500).send({ error: "An error occurred while fetching job count" });
        }
      });
      

    // get all myjob posted
    app.get('/jobs/:email',verifyToken, async (req, res) => {
      const tokenEmail = req.user.email
      // const token = req.cookies?.token
      // if(token){
      //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
      //     if(err) {
      //       return console.log(err)
      //     }
      //     console.log(decoded)
      //   })
      // }
        const email = req.params.email
        if(tokenEmail !== email){
          return res.status(403).send({message: 'Forbiden access'})
        }
        const query = { 'buyer.email': email }
        const result = await jobCollection.find(query).toArray()
        // console.log(result)
        
        res.send(result)
      })
    // get all mybids
    app.get('/my-bids/:email', async (req, res) => {
        const email = req.params.email
        const query = { email: email }
        const result = await bidsCollection.find(query).toArray()
       
        res.send(result)
      })
  

    // get single job data
    app.get ('/job/:id', async (req, res) =>{
        const id = req.params.id
        const query = {_id:new ObjectId(id)}
        const result = await jobCollection.findOne(query)
        res.send(result)
    })
    // bid - requests

    app.get('/bid-requests/:email', async (req, res) => {
        const email = req.params.email
        const query = { 'buyer.email': email }
        const result = await bidsCollection.find(query).toArray()
        // console.log(result)
        
        res.send(result)
      })

    // save bid data
    app.post ('/bid',  async (req, res) =>{

      // check if its a duplicate req
      
        const bidData = req.body;
        const query = {
          email:bidData.email,
          jobId:bidData.jobId,
  
        }
        const alreadyApplied = await bidsCollection.findOne(query)
        if(alreadyApplied) {
          return res
          .status(400)
          .send('already placed')
        }
        const result = await bidsCollection.insertOne(bidData)
        console.log(result)
        res.send(result)
    })
    // save job data
    app.post ('/job', async (req, res) =>{
        const jobData = req.body;
       
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
      // update bid -status
      app.patch('/bid/:id', async (req, res) =>{
        const id = req.params.id
        const status = req.body
        const query = {_id: new ObjectId(id)}
        const updateDoc = {
            $set: status,
        }
        const result = await bidsCollection.updateOne(query, updateDoc)
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