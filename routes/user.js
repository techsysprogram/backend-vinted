const express = require("express");

const router = express.Router();

const User = require("../models/User");

// packages de cryptage
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// post  pour créer un utilisateur

router.post("/user/signup", async (req, res) => {
  try {
    if (!req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(409).json({ error: "email already used" });
    }

    // tout va bien ici

    // 1) salt et token
    const salt = uid2(16);
    const token = uid2(32);

    // 2) hashing
    const hash = SHA256(req.body.password + salt).toString(encBase64);

    // 3) on enregistre le user
    const newUser = new User({
      email: req.body.email,
      account: {
        username: req.body.username,
      },
      newsletter: req.body.newsletter,
      token: token,
      salt: salt,
      hash: hash,
    });

    await newUser.save();

    res.status(201).json({
      _id: newUser._id,
      token: newUser.token,
      account: newUser.account,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const userFound = await User.findOne({ email: req.body.email });

    if (!userFound) {
      return res.status(401).json({ error: "email incorect" });
    }

    const newHash = SHA256(req.body.password + userFound.salt).toString(
      encBase64
    );

    if (userFound.hash !== newHash) {
      return res.status(401).json({ error: "mot de passe incorect" });
    }

    const responseObject = {
      _id: userFound._id,
      token: userFound.token,
      account: userFound.account,
    };

    res.json(responseObject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
