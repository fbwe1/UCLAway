const express = require("express")
const router = express.Router()

const { 
    getProfileById, 
    searchUsers,
    followUser,
    unfollowUser,
    getFollowStatus
} = require("../controllers/profileController")

router.get("/", searchUsers)
router.get("/:id", getProfileById)
router.get("/:id/follow-status", getFollowStatus)
router.post("/:id/follow", followUser)
router.delete("/:id/follow", unfollowUser)

module.exports = router