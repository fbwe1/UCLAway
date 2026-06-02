const test = require("node:test");
const assert = require("node:assert/strict");
const supabasePath = require.resolve("../supabaseclient.js");
const authRoutesPath = require.resolve("../routes/authRoutes.js");

function createAuthRoutes(mockSupabase) {
    delete require.cache[authRoutesPath];
    require.cache[supabasePath] = {
        id: supabasePath,
        filename: supabasePath,
        loaded: true,
        exports: mockSupabase
    };
    return require("../routes/authRoutes.js");
}
async function request(router, path, body) {
    const routeLayer = router.stack.find((layer) => layer.route.path === path);
    const postLayer = routeLayer.route.stack.find((layer) => layer.method === "post");
    const req = { body };
    const res = {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        send(payload) {
            this.body = payload;
            return this;
        }
    };
    await postLayer.handle(req, res);
    return {
        status: res.statusCode,
        body: res.body
    };
}
test("signup creates an account with valid UCLA account information", async () => {
    const signUpCalls = [];
    const router = createAuthRoutes({
        auth: {
            signUp: async (payload) => {
                signUpCalls.push(payload);
                return { data: { user: { id: "user-1" } }, error: null };
            }
        }
    });
    const response = await request(router, "/signup", {
        username: "newuser",
        full_name: "New User",
        ucla_email: "newuser@g.ucla.edu",
        password: "Password123!"
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        status: true,
        message: "User Was Created Successfully"
    });
    assert.equal(signUpCalls.length, 1);
    assert.equal(signUpCalls[0].email, "newuser@g.ucla.edu");
    assert.equal(signUpCalls[0].password, "Password123!");
    assert.deepEqual(signUpCalls[0].options.data, {
        first_name: "New User",
        username: "newuser"
    });
});
test("signup rejects non-UCLA email addresses before creating an account", async () => {
    let signUpWasCalled = false;
    const router = createAuthRoutes({
        auth: {
            signUp: async () => {
                signUpWasCalled = true;
                return { data: null, error: null };
            }
        }
    });
    const response = await request(router, "/signup", {
        username: "newuser",
        ucla_email: "newuser@example.com",
        password: "Password123!"
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
        status: false,
        message: "Please use a valid UCLA email address"
    });
    assert.equal(signUpWasCalled, false);
});
test("signup rejects passwords that are not complex enough before creating an account", async () => {
    let signUpWasCalled = false;
    const router = createAuthRoutes({
        auth: {
            signUp: async () => {
                signUpWasCalled = true;
                return { data: null, error: null };
            }
        }
    });
    const response = await request(router, "/signup", {
        username: "newuser",
        ucla_email: "newuser@ucla.edu",
        password: "password123"
    });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
        status: false,
        message: "You need to make a more complex password"
    });
    assert.equal(signUpWasCalled, false);
});
test("signup returns an error when Supabase rejects account creation", async () => {
    const router = createAuthRoutes({
        auth: {
            signUp: async () => ({
                data: null,
                error: new Error("already exists")
            })
        }
    });
    const response = await request(router, "/signup", {
        username: "existinguser",
        ucla_email: "existinguser@ucla.edu",
        password: "Password123!"
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        status: false,
        message: "already exists"
    });
});
test("login grants access with correct UCLA email and password", async () => {
    const signInCalls = [];
    const router = createAuthRoutes({
        auth: {
            signInWithPassword: async (payload) => {
                signInCalls.push(payload);
                return { data: { session: { access_token: "token" } }, error: null };
            }
        }
    });
    const response = await request(router, "/login", {
        ucla_email: "newuser@ucla.edu",
        password: "password123"
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        success: true
    });
    assert.deepEqual(signInCalls[0], {
        email: "newuser@ucla.edu",
        password: "password123"
    });
});
test("login returns an error when credentials are incorrect", async () => {
    const router = createAuthRoutes({
        auth: {
            signInWithPassword: async () => ({
                data: null,
                error: new Error("invalid credentials")
            })
        }
    });

    const response = await request(router, "/login", {
        ucla_email: "newuser@ucla.edu",
        password: "wrong-password"
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        status: false,
        message: "User Not Found"
    });
});
// forgot password
test("forgot password sends the reset email request", async () => {
    const resetCalls = [];
    const router = createAuthRoutes({
        auth: {
            resetPasswordForEmail: async (email, options) => {
                resetCalls.push({ email, options });
                return { data: {}, error: null };
            }
        }
    });
    const response = await request(router, "/forgot-password", {
        ucla_email: "newuser@ucla.edu"
    });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        status: true,
        message: "If your account exists, check your email inbox."
    });
    assert.deepEqual(resetCalls[0], {
        email: "newuser@ucla.edu",
        options: {
            redirectTo: "http://localhost:5173/reset-password"
        }
    });
});
