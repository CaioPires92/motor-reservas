import { app } from "./app.js";

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  console.log(`Availability service running at http://localhost:${port}`);
});

