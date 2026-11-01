// Menu routes: /api/menu/*
const express = require('express');
const { getMenuItem } = require('../controllers/menuController');

const router = express.Router();

router.get('/:id', getMenuItem);

module.exports = router;
