export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
};
