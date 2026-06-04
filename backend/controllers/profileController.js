const supabase = require("../supabaseclient")

const PROFILE_COLUMNS = "profile_id, username, first_name"

function cleanSearchTerm(value) {
    return String(value || "")
        .trim()
        .replace(/^@/, "")
        .replace(/[%,()]/g, "")
        .slice(0, 50)
}

async function getProfileById(req, res) {
    const userId = Number(req.params.id)

    if (!Number.isInteger(userId)) {
        return res.status(400).json({ error: "Invalid user id" })
    }

    try {
        const { data, error } = await supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .eq("profile_id", userId)
            .single()

        if (error || !data) {
            return res.status(404).json({ error: "User not found" })
        }

        res.json(data)
    } catch (error) {
        console.error("Failed to fetch profile:", error)
        res.status(500).json({ error: "Failed to fetch profile" })
    }
}

async function searchUsers(req, res) {
    const search = cleanSearchTerm(req.query.search)
    const currentUserId = Number(req.query.currentUserId)

    if (!search) {
        return res.json([])
    }

    try {
        let query = supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .or(`username.ilike.%${search}%,first_name.ilike.%${search}%,ucla_email.ilike.%${search}%`)
            .order("username", { ascending: true })
            .limit(20)

        if (Number.isInteger(currentUserId)) {
            query = query.neq("profile_id", currentUserId)
        }

        const { data, error } = await query

        if (error) throw error

        res.json(data || [])
    } catch (error) {
        console.error("Failed to search users:", error)
        res.status(500).json({ error: "Failed to search users" })
    }
}

module.exports = {
    getProfileById,
    searchUsers,
}