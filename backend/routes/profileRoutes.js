const express = require("express")
const router = express.Router()

const { 
    getProfileById, 
    searchUsers,
    followUser,
    unfollowUser,
    getFollowStatus,
    getRecentActivity
} = require("../controllers/profileController")

router.get("/", searchUsers)
router.get("/:id", getProfileById)
router.get("/:id/follow-status", getFollowStatus)
router.post("/:id/follow", followUser)
router.delete("/:id/follow", unfollowUser)
router.get("/:id/activity", getRecentActivity)

module.exports = router