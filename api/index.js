// server.js
const http = require("http");
const url = require("url");

// Static data
const users = [
  { id: 1, name: "John Doe", email: "john@example.com" },
  { id: 2, name: "Jane Smith", email: "jane@example.com" },
  { id: 3, name: "Mike Ross", email: "mike@example.com" }
];

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Set JSON header
  res.setHeader("Content-Type", "application/json");

  // Route: GET /users
  if (req.method === "GET" && parsedUrl.pathname === "/users") {
    res.writeHead(200);
    res.end(JSON.stringify(users));
    return;
  }

  // Route: GET /users/:id
  if (req.method === "GET" && parsedUrl.pathname.startsWith("/users/")) {
    const id = parseInt(parsedUrl.pathname.split("/")[2], 10);
    const user = users.find(u => u.id === id);

    if (user) {
      res.writeHead(200);
      res.end(JSON.stringify(user));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ message: "User not found" }));
    }
    return;
  }

  // Default for unknown routes
  res.writeHead(404);
  res.end(JSON.stringify({ message: "Route not found" }));
});

// Start server
server.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
