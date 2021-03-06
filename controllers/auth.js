const { check, validationResult } = require("express-validator");
const user = require("../models/user");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");

const User = require("../models/user");

exports.signup = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }

  const user = new User(req.body);
  user.save((err, user) => {
    if (err) {
      return res.status(400).json({
        err: "not able to save user in DB",
      });
    }
    res.json({
      name: user.name,
      email: user.email,
      id: user._id,
    });
  });
};

exports.signin = (req, res) => {
  const { email, password } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: errors.array()[0].msg,
    });
  }

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User email doesn't exist" });
    }

    if (!user.authenticate(password)) {
      return res.status(401).json({
        error: "Email and password do not match",
      });
    }

    //create token
    var token = jwt.sign({ _id: user._id }, process.env.SECRET);

    //put token into cookie
    res.cookie("token", token, { expire: new Date() + 9999 });

    //send response to frontend
    const { _id, name, email, role } = user;
    return res.json({
      token,
      user: { _id, name, email, role },
    });
  });
};

exports.signout = (req, res) => {
  res.clearCookie("token");
  res.json({
    message: "user signout sucessfully",
  });
};

// protected routes

exports.isSignedIn = expressJwt({
  // by default next is defined inside expressJwt function.
  secret: process.env.SECRET,
  userProperty: "auth",
});

// custom middlewares

exports.isAuthenticated = (req, res, next) => {
  // this middleware allow user to make changes in its own account.
  let checker = req.profile && req.auth && req.profile._id == req.auth._id;
  if (!checker) {
    return res.status(403).json({
      error: "ACCESS DENIED",
    });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.profile.role === 0) {
    return res.status(403).json({
      error: "You are not Admin, ACCESS DENIED",
    });
  }
  next();
};
