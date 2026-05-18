// Minimal posts frontend
import { useEffect, useState } from "react";

const API_URL = "http://localhost:3001/posts";

function PostBoard() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [userId, setUserId] = useState("");

  async function loadPosts() {
    const response = await fetch(API_URL);
    const data = await response.json();
    setPosts(data);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, content, userId }),
    });

    setTitle("");
    setContent("");
    setUserId("");
    loadPosts();
  }

  return (
    <section>
      <h2>Rideshare Posts</h2>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />

        <br /><br />

        <textarea
          placeholder="Content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />

        <br /><br />

        <input
          placeholder="User ID"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        />

        <br /><br />

        <button type="submit">Create Post</button>
      </form>

      <h3>All Posts</h3>

      {posts.map((post) => (
        <div key={post.id}>
          <hr />
          <h4>{post.title}</h4>
          <p>{post.content}</p>
          <p>User: {post.user_id}</p>
        </div>
      ))}
    </section>
  );
}

export default PostBoard;