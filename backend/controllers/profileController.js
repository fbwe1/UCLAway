const users = require("../data/users")

function getProfileById(req, res){
    const userId = Number(req.params.id)
    
    const user = users.find((u) => u.id === userId)

    if (!user) {
        return res.status(404).json({ erro: "User not found"})
    }
    res.json(user)
}

function searchUsers(req, res) {
    const search = req.query.search || ""

    const results = users.filter((user) =>
        user.username.toLowerCase().includes(search.toLowerCase())
    )
    
    res.json(results)
}

GPUShaderModule.exports = {
    getProfileById,
    searchUsers,
}