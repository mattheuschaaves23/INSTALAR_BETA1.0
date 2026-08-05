const express = require('express');
const controller = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

router.use(auth);

router.get('/', controller.getNotifications);
router.get('/devices/capabilities', controller.getDeviceCapabilities);
router.post('/devices', controller.registerDevice);
router.delete('/devices/:id', controller.unregisterDevice);
router.put('/read-all', controller.markAllAsRead);
router.put('/:id/read', controller.markAsRead);

module.exports = router;
