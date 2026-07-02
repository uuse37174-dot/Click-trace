import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getLink, recordClick } from "./src/firebase";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. High-Performance Server-Side Redirection Route
  app.get('/t/:slug', async (req, res, next) => {
    const { slug } = req.params;
    try {
      const linkData = await getLink(slug);
      if (linkData) {
        const userAgent = req.headers['user-agent'] || '';
        const referrer = req.headers['referer'] || '';
        
        // Log the click in Firestore in the background
        recordClick(slug, referrer, userAgent).catch(err => {
          console.error(`Failed to record click for ${slug} in background:`, err);
        });

        // Ensure redirect destination is absolute
        let targetUrl = linkData.originalUrl.trim();
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }

        // Perform instant server-side redirect
        return res.redirect(302, targetUrl);
      } else {
        // Redirect to homepage with a clean error so the React app can show a beautiful "not found" UI
        return res.redirect(`/?error=not_found&slug=${slug}`);
      }
    } catch (err) {
      console.error(`Error during server-side redirect for ${slug}:`, err);
      // Fall through to standard SPA serving if an unexpected error occurs
      next();
    }
  });

  // 2. Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 3. Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
