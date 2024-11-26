const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

const Offer = require("../models/Offer");

const isAuthenticated = require("../middlewares/isAuthenticated");

const convertToBase64 = require("../utils/convertToBase64");

const fileupload = require("express-fileupload");

router.post(
  "/offers/publish",
  isAuthenticated,
  fileupload(),
  async (req, res) => {
    try {
      const { title, description, price, brand, city, size, condition, color } =
        req.body;

        //controle de champs obligatoires
      if (!title || !price || !req.files.picture || !description) {
        return res.status(400).json({ message: "title, price and picture are required" });
      }

      const picture = req.files.picture;

      const savedPicture = await cloudinary.uploader.upload(
        convertToBase64(picture)
      );

      const newOffer = new Offer({
        product_name: title,
        product_description: description,
        product_price: price,
        product_details: [
          {
            MARQUE: brand,
          },
          {
            TAILLE: size,
          },
          {
            ÉTAT: condition,
          },
          { COULEUR: color },
          {
            EMPLACEMENT: city,
          },
        ],
        product_image: savedPicture,
        owner: req.user._id,
      });

      await newOffer.save();

      res.json(newOffer);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.get("/offers/:id", async (req, res) => {
  const offers = await Offer.findById(req.params.id).populate("owner", "account");
  res.status(200).json(offers);

});

router.get("/offers", async (req, res) => {

  try {
    const { title, priceMin, priceMax, sort, page,limit } = req.query;

    const filters = {}; // si j'ai title => { product_name : new RegExp(title,"i")}

    // si on m'a envoyé un title alors j'ajoute à filters une clé product_name qui contient ma regexp
    if (title) {
      filters.product_name = new RegExp(title, "i");
    }

    // si j'ai priceMin => { product_price : { $gte : Number(priceMin) }}
    if (priceMin) {
      filters.product_price = { $gte: Number(priceMin) };
    }

    // si j'ai priceMax => { product_price : { $lte : Numver(priceMax) }}
    if (priceMax) {
      // attention : si priceMin existe ! L'objet product_price existe déjà !
      // il ne faut donc pas l'écraser !!!!
      if (priceMin) {
        filters.product_price.$lte = Number(priceMax);
      } else {
        // sinon je crée la clé product_price
        filters.product_price = { $lte: Number(priceMax) };
      }
    }

    // SORTS
    const sortObj = {}; // si j'ai reçu une clé sort alors il faut faire :  { product_price = "asc" ou "desc"}
    if (sort === "price-asc") {
      sortObj.product_price = "asc";
    } else if (sort === "price-desc") {
      sortObj.product_price = "desc";
    }

    // par défaut je suis à la page 1
    let skip = 0;
    // page 1 => (page - 1)*limit => skip 0
    // page 2 => (page - 1)*limit => skip 5
    // page 3 => (page - 1)*limit => skip 10
    // SI J'AI UNE PAGE INDIQUÉE => alors je change skip pour => (page - 1) * limit

    if (page) {
      skip = (page - 1) * limit;
    }

    const offers = await Offer.find(filters)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .populate("owner", "account");
    // .select("product_name product_price");

    const totalCount = await Offer.countDocuments(filters);

    res.status(200).json({
      count: totalCount,
      offers: offers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
