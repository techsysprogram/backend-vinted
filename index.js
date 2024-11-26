const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config(); // mon serveur peut à présent utilise les variables contenues dans .env


const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});


const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI);

//route pour le paiement stripe
const stripe = require("stripe")(process.env.KEY_STRIPE);

app.post('/payment', async (req, res) => {
  const { amount, currency, description } = req.body;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log("Erreur Stripe :", error);
    res.status(500).send({ error: error.message });
  }
});


// import de mes router
const userRouter = require("./routes/user");
const offerRouter = require("./routes/offer");

app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur Vinted" });
});



// utilisation de mes router
app.use(userRouter);
app.use(offerRouter);

app.all("*", (req, res) => {
  res.status(404).json({ error: "all route" });
});

app.listen(process.env.PORT, () => {
  console.log("Server Started 🩲");
});
