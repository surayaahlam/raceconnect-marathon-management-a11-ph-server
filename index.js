const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bo1l9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db('raceConnectDB');
        const marathonCollection = database.collection('marathons');
        const registrationCollection = database.collection('registrations');

        // marathons related API
        app.get('/marathonSection', async (req, res) => {
            const cursor = marathonCollection.find().limit(6);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/upcomingMarathons', async (req, res) => {
            const today = new Date();
            const cursor = marathonCollection.find({ registrationEnd: { $gte: today.toISOString() } }).limit(6);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/marathon/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await marathonCollection.findOne(query)
            res.send(result)
        })

        app.patch('/marathon/:id/increment', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const update = {
                $inc: { registrationCount: 1 },
            }
            const result = await marathonCollection.updateOne(filter, update);
            res.send(result);
        });

        // registrations related API
        app.post('/registrations', async (req, res) => {
            const registration = req.body;
            const result = await registrationCollection.insertOne(registration);
            res.send(result);
        });


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('RaceConnect server is running....')
})

app.listen(port, () => {
    console.log(`RaceConnect is running in port: ${port}`);
})