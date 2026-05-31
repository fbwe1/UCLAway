const express = require("express")
const router = express.Router()

const {
    getProfileById,
    searchUsers,
} = require("../controllers/profileController")

router.get("/:id", getProfileById)

router.get("/", searchUsers)

module.exports = router