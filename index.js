const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;
const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const stripe = require("stripe")(process.env.Stripe_secret);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.icikx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("drone_house");
    const dronesCollection = database.collection("drones");
    const ordersCollection = database.collection("orders");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection("users");

    app.get("/drones", async (req, res) => {
      const limit = req.query?.limit;
      let cursor;
      if (limit) {
        cursor = await dronesCollection.find({}).limit(parseInt(limit));
      } else {
        cursor = await dronesCollection.find({});
      }
      const result = await cursor.toArray();
      console.log("df");
      res.json(result);
    });
    app.post("/drones", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await dronesCollection.insertOne(data);
      res.json(result);
    });

    app.get("/drones/:_id", async (req, res) => {
      const id = req.params._id;
      const filter = { _id: ObjectId(id) };
      const cursor = await dronesCollection.findOne(filter);
      res.json(cursor);
    });
    app.delete("/drones/:_id", async (req, res) => {
      const id = req.params._id;
      const filter = { _id: ObjectId(id) };
      const cursor = await dronesCollection.deleteOne(filter);
      res.json(cursor);
    });
    // purchase and order ------------------
    app.post("/purchase", async (req, res) => {
      const data = req.body;
      const result = await ordersCollection.insertOne(data);
      res.json(result);
    });
    app.get("/orders", async (req, res) => {
      const userEmail = req.query.email;
      let result;
      if (userEmail) {
        const query = { email: userEmail };
        result = await ordersCollection.find(query).toArray();
      } else {
        result = await ordersCollection.find({}).toArray();
      }
      const outPut = await result.reverse();
      res.json(result);
    });
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      res.json(result);
    });
    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const doc = { $set: { status: "Shipped" } };
      const options = { upsert: true };
      const result = await ordersCollection.updateOne(filter, doc, options);
      res.json(result);
    });
    // reviews --------------
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find({}).toArray();
      res.json(result);
    });
    app.post("/reviews", async (req, res) => {
      const data = req.body;
      const result = await reviewsCollection.insertOne(data);
      res.json(result);
    });
    // user ------------------------
    app.post("/user", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      console.log(user);
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: user?.role });
    });
    // admin --------------------
    app.put("/user/admin", async (req, res) => {
      const data = req.body;
      const filter = { email: data.email };
      const options = { upsert: true };
      const updateDoc = { $set: { role: "admin" } };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.json(result);
    });
    app.put("/user/editor", async (req, res) => {
      const data = req.body;
      const filter = { email: data.email };
      const options = { upsert: true };
      const updateDoc = { $set: { role: "editor" } };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);
      res.json(result);
    });
    app.post("/create-payment-intent", async (req, res) => {
      const amount = parseFloat(req.body.price) * 100;
      console.log(typeof amount, "home");
      // Create a PaymentIntent with the order amount and currency
      if (amount) {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });
    app.put("/payment/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      console.log(data);
      const updateDoc = {
        $set: {
          isPaid: data,
        },
      };
      const filter = {
        email,
      };
      const result = await ordersCollection.updateMany(filter, updateDoc);
      console.log(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`Running assignment 12 server ${uri}`);
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
