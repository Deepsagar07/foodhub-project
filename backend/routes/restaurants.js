// Restaurant routes: /api/restaurants/*
const express = require('express');
const { listRestaurants, getRestaurant } = require('../controllers/restaurantController');
const { getRestaurantMenu } = require('../controllers/menuController');

const router = express.Router();

router.get('/', listRestaurants);
router.get('/:id', getRestaurant);
router.get('/:id/menu', getRestaurantMenu);

module.exports = router;
