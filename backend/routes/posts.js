const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");

// Create post
router.post("/", async (req, res) => {
    const { title, content, userId } = req.body;

    if (!title || !content || !userId) {
        return res.status(400).json({
            error: "title, content and userId are required"
        });
    }

    const { data, error } = await supabase
        .from("posts")
        .insert([
            {
                title,
                content,
                user_id: userId
            }
        ])
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
});

// Get all posts
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Get single post
router.get("/:id", async (req, res) => {
    const postId = Number(req.params.id);

    const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

    if (error) {
        return res.status(404).json({ error: "Post not found" });
    }

    res.json(data);
});

// Delete post
router.delete("/:id", async (req, res) => {
    const postId = Number(req.params.id);

    const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Post deleted" });
});

module.exports = router;