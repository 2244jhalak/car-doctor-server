const express = require('express');
const cors = require('cors');
const jwt=require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()

const app = express();
const port = process.env.PORT || 5000;


// middleware

app.use(cors({
  origin:[
    'http://localhost:5173'
  ],
  credentials:true
}))
app.use(express.json());
app.use(cookieParser());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tqysnnt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
const logger=(req,res,next)=>{
  console.log('Log:info',req.method,req.url);
  next();

}
const verifyToken=(req,res,next)=>{
  const token=req?.cookies?.token;
  // console.log('token in the middleware',token);
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    
    if(err){
      return res.status(401).send({message:'unauthorized access'})
    }
    req.user=decoded;
    
    next();
  })
  // next();
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDB").collection('services');
    const bookingCollection = client.db("carDB").collection('bookings');
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // auth related api
    app.post('/jwt',logger,async(req,res)=>{
      const user=req.body;
      console.log('User for token',user);
      const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'});
      // res.send({token});
      res.cookie('token',token,{
        httpOnly:true,
        secure:true,
        sameSite:'none'
      })
      .send({success:true});
    })
    app.post('/logout',async(req,res)=>{
      const user=req.body;
      console.log('logging out',user);
      res.clearCookie('token',{maxAge:0}).send({success:true});
    })
    
    // service related api
    app.get('/car',async(req,res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get('/bookings',logger,verifyToken, async(req,res)=>{
        
        // console.log('cook cookies',req.cookies);
        console.log('token owner info',req.user);
        if(req.user.email !== req.query.email){
          return res.status(403).send({message:'Forbidden access'})
        }
        let query={};
        if(req.query?.email){
            query={email:req.query.email}
        }
        const cursor = bookingCollection.find(query);
        
        
        const result = await cursor.toArray();
        res.send(result);
    })
    app.patch('/bookings/:id', async(req,res)=>{
        const id=req.params.id;
        const filter={_id:new ObjectId(id)};
        const updatedBooking=req.body;
        console.log(updatedBooking);
        const updateDoc={
            $set:{
               status:updatedBooking.status 
            }
        };
        const result= await bookingCollection.updateOne(filter,updateDoc);
        res.send(result);
    })
    app.delete('/bookings/:id',async(req,res)=>{
        const id=req.params.id;
        const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
      })
    app.get('/car/:id',async(req,res)=>{
        const id=req.params.id;
        const query={_id : new ObjectId(id)};
        const options = {
           
            projection: { title: 1, price: 1,img:1 },
        };
        
        const result= await serviceCollection.findOne(query,options);
        res.send(result);
  
  
    })
    app.post('/bookings',async(req,res)=>{
        const newBookings=req.body;
        console.log(newBookings)
        const result=await bookingCollection.insertOne(newBookings);
        res.send(result);
    })
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('Genius car server is running')
})

app.listen(port, () => {
    console.log(`Genius Car Server is running on port : ${port}`)
})