'use strict';

var User = require('../models/').Users;
var Role = require('../models/').Roles;
var uuid = require('uuid/v4');
var generator = require('generate-password');
var BPromise = require('bluebird');
var passwordHelpers = require('../helpers/passwordHelper');
var security = require('../helpers/security');
var sequelize = require('sequelize');

module.exports = {

  create(req, res) {
    var data = req.body;
    var pw = data.password || generator.generate({ length: 6, numbers: true }); //random generate password if needed
    var hashPassword = passwordHelpers.hashPassword(pw);
    var userId =  uuid();
    var reqBody = {
      id: userId,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      password: hashPassword,
      isAdmin: data.isAdmin || false
    };
    User.create(reqBody)
      .then(function (newUser) {
        if (req.headers.setcookie === 'true') {
          security.setUserCookie(req, {
            id: userId,
            role: 'agent'
          });
        }
        res.status(201).json(newUser);
      })
      .catch(function (error) {
        res.status(500).json(error);
      });
  },

  show(req, res) {
    var data = req.body;
    User.findOne({
      where: {
        id: req.params.id
      }
    }).then(function(user) {
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(500).json({
          errorCode: 4003,
          errorMessage: 'Invalid user id'
        });
      }
    }).catch(function(err) {
      res.status(500).json(error);
    });
  },

  login(req, res) {
    var data = req.body;
    User.findOne({
      where: {
        email: data.email
      }
    }).then(function(user) {
      if (passwordHelpers.verifyPassword(data.password, user.password)) {
        if (req.headers.setcookie === 'true') {
          security.setUserCookie(req, {
            id: user.id,
            isAdmin: user.isAdmin,
            role: 'agent'
          });
        }
        res.status(200).json(user);
      } else {
        res.status(500).json({
          errorCode: 4003,
          errorMessage: 'Invalid password'
        });
      }
    }).catch(function(err) {
      console.log(err);
      res.status(500).json(err);
    });
  },

  update(req, res) {
    var data = req.body;
    var reqBody = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName
    };
    if (data.changed_password) {
      reqBody.password = passwordHelpers.hashPassword(data.changed_password);
    }
    User.update(reqBody, {
      where: {
        id: req.params.id
      }
    })
    .then(function (updatedRecords) {
      res.status(200).json({});
    })
    .catch(function (error) {
      res.status(500).json(error);
    });
  },

  show_stat(req, res) {
    var deferred = BPromise.pending(); //Or Q.defer() in Q
    User.findAll({
      attributes: [[sequelize.fn('COUNT', sequelize.col('id')), 'agents_count']]
    })
    .then(function(result) {
      deferred.resolve(result[0].dataValues);
    })
    .catch(function(error) {
      deferred.reject({err: error});
    });
    return deferred.promise;
  }

};
