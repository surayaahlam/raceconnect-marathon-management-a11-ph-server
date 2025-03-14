const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express();

const cookieParser = require('cookie-parser')
const corsOptions = {
    origin: [
        'http://localhost:5173',
        'https://race-connect-25d5a.web.app',
        'https://race-connect-25d5a.firebaseapp.com'
    ],
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
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

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
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const database = client.db('raceConnectDB');
        const marathonCollection = database.collection('marathons');
        const registrationCollection = database.collection('registrations');
        const upcomingCollection = database.collection('upcoming');

        // generate jwt
        app.post('/jwt', async (req, res) => {
            const email = req.body
            // create token
            const token = jwt.sign(email, process.env.SECRET_KEY, {
                expiresIn: '365d', // 1 year
            })
            res.cookie('token', token, cookieOptions).send({ success: true })
        })

        // logout || clearing Token
        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log("logging out", user);
            res
                .clearCookie('token', { ...cookieOptions, maxAge: 0 })
                .send({ success: true })
        })

        // marathons related API
        app.get('/marathons', verifyToken, async (req, res) => {
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
            const cursor = upcomingCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/marathon/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await marathonCollection.findOne(query)
            res.send(result)
        });

        app.get('/marathons/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const decodedEmail = req.user?.email
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })

            // Extracting the sortOrder query parameter (defaults to 'asc' if not provided)
            const sortOrder = req.query.sortOrder;

            // Base query to find marathons by user email
            const query = { 'user.email': email };

            let cursor;

            // Sorting logic based on sortOrder query
            if (sortOrder === 'asc') {
                cursor = marathonCollection.aggregate([
                    { $match: query },
                    { $addFields: { createdAt: { $toDate: "$createdAt" } } },  // Convert string to Date
                    { $sort: { createdAt: 1 } }  // Ascending: Oldest first
                ]);
            } else if (sortOrder === 'desc') {
                cursor = marathonCollection.aggregate([
                    { $match: query },
                    { $addFields: { createdAt: { $toDate: "$createdAt" } } },  // Convert string to Date
                    { $sort: { createdAt: -1 } }  // Descending: Newest first
                ]);
            } else {
                cursor = marathonCollection.find(query); // No sorting
            }

            const result = await cursor.toArray();
            res.send(result);
        });

        app.put('/updateMarathon/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const marathonData = req.body
            const updated = {
                $set: marathonData,
            }
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const result = await marathonCollection.updateOne(query, updated, options);
            if (result.matchedCount === 0) {
                return res.status(404).send({ success: false, message: 'Marathon not found' });
            }

            if (result.modifiedCount > 0) {
                return res.send({ success: true, message: 'Marathon updated successfully!' });
            }

            res.send({ success: true, message: 'No changes were made to the marathon' });
        });

        app.patch('/marathon/:id/increment', verifyToken, async (req, res) => {
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
            res.send(result)
        });

        app.delete('/marathon/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await marathonCollection.deleteOne(query)
            res.send(result)
        });

        // registrations related API
        app.get('/myApplyList/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const decodedEmail = req.user?.email
            if (decodedEmail !== email)
                return res.status(401).send({ message: 'unauthorized access' })

            // Get search term from query parameters
            const searchTerm = req.query.search || ""; // Default to empty string if not provided

            const query = {
                'email': email,
                'marathonTitle': { $regex: searchTerm, $options: "i" } // Case-insensitive regex search
            };

            try {
                const result = await registrationCollection.find(query).toArray();
                res.send(result);
            } catch (err) {
                res.status(500).send({ message: 'Failed to fetch marathons', error: err });
            }
        });

        app.put('/myApplyList/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const registrationData = req.body
            const updated = {
                $set: registrationData,
            }
            const query = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const result = await registrationCollection.updateOne(query, updated, options);
            if (result.matchedCount === 0) {
                return res.status(404).send({ success: false, message: 'Marathon Applied not found' });
            }

            if (result.modifiedCount > 0) {
                return res.send({ success: true, message: 'Marathon Applied updated successfully!' });
            }

            res.send({ success: true, message: 'No changes were made to the marathon applied' });
        });

        app.post('/registrations', async (req, res) => {
            const registration = req.body;
            // if a user registered in this marathon
            const query = { email: registration.email, marathonTitle: registration.marathonTitle }
            const alreadyExist = await registrationCollection.findOne(query)
            if (alreadyExist)
                return res
                    .status(400)
                    .send('You have already registered for this marathon!')
            const result = await registrationCollection.insertOne(registration);
            res.send(result);
        });

        app.delete('/myApplyList/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await registrationCollection.deleteOne(query)
            res.send(result)
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