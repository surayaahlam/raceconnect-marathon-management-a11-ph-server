const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

const cookieParser = require('cookie-parser')
const corsOptions = {
    origin: ['http://localhost:5173'],
    credentials: true,
    optionalSuccessStatus: 200,
}

// middleware
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bo1l9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// verifyToken
const verifyToken = (req, res, next) => {
    const token = req.cookies?.token
    if (!token) return res.status(401).send({ message: 'unauthorized access' })
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
    })
    next()
};

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

        // generate jwt
        app.post('/jwt', async (req, res) => {
            const email = req.body
            // create token
            const token = jwt.sign(email, process.env.SECRET_KEY, {
                expiresIn: '365d', // 1 year
            })
            console.log(token)
            res
                .cookie('token', token, {
                    httpOnly: true, // Prevent client-side access
                    secure: process.env.NODE_ENV === 'production', // Secure flag in production
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        // logout || clear cookie from browser
        app.get('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        // marathons related API
        app.get('/marathons', async (req, res) => {
            const cursor = marathonCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

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

        app.post('/addMarathon', async (req, res) => {
            const marathonData = req.body
            const result = await marathonCollection.insertOne(marathonData)
            console.log(result)
            res.send(result)
        })

        // registrations related API
        app.post('/registrations', async (req, res) => {
            const registration = req.body;
            // if a user registered in this marathon
            const query = { email: registration.email, marathonTitle: registration.marathonTitle }
            const alreadyExist = await registrationCollection.findOne(query)
            console.log('If already exist-->', alreadyExist)
            if (alreadyExist)
                return res
                    .status(400)
                    .send('You have already registered for this marathon!')
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